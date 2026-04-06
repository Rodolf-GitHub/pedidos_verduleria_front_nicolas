<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarDays, CheckCircle2, XCircle, Search, AlertTriangle } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import { API_BASE_URL } from '@/config/env'
import {
  pedidoDiarioApiObtenerPedidoDiarioPorFecha,
  pedidoDiarioApiMarcarPedidoDiario,
  pedidoDiarioApiDesmarcarPedidoDiario,
  pedidoDiarioApiCambiarEstadoPedidoDiario,
  pedidoDiarioApiObtenerPedidosDiariosSinCompletar,
} from '@/apps/pedidos_diarios/api'
import PedidosSinCompletarBanners from '../components/PedidosSinCompletarBanners.vue'
// Nota: el backend ahora actualiza el producto al confirmar la compra.
// No actualizar producto desde el frontend.
import { UNIDADES_MEDIDA_LABELS } from '@/utils/unidadesMedida'
import type {
  PedidoDiarioProductoSchema,
  PedidoDiarioSchema,
  PedidoDiarioUnidadSchema,
  PedidosSinCompletarSchema,
} from '@/apps/pedidos_diarios/api/schemas'

const pedidoDiario = ref<PedidoDiarioSchema | null>(null)
const errorPedidoDiario = ref<string | null>(null)
const loading = ref(false)
const estadoLoading = ref(false)
const estadoAction = ref<'en_proceso' | 'completado' | null>(null)
const rowLoadingKey = ref<string | null>(null)
const rowLoadingAction = ref<'comprado' | 'no_comprado' | 'desmarcar' | null>(null)
const motivoMap = ref<Record<string, string>>({})
const showCompraModal = ref(false)
const showNoCompraModal = ref(false)
const isSavingCompra = ref(false)
const GANANCIA_PRESETS = [20, 40, 60, 80, 100]
const compraModalData = ref<{
  producto: PedidoDiarioProductoSchema['producto']
  total: PedidoDiarioUnidadSchema
  cantidades_por_negocio?: PedidoDiarioProductoSchema['cantidades_por_negocio']
  rowKey: string
} | null>(null)
const compraForm = ref({
  precio_compra: '',
  ganancia_porcentaje: '',
  factor_division: '1',
})
const gananciaPreset = ref<'manual' | number>('manual')
const noCompraData = ref<{
  productoId: number
  rowKey: string
} | null>(null)
const noCompraMotivo = ref('')

// Pedidos sin completar (advertencias)
const pedidosSinCompletar = ref<PedidosSinCompletarSchema[]>([])
const loadingSinCompletar = ref(false)
const pedidoSectionRef = ref<HTMLElement | null>(null)

const relativeDayLabel = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00`)
  const today = new Date()
  // normalize to midnight
  const md = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const fd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((md.getTime() - fd.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff === 2) return 'antier'
  return fd.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const loadPedidosSinCompletar = async () => {
  loadingSinCompletar.value = true
  try {
    const response = await pedidoDiarioApiObtenerPedidosDiariosSinCompletar({
      headers: getAuthHeaders(),
    })
    if (response.status === 200) {
      pedidosSinCompletar.value = response.data || []
    }
  } catch (error) {
    console.error('Error al cargar pedidos sin completar:', error)
  } finally {
    loadingSinCompletar.value = false
  }
}

const openPedidoFromBanner = async (fecha: string) => {
  selectedDate.value = fecha
  try {
    await loadPedidoDiario()
    // Scroll to the pedido section if present
    if (pedidoSectionRef.value) {
      pedidoSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } catch (e) {
    // ignore
  }
}

const selectedDate = ref(getTodayLocal())
const busquedaProducto = ref('')

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

const estadoLabel = computed(() => {
  if (!pedidoDiario.value?.estado) return 'Sin estado'
  return pedidoDiario.value.estado === 'en_proceso' ? 'En proceso' : 'Completado'
})

const estadoBadgeClass = computed(() => {
  if (!pedidoDiario.value?.estado) return 'bg-gray-100 text-gray-700'
  return pedidoDiario.value.estado === 'en_proceso'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-indigo-100 text-indigo-700'
})

const isPedidoCompletado = computed(() => pedidoDiario.value?.estado === 'completado')

const formattedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const normalizedBusqueda = computed(() => busquedaProducto.value.trim().toLowerCase())

const itemsFiltrados = computed(() => {
  const items = pedidoDiario.value?.items || []
  if (!normalizedBusqueda.value) return items
  return items.filter((item) =>
    item.producto?.nombre?.toLowerCase().includes(normalizedBusqueda.value),
  )
})

const totalProductos = computed(() => itemsFiltrados.value.length)

const faltantesPorMarcar = computed(
  () => itemsFiltrados.value.filter((item) => !item.total?.estado_compra).length,
)

const allMarcados = computed(() => totalProductos.value > 0 && faltantesPorMarcar.value === 0)

const itemsMarcados = computed(() =>
  itemsFiltrados.value.filter((item) => item.total?.estado_compra),
)

const itemsFaltantes = computed(() =>
  itemsFiltrados.value.filter((item) => !item.total?.estado_compra),
)

const isRowLoading = (key: string) => rowLoadingKey.value === key
const isRowActionLoading = (key: string, action: 'comprado' | 'no_comprado' | 'desmarcar') =>
  rowLoadingKey.value === key && rowLoadingAction.value === action

const buildRowKey = (productoId: number | null | undefined) => `${productoId ?? 'producto'}`

const loadPedidoDiario = async () => {
  if (!selectedDate.value) return
  loading.value = true
  errorPedidoDiario.value = null

  try {
    const response = await pedidoDiarioApiObtenerPedidoDiarioPorFecha(
      { fecha: selectedDate.value },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      pedidoDiario.value = response.data
    } else {
      errorPedidoDiario.value = `Error: ${response.status}`
      pedidoDiario.value = null
    }
  } catch (error) {
    console.error('Error al cargar pedido diario:', error)
    errorPedidoDiario.value = 'Error al cargar pedido diario. Verifica tu conexión o autenticación.'
    pedidoDiario.value = null
  } finally {
    // Also refresh list of pending (sin completar) pedidos
    try {
      await loadPedidosSinCompletar()
    } catch (e) {
      // ignore
    }
    loading.value = false
  }
}

const handleCambiarEstado = async (estado: 'en_proceso' | 'completado') => {
  if (!selectedDate.value) return
  estadoLoading.value = true
  estadoAction.value = estado

  try {
    const response = await pedidoDiarioApiCambiarEstadoPedidoDiario(
      { estado },
      { fecha: selectedDate.value },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      await loadPedidoDiario()
    }
  } catch (error) {
    console.error('Error al cambiar estado del pedido diario:', error)
  } finally {
    estadoLoading.value = false
    estadoAction.value = null
  }
}

const handleMarcar = async (
  productoId: number | null | undefined,
  estadoCompra: 'comprado' | 'no_comprado',
  key: string,
) => {
  if (isPedidoCompletado.value) return
  if (!selectedDate.value || !productoId) return
  rowLoadingKey.value = key
  rowLoadingAction.value = estadoCompra

  try {
    const response = await pedidoDiarioApiMarcarPedidoDiario(
      {
        producto_id: productoId,

        estado_compra: estadoCompra,
        motivo_no_compra: estadoCompra === 'no_comprado' ? motivoMap.value[key] || null : null,
        precio_compra: null,
        factor_division: null,
        ganancia_aplicada: null,
      },
      { fecha: selectedDate.value },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      await loadPedidoDiario()
    }
  } catch (error) {
    console.error('Error al marcar compra:', error)
  } finally {
    rowLoadingKey.value = null
    rowLoadingAction.value = null
  }
}

const handleDesmarcar = async (
  productoId: number | null | undefined,
  estadoCompra: 'comprado' | 'no_comprado',
  key: string,
) => {
  if (isPedidoCompletado.value) return
  if (!selectedDate.value || !productoId) return
  rowLoadingKey.value = key
  rowLoadingAction.value = 'desmarcar'

  try {
    const response = await pedidoDiarioApiDesmarcarPedidoDiario(
      {
        producto_id: productoId,

        estado_compra: estadoCompra,
        motivo_no_compra: null,
      },
      { fecha: selectedDate.value },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      await loadPedidoDiario()
    }
  } catch (error) {
    console.error('Error al desmarcar compra:', error)
  } finally {
    rowLoadingKey.value = null
    rowLoadingAction.value = null
  }
}

const getEstadoCompraLabel = (estado: string | null | undefined) => {
  if (estado === 'comprado') return 'Comprado'
  if (estado === 'no_comprado') return 'No comprado'
  return 'Sin marcar'
}

const getEstadoCompraClass = (estado: string | null | undefined) => {
  if (estado === 'comprado') return 'bg-emerald-100 text-emerald-700'
  if (estado === 'no_comprado') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const formatCurrency = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '—'
  return currencyFormatter.format(numeric)
}

const formatPercent = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '—'
  return `${numeric}%`
}

const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath
  return `${API_BASE_URL}${imagePath}`
}

const getUnidadLabel = (unidad: string | null | undefined) => {
  if (!unidad) return 'kg'
  const labels = UNIDADES_MEDIDA_LABELS as Record<string, string>
  return labels[unidad] ?? unidad
}

const agruparCantidadesPorUnidad = (item: PedidoDiarioProductoSchema) => {
  const totales = new Map<string, number>()
  const lista = item.cantidades_por_negocio || []
  const fallbackUnidad = item.producto?.se_pide_en_unidad_medida || 'unidad'

  for (const entry of lista) {
    const unidad = entry.unidad_medida || fallbackUnidad
    const cantidad = Number(entry.cantidad) || 0
    totales.set(unidad, (totales.get(unidad) || 0) + cantidad)
  }

  return Array.from(totales.entries()).map(([unidad, cantidad]) => ({ unidad, cantidad }))
}

const getTotalesLabel = (item: PedidoDiarioProductoSchema) => {
  const arr = agruparCantidadesPorUnidad(item)
  if (!arr.length) return '—'
  return arr.map((t) => `${t.cantidad} ${getUnidadLabel(t.unidad)}`).join(' · ')
}

const compraUnidad = computed(
  () => compraModalData.value?.producto.se_pide_en_unidad_medida ?? null,
)
const compraTotalesPorUnidad = computed(() => {
  const data = compraModalData.value
  if (!data) return []
  return agruparCantidadesPorUnidad({
    producto: data.producto,
    total: data.total,
    cantidades_por_negocio: data.cantidades_por_negocio,
  } as PedidoDiarioProductoSchema)
})
const compraCantidad = computed(() => compraTotalesPorUnidad.value)
const compraCantidadLabel = computed(() => {
  if (!compraTotalesPorUnidad.value.length) return '—'
  return compraTotalesPorUnidad.value
    .map((t) => `${t.cantidad} ${getUnidadLabel(t.unidad)}`)
    .join(' · ')
})
const compraUnidadLabel = computed(() =>
  getUnidadLabel(
    compraModalData.value?.producto.se_pide_en_unidad_medida ??
      compraModalData.value?.producto?.se_vende_en_unidad_medida,
  ),
)
const compraFactorLabel = computed(() => {
  const totalUnidad = compraModalData.value?.producto?.se_pide_en_unidad_medida
  const productoUnidad = compraModalData.value?.producto?.se_vende_en_unidad_medida
  const totalLabel = getUnidadLabel(totalUnidad)
  const productoLabel = getUnidadLabel(productoUnidad)

  if (!totalUnidad || !productoUnidad) return `Cantidad por ${totalLabel}`

  if (productoUnidad === 'kg' || productoLabel.toLowerCase().includes('kil')) {
    return `¿Cuántos kg tiene la ${totalLabel.toLowerCase()}?`
  }

  return `¿Cuántas ${productoLabel.toLowerCase()} tiene la ${totalLabel.toLowerCase()}?`
})

const openCompraModal = (item: PedidoDiarioProductoSchema, total: PedidoDiarioUnidadSchema) => {
  if (!item.producto.id) return
  const rowKey = buildRowKey(item.producto.id)
  const gananciaBase = total.ganancia_aplicada ?? item.producto.ganancia_porcentaje ?? null
  const gananciaActual = gananciaBase === null || gananciaBase === '' ? null : Number(gananciaBase)
  gananciaPreset.value =
    gananciaActual !== null &&
    !Number.isNaN(gananciaActual) &&
    GANANCIA_PRESETS.includes(gananciaActual)
      ? gananciaActual
      : 'manual'
  compraModalData.value = {
    producto: item.producto,
    total,
    cantidades_por_negocio: item.cantidades_por_negocio,
    rowKey,
  }
  // Only prefill precio_compra if the total's unidad_medida matches the product's sell unit.
  const unidadTotal = item.producto.se_pide_en_unidad_medida
  const unidadProducto = item.producto.se_vende_en_unidad_medida
  let precioPrefill = ''
  if (
    unidadTotal &&
    unidadProducto &&
    unidadTotal === unidadProducto &&
    item.producto.precio_compra
  ) {
    precioPrefill = String(item.producto.precio_compra)
  }

  // Precargar inputs del modal
  compraForm.value = {
    precio_compra:
      total.precio_compra != null && item.producto.precio_compra != null
        ? String(total.precio_compra)
        : item.producto.precio_compra != null && item.producto.precio_compra !== ''
          ? String(item.producto.precio_compra)
          : '',
    ganancia_porcentaje:
      gananciaPreset.value === 'manual' && gananciaBase !== null && gananciaBase !== ''
        ? String(gananciaBase)
        : gananciaPreset.value === 'manual'
          ? ''
          : String(gananciaPreset.value),
    factor_division:
      total.factor_division != null && item.producto.factor_division != null
        ? String(total.factor_division)
        : item.producto.factor_division != null && item.producto.factor_division !== ''
          ? String(item.producto.factor_division)
          : '1',
  }
  showCompraModal.value = true
}

const closeCompraModal = () => {
  showCompraModal.value = false
  compraModalData.value = null
  compraForm.value = {
    precio_compra: '',
    ganancia_porcentaje: '',
    factor_division: '1',
  }
  gananciaPreset.value = 'manual'
}

const handleGananciaPresetChange = () => {
  if (gananciaPreset.value === 'manual') {
    compraForm.value.ganancia_porcentaje = ''
    return
  }
  compraForm.value.ganancia_porcentaje = String(gananciaPreset.value)
}

const handleConfirmarCompra = async () => {
  const modalData = compraModalData.value
  if (!modalData?.producto.id || !selectedDate.value) return
  const precioCompra = Number(compraForm.value.precio_compra)

  if (!precioCompra || Number.isNaN(precioCompra) || precioCompra <= 0) {
    return
  }

  const ganancia = compraForm.value.ganancia_porcentaje
    ? Number(compraForm.value.ganancia_porcentaje)
    : null

  isSavingCompra.value = true

  try {
    const factorDivision =
      compraForm.value.factor_division !== ''
        ? Number(compraForm.value.factor_division)
        : (modalData.total.factor_division ?? null)
    const gananciaAplicada =
      ganancia !== null && !Number.isNaN(ganancia)
        ? ganancia
        : (modalData.total.ganancia_aplicada ?? null)

    await pedidoDiarioApiMarcarPedidoDiario(
      {
        producto_id: modalData.producto.id,
        estado_compra: 'comprado',
        motivo_no_compra: null,
        precio_compra: precioCompra,
        factor_division: factorDivision,
        ganancia_aplicada: gananciaAplicada,
      },
      { fecha: selectedDate.value },
      { headers: getAuthHeaders() },
    )

    await loadPedidoDiario()
    closeCompraModal()
  } catch (error) {
    console.error('Error al confirmar compra:', error)
  } finally {
    isSavingCompra.value = false
  }
}

const openNoCompraModal = (productoId: number | null | undefined, key: string) => {
  if (!productoId) return
  noCompraData.value = {
    productoId,
    rowKey: key,
  }
  noCompraMotivo.value = motivoMap.value[key] || ''
  showNoCompraModal.value = true
}

const closeNoCompraModal = () => {
  showNoCompraModal.value = false
  noCompraData.value = null
  noCompraMotivo.value = ''
}

const applyNoCompraMotivo = (motivo: string) => {
  noCompraMotivo.value = motivo
}

const handleConfirmarNoCompra = async () => {
  const data = noCompraData.value
  if (!data) return
  motivoMap.value[data.rowKey] = noCompraMotivo.value
  await handleMarcar(data.productoId, 'no_comprado', data.rowKey)
  closeNoCompraModal()
}

function getTodayLocal() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateWithOffset(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const setDateOffset = (offsetDays: number) => {
  selectedDate.value = getDateWithOffset(offsetDays)
  loadPedidoDiario()
}

const isSelectedToday = computed(() => selectedDate.value === getDateWithOffset(0))
const isSelectedAyer = computed(() => selectedDate.value === getDateWithOffset(-1))
const isSelectedAntier = computed(() => selectedDate.value === getDateWithOffset(-2))

loadPedidoDiario()

watch(selectedDate, () => {
  loadPedidoDiario()
})
</script>

<template>
  <div class="relative space-y-6">
    <div
      class="pointer-events-none absolute -top-12 right-6 h-36 w-36 rounded-full bg-[var(--primary-100)]/20 blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -top-6 left-10 h-28 w-28 rounded-full bg-[var(--accent-100)]/20 blur-3xl"
    ></div>

    <PedidosSinCompletarBanners :items="pedidosSinCompletar" @open="openPedidoFromBanner" />

    <div class="rounded-2xl border border-[var(--bg-300)] bg-white/95 p-5 shadow-lg">
      <div class="mb-4 flex items-center gap-3">
        <div class="rounded-xl bg-[var(--primary-100)]/10 p-2 text-[var(--primary-100)]">
          <CalendarDays :size="22" />
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-[var(--text-100)]">Pedidos diarios</h1>
          <p class="text-sm text-[var(--text-200)]">Control por fecha y estado</p>
        </div>
      </div>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label class="block text-sm font-medium text-[var(--text-100)] mb-1">Fecha</label>
          <div class="relative">
            <CalendarDays class="absolute left-3 top-2.5 h-5 w-5 text-[var(--text-200)]" />
            <input
              v-model="selectedDate"
              type="date"
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-10 pr-3 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <BaseButton
              variant="secondary"
              size="sm"
              @click="setDateOffset(0)"
              :class="
                isSelectedToday ? 'ring-2 ring-[var(--primary-100)] bg-[var(--primary-100)]/10' : ''
              "
            >
              Hoy
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="sm"
              @click="setDateOffset(-1)"
              :class="
                isSelectedAyer ? 'ring-2 ring-[var(--primary-100)] bg-[var(--primary-100)]/10' : ''
              "
            >
              Ayer
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="sm"
              @click="setDateOffset(-2)"
              :class="
                isSelectedAntier
                  ? 'ring-2 ring-[var(--primary-100)] bg-[var(--primary-100)]/10'
                  : ''
              "
            >
              Antier
            </BaseButton>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              Productos: {{ totalProductos }}
            </span>
            <span class="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
              Faltantes: {{ faltantesPorMarcar }}
            </span>
          </div>
        </div>
        <BaseButton
          variant="primary"
          size="md"
          class="shadow-md"
          @click="loadPedidoDiario"
          :loading="loading"
        >
          Buscar
        </BaseButton>
      </div>

      <div class="mt-4 flex flex-col items-center gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)]">
            Estado
          </span>
          <span :class="['px-3 py-1 rounded-full text-xs font-semibold', estadoBadgeClass]">
            {{ estadoLabel }}
          </span>
          <span class="text-xs text-[var(--text-200)]">{{ formattedDateLabel }}</span>
        </div>

        <div v-if="allMarcados && pedidoDiario?.estado !== 'completado'" class="w-full">
          <p class="text-center text-sm font-semibold text-emerald-700">
            Todos los productos marcados
          </p>
          <div class="mt-2 flex justify-center">
            <BaseButton
              variant="danger"
              size="lg"
              class="animate-pulse gap-2"
              :loading="estadoLoading && estadoAction === 'completado'"
              :disabled="estadoLoading"
              @click="handleCambiarEstado('completado')"
            >
              <CheckCircle2 :size="18" />
              Completar compra
            </BaseButton>
          </div>
        </div>

        <div class="flex flex-wrap justify-center gap-3">
          <BaseButton
            v-if="pedidoDiario?.estado === 'completado'"
            variant="secondary"
            size="md"
            class="gap-2"
            :loading="estadoLoading && estadoAction === 'en_proceso'"
            :disabled="estadoLoading"
            @click="handleCambiarEstado('en_proceso')"
          >
            <XCircle :size="18" />
            Reabrir
          </BaseButton>
          <BaseButton
            v-else
            variant="secondary"
            size="md"
            class="gap-2"
            :loading="estadoLoading && estadoAction === 'en_proceso'"
            :disabled="pedidoDiario?.estado === 'en_proceso' || estadoLoading"
            @click="handleCambiarEstado('en_proceso')"
          >
            <CalendarDays :size="18" />
            En proceso
          </BaseButton>
          <BaseButton
            v-if="pedidoDiario?.estado !== 'completado' && !allMarcados"
            variant="success"
            size="md"
            class="gap-2"
            :loading="estadoLoading && estadoAction === 'completado'"
            :disabled="estadoLoading"
            @click="handleCambiarEstado('completado')"
          >
            <CheckCircle2 :size="18" />
            Completar
          </BaseButton>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-[var(--bg-300)] bg-white/95 p-5 shadow-lg">
      <label class="block text-sm font-medium text-[var(--text-100)] mb-1"> Buscar producto </label>
      <div class="relative">
        <Search class="absolute left-3 top-2.5 h-5 w-5 text-[var(--text-200)]" />
        <input
          v-model="busquedaProducto"
          type="text"
          placeholder="Ej: Tomate, Papa, Manzana"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-10 pr-3 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
        />
      </div>
    </div>

    <div v-if="loading" class="rounded-lg border border-[var(--bg-300)] bg-white p-8 text-center">
      <div
        class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-100)] border-r-transparent"
      ></div>
      <p class="mt-3 text-sm text-[var(--text-200)]">Cargando pedido diario...</p>
    </div>

    <div
      v-else-if="errorPedidoDiario"
      class="rounded-lg border border-[var(--bg-300)] bg-white p-8 text-center"
    >
      <p class="text-sm text-red-600 font-semibold">
        {{ errorPedidoDiario }}
      </p>
    </div>

    <div
      v-else-if="!pedidoDiario || (pedidoDiario.items || []).length === 0"
      class="rounded-lg border border-[var(--bg-300)] bg-white p-8 text-center"
    >
      <p class="text-sm text-[var(--text-200)]">
        No hay productos para esta fecha. Selecciona otra fecha para continuar.
      </p>
    </div>

    <div v-else class="space-y-6" ref="pedidoSectionRef">
      <div v-if="itemsMarcados.length > 0" class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="flex-1 border-t border-emerald-200"></div>
          <span class="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Marcados
          </span>
          <div class="flex-1 border-t border-emerald-200"></div>
        </div>
        <div class="space-y-4">
          <div
            v-for="item in itemsMarcados"
            :key="`${item.producto.id || item.producto.nombre}-marcados`"
            class="rounded-2xl border border-[var(--bg-300)] bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 shadow-sm"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--bg-300)] bg-white"
                >
                  <img
                    v-if="getImageUrl(item.producto.imagen)"
                    :src="getImageUrl(item.producto.imagen) || ''"
                    :alt="item.producto.nombre"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-xs text-[var(--text-200)]"
                  >
                    Sin
                  </div>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-[var(--text-100)]">
                    {{ item.producto.nombre }}
                  </h3>
                  <p class="text-xs text-[var(--text-200)]">
                    Se vende en: {{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }}
                  </p>
                  <p class="text-xs text-[var(--text-200)]">
                    Se compra en: {{ getUnidadLabel(item.producto.se_pide_en_unidad_medida) }}
                  </p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                >
                  Compra:
                  {{ formatCurrency(item.total?.precio_compra ?? item.producto.precio_compra) }}
                  ({{ getUnidadLabel(item.producto.se_pide_en_unidad_medida) }}) /
                  {{ formatCurrency(item.producto.precio_compra_unitario) }}
                  ({{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }})
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                >
                  Ganancia: {{ item.producto.ganancia_porcentaje }}%
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-900 shadow-sm"
                >
                  Venta: {{ formatCurrency(item.producto.precio_venta) }} (por
                  {{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }})
                </span>
              </div>
            </div>

            <div
              class="mt-3 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 shadow-sm"
            >
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-sm font-semibold text-[var(--text-100)]">Pedido total</p>
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    getEstadoCompraClass(item.total?.estado_compra),
                  ]"
                >
                  {{ getEstadoCompraLabel(item.total?.estado_compra) }}
                </span>
              </div>

              <div v-if="(item.cantidades_por_negocio || []).length" class="space-y-1">
                <div
                  v-for="neg in item.cantidades_por_negocio || []"
                  :key="`${item.producto.id}-${neg.negocio_id}`"
                  class="flex items-center gap-2 rounded-lg bg-white px-3 py-1 text-sm text-[var(--text-200)] shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]"
                >
                  <span class="font-bold text-black">{{ neg.negocio_nombre }}</span>
                  <span class="text-black font-semibold">quiere</span>
                  <span class="font-bold text-blue-700">
                    {{ neg.cantidad }}
                    {{
                      getUnidadLabel(neg.unidad_medida || item.producto.se_pide_en_unidad_medida)
                    }}
                  </span>
                </div>
              </div>

              <div
                v-if="agruparCantidadesPorUnidad(item).length"
                class="flex flex-wrap items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-[var(--text-200)]"
              >
                <span class="font-bold uppercase tracking-wide text-red-700">Totales:</span>
                <span
                  v-for="sub in agruparCantidadesPorUnidad(item)"
                  :key="`${item.producto.id}-${sub.unidad || 'unidad'}`"
                  class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-red-800 font-bold text-sm"
                >
                  {{ sub.cantidad }} {{ getUnidadLabel(sub.unidad) }}
                </span>
              </div>

              <p
                v-if="
                  item.total?.estado_compra === 'no_comprado' &&
                  motivoMap[buildRowKey(item.producto.id)]
                "
                class="text-xs text-[var(--text-200)]"
              >
                Motivo: {{ motivoMap[buildRowKey(item.producto.id)] }}
              </p>

              <div class="flex items-center justify-center gap-2 mt-2">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  class="px-4"
                  :loading="isRowActionLoading(buildRowKey(item.producto.id), 'desmarcar')"
                  :disabled="isPedidoCompletado || isRowLoading(buildRowKey(item.producto.id))"
                  @click="
                    handleDesmarcar(
                      item.producto.id,
                      item.total?.estado_compra as 'comprado' | 'no_comprado',
                      buildRowKey(item.producto.id),
                    )
                  "
                >
                  Quitar marca
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="itemsFaltantes.length > 0" class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="flex-1 border-t border-rose-200"></div>
          <span class="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Faltantes
          </span>
          <div class="flex-1 border-t border-rose-200"></div>
        </div>
        <div class="space-y-4">
          <div
            v-for="item in itemsFaltantes"
            :key="`${item.producto.id || item.producto.nombre}-faltantes`"
            class="rounded-2xl border border-[var(--bg-300)] bg-gradient-to-br from-white via-white to-rose-50/40 p-4 shadow-sm"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--bg-300)] bg-white"
                >
                  <img
                    v-if="getImageUrl(item.producto.imagen)"
                    :src="getImageUrl(item.producto.imagen) || ''"
                    :alt="item.producto.nombre"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-xs text-[var(--text-200)]"
                  >
                    Sin
                  </div>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-[var(--text-100)]">
                    {{ item.producto.nombre }}
                  </h3>
                  <p class="text-xs text-[var(--text-200)]">
                    Se vende en:
                    {{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }}
                  </p>
                  <p class="text-xs text-[var(--text-200)]">
                    Se compra en:
                    {{ getUnidadLabel(item.producto.se_pide_en_unidad_medida) }}
                  </p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                >
                  Compra:
                  {{ formatCurrency(item.total?.precio_compra ?? item.producto.precio_compra) }}
                  ({{ getUnidadLabel(item.producto.se_pide_en_unidad_medida) }}) /
                  {{ formatCurrency(item.producto.precio_compra_unitario) }}
                  ({{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }})
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                >
                  Ganancia: {{ item.producto.ganancia_porcentaje }}%
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-900 shadow-sm"
                >
                  Venta: {{ formatCurrency(item.producto.precio_venta) }} (por
                  {{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }})
                </span>
              </div>
            </div>

            <div
              class="mt-3 space-y-2 rounded-xl border border-[var(--bg-300)] bg-white/90 p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-sm font-semibold text-[var(--text-100)]">Pedido total</p>
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    getEstadoCompraClass(item.total?.estado_compra),
                  ]"
                >
                  {{ getEstadoCompraLabel(item.total?.estado_compra) }}
                </span>
              </div>

              <div v-if="(item.cantidades_por_negocio || []).length" class="space-y-1">
                <div
                  v-for="neg in item.cantidades_por_negocio || []"
                  :key="`${item.producto.id}-${neg.negocio_id}`"
                  class="flex items-center gap-2 rounded-lg bg-white px-3 py-1 text-sm text-[var(--text-200)] shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]"
                >
                  <span class="font-bold text-black">{{ neg.negocio_nombre }}</span>
                  <span class="text-black font-semibold">quiere</span>
                  <span class="font-bold text-blue-700">
                    {{ neg.cantidad }}
                    {{
                      getUnidadLabel(neg.unidad_medida || item.producto.se_pide_en_unidad_medida)
                    }}
                  </span>
                </div>
              </div>

              <div
                v-if="agruparCantidadesPorUnidad(item).length"
                class="flex flex-wrap items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-[var(--text-200)]"
              >
                <span class="font-bold uppercase tracking-wide text-red-700">Totales:</span>
                <span
                  v-for="sub in agruparCantidadesPorUnidad(item)"
                  :key="`${item.producto.id}-${sub.unidad || 'unidad'}`"
                  class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-red-800 font-bold text-sm"
                >
                  {{ sub.cantidad }} {{ getUnidadLabel(sub.unidad) }}
                </span>
              </div>

              <div class="flex items-center justify-center gap-3 mt-3">
                <BaseButton
                  variant="success"
                  size="sm"
                  class="px-4"
                  :disabled="
                    isPedidoCompletado || isRowLoading(buildRowKey(item.producto.id)) || !item.total
                  "
                  @click="item.total && openCompraModal(item, item.total)"
                >
                  <CheckCircle2 :size="14" class="mr-1" />
                  Comprado
                </BaseButton>
                <BaseButton
                  variant="danger"
                  size="sm"
                  class="px-4"
                  :loading="isRowActionLoading(buildRowKey(item.producto.id), 'no_comprado')"
                  :disabled="isPedidoCompletado || isRowLoading(buildRowKey(item.producto.id))"
                  @click="openNoCompraModal(item.producto.id, buildRowKey(item.producto.id))"
                >
                  <XCircle :size="14" class="mr-1" />
                  No comprado
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <BaseModal :show="showCompraModal" title="Confirmar compra" size="lg" @close="closeCompraModal">
    <div class="space-y-4">
      <div>
        <p class="text-lg font-semibold text-[var(--text-100)] text-center">
          {{ compraModalData?.producto.nombre }}
        </p>
        <p class="text-sm text-[var(--text-200)] text-center">
          {{ compraUnidad }} · Cantidad {{ compraCantidadLabel }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Precio de compra (por
            {{ getUnidadLabel(compraModalData?.producto?.se_pide_en_unidad_medida) }})
            <span class="text-red-500">*</span>
          </label>
          <input
            v-model="compraForm.precio_compra"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Ganancia (%)
          </label>
          <select
            v-model="gananciaPreset"
            @change="handleGananciaPresetChange"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option value="manual">Manual</option>
            <option v-for="preset in GANANCIA_PRESETS" :key="preset" :value="preset">
              {{ preset }}%
            </option>
          </select>
          <input
            v-if="gananciaPreset === 'manual'"
            v-model="compraForm.ganancia_porcentaje"
            type="number"
            placeholder="0"
            class="mt-2 w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>
      </div>

      <div class="mt-3">
        <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
          {{ compraFactorLabel }}
        </label>
        <input
          v-model="compraForm.factor_division"
          type="number"
          step="0.01"
          placeholder="1"
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
        />
      </div>

      <div class="rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-4 py-3">
        <p class="text-sm text-[var(--text-200)]">Precio actual</p>
        <div class="mt-2 flex flex-wrap gap-3 text-sm font-medium text-[var(--text-100)]">
          <span>
            Compra:
            {{
              formatCurrency(compraForm.precio_compra || compraModalData?.producto.precio_compra)
            }}
            <span v-if="compraForm.precio_compra || compraModalData?.producto.precio_compra">
              (por {{ getUnidadLabel(compraModalData?.producto?.se_pide_en_unidad_medida) }})
            </span>
          </span>
          <span
            >Ganancia:
            {{
              compraForm.ganancia_porcentaje || compraModalData?.producto.ganancia_porcentaje
                ? formatPercent(
                    compraForm.ganancia_porcentaje || compraModalData?.producto.ganancia_porcentaje,
                  )
                : '—'
            }}</span
          >
          <span
            >Factor:
            {{
              compraForm.factor_division !== ''
                ? compraForm.factor_division
                : (compraModalData?.total.factor_division ?? '—')
            }}</span
          >
          <span>Venta: {{ formatCurrency(compraModalData?.producto.precio_venta) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" size="md" @click="closeCompraModal"> Cancelar </BaseButton>
      <BaseButton
        variant="primary"
        size="md"
        :loading="isSavingCompra"
        :disabled="isSavingCompra"
        @click="handleConfirmarCompra"
      >
        Aceptar
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :show="showNoCompraModal"
    title="Motivo de no compra"
    size="md"
    @close="closeNoCompraModal"
  >
    <div class="space-y-4">
      <p class="text-sm text-[var(--text-200)]">
        Selecciona un motivo o escribe uno personalizado.
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          @click="applyNoCompraMotivo('No habia en el mercado')"
        >
          No habia en el mercado
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          @click="applyNoCompraMotivo('Precio demasiado elevado')"
        >
          Precio demasiado elevado
        </BaseButton>
        <BaseButton variant="secondary" size="sm" @click="applyNoCompraMotivo('Mala calidad')">
          Mala calidad
        </BaseButton>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-[var(--text-200)]"> Motivo </label>
        <input
          v-model="noCompraMotivo"
          type="text"
          placeholder="Escribe el motivo..."
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
        />
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" size="md" @click="closeNoCompraModal"> Cancelar </BaseButton>
      <BaseButton variant="primary" size="md" @click="handleConfirmarNoCompra">
        Aceptar
      </BaseButton>
    </template>
  </BaseModal>
</template>
