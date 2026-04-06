<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Search } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import { pedidoDiarioApiObtenerPedidoDiarioPorPedido } from '@/apps/pedidos_diarios/api'
import type { PedidoDiarioSchema } from '@/apps/pedidos_diarios/api/schemas'
import { API_BASE_URL } from '@/config/env'
import { UNIDADES_MEDIDA_LABELS } from '@/utils/unidadesMedida'

const route = useRoute()
const router = useRouter()

const pedidoDiario = ref<PedidoDiarioSchema | null>(null)
const loading = ref(false)
const filtroVista = ref<'todos' | 'cambiaron_precio'>('todos')
const busquedaProducto = ref('')

const pedidoId = computed(() => Number(route.params.pedidoId))

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

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

const getCantidadPedidoNegocio = (item: any) => {
  const lista = item?.cantidades_por_negocio || []
  if (!lista.length) return null
  const fallbackUnidad = item?.producto?.se_pide_en_unidad_medida || null
  const total = lista.reduce((sum: number, entry: any) => sum + (Number(entry?.cantidad) || 0), 0)
  const unidad = lista[0]?.unidad_medida || fallbackUnidad
  if (!unidad) return null
  return { cantidad: total, unidad }
}

const getCantidadPedidoNegocioLabel = (item: any) => {
  const data = getCantidadPedidoNegocio(item)
  if (!data) return null
  return `${data.cantidad} ${getUnidadLabel(data.unidad)}`
}

const getPrecioCompraUnitario = (item: any) => {
  const total = item?.total
  if (!total || total.precio_compra == null) return null
  const factor = Number(total.factor_division)
  const baseUnitario = Number(total.precio_compra) / (factor || 1)
  if (Number.isNaN(baseUnitario)) return null
  if (!factor && item?.producto?.precio_compra_unitario != null) {
    const fallback = Number(item.producto.precio_compra_unitario)
    return Number.isNaN(fallback) ? null : fallback
  }
  return baseUnitario
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

const isActualizadoRecientemente = (producto: { actualizado_recientemente?: boolean | null }) =>
  producto.actualizado_recientemente === true

const normalizedBusqueda = computed(() => busquedaProducto.value.trim().toLowerCase())

const itemsFiltrados = computed(() => {
  const items = pedidoDiario.value?.items || []
  const filtradosPorCambio =
    filtroVista.value === 'todos'
      ? items
      : items.filter((item) => isActualizadoRecientemente(item.producto as any))

  if (!normalizedBusqueda.value) return filtradosPorCambio
  return filtradosPorCambio.filter((item) =>
    item.producto?.nombre?.toLowerCase().includes(normalizedBusqueda.value),
  )
})

const emptyStateMessage = computed(() => {
  if (normalizedBusqueda.value) return 'No se encontraron productos con esa búsqueda.'
  if (filtroVista.value === 'cambiaron_precio') {
    return 'No hay productos con cambio de precio en este pedido.'
  }
  return 'No hay productos para mostrar.'
})

const loadPedidoDiario = async () => {
  if (!pedidoId.value || Number.isNaN(pedidoId.value)) return
  loading.value = true

  try {
    const response = await pedidoDiarioApiObtenerPedidoDiarioPorPedido(pedidoId.value, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200) {
      pedidoDiario.value = response.data
    }
  } catch (error) {
    console.error('Error al cargar pedido diario por pedido:', error)
    pedidoDiario.value = null
  } finally {
    loading.value = false
  }
}

const volver = () => {
  router.push({ name: 'pedidos' })
}

onMounted(() => {
  loadPedidoDiario()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <BaseButton variant="secondary" size="sm" @click="volver">
          <ArrowLeft :size="16" class="mr-1" />
          Volver
        </BaseButton>
        <div>
          <h1 class="text-3xl font-bold text-[var(--text-100)]">Compra asociada</h1>
          <p class="text-sm text-[var(--text-200)]">Pedido #{{ pedidoId }}</p>
        </div>
      </div>
      <div class="w-full sm:w-auto rounded-xl border border-[var(--bg-300)] bg-white p-1 shadow-sm">
        <div class="grid grid-cols-2 gap-1">
          <button
            type="button"
            :class="[
              'rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
              filtroVista === 'todos'
                ? 'bg-[var(--primary-100)] text-white shadow-sm'
                : 'bg-transparent text-[var(--text-200)] hover:bg-[var(--bg-200)]',
            ]"
            @click="filtroVista = 'todos'"
          >
            Ver todos
          </button>
          <button
            type="button"
            :class="[
              'rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
              filtroVista === 'cambiaron_precio'
                ? 'bg-[var(--primary-100)] text-white shadow-sm'
                : 'bg-transparent text-[var(--text-200)] hover:bg-[var(--bg-200)]',
            ]"
            @click="filtroVista = 'cambiaron_precio'"
          >
            Cambio precio
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-3 shadow-sm">
      <label class="mb-1 block text-sm font-medium text-[var(--text-100)]">Buscar producto</label>
      <div class="relative">
        <Search class="absolute left-3 top-2.5 h-5 w-5 text-[var(--text-200)]" />
        <input
          v-model="busquedaProducto"
          type="text"
          placeholder="Ej: Papa, Tomate, Manzana"
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
      v-else-if="!pedidoDiario || (pedidoDiario.items || []).length === 0"
      class="rounded-lg border border-[var(--bg-300)] bg-white p-8 text-center"
    >
      <p class="text-sm text-[var(--text-200)]">No hay datos para este pedido.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-if="itemsFiltrados.length === 0"
        class="rounded-lg border border-[var(--bg-300)] bg-white p-8 text-center"
      >
        <p class="text-sm text-[var(--text-200)]">{{ emptyStateMessage }}</p>
      </div>

      <div
        v-for="item in itemsFiltrados"
        :key="item.producto.id || item.producto.nombre"
        :class="[
          'group rounded-lg border p-4 shadow-sm transition-all hover:shadow-md',
          'bg-blue-50/50 border-blue-100 hover:border-blue-200',
          isActualizadoRecientemente(item.producto as any) ? 'producto-card-updated' : '',
        ]"
      >
        <div
          v-if="isActualizadoRecientemente(item.producto as any)"
          class="-mx-4 -mt-4 rounded-t-lg bg-blue-200 px-4 py-1 text-center text-xs font-semibold text-blue-900"
        >
          --------- actualizado recientemente-------
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--bg-300)] bg-gradient-to-br from-[var(--bg-200)] to-[var(--bg-100)]"
              >
                <img
                  v-if="getImageUrl(item.producto.imagen)"
                  :src="getImageUrl(item.producto.imagen) || ''"
                  :alt="item.producto.nombre"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-[var(--text-200)]"
                >
                  Sin
                </div>
              </div>
              <div class="min-w-0">
                <h3 class="font-semibold text-[var(--text-100)] line-clamp-1">
                  {{ item.producto.nombre }}
                </h3>
                <p
                  v-if="item.producto.se_vende_en_unidad_medida"
                  class="text-xs text-[var(--text-200)]"
                >
                  Se vende en: {{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }}
                </p>
                <p
                  v-if="item.producto.se_pide_en_unidad_medida"
                  class="text-xs text-[var(--text-200)]"
                >
                  Se compra en: {{ getUnidadLabel(item.producto.se_pide_en_unidad_medida) }}
                </p>
              </div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <!-- Aquí puedes agregar botones de acción si lo deseas -->
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="item.producto.precio_venta != null"
              class="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-900 shadow-sm"
            >
              Venta: {{ formatCurrency(item.producto.precio_venta) }}
            </span>
            <span
              v-if="getCantidadPedidoNegocioLabel(item)"
              class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700"
            >
              Cantidad pedida: {{ getCantidadPedidoNegocioLabel(item) }}
            </span>
            <span
              v-if="item.total && item.total.precio_compra != null"
              class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 shadow-sm"
            >
              Compra:
              {{ formatCurrency(item.total.precio_compra) }}
              <template v-if="item.producto.se_pide_en_unidad_medida">
                ({{ getUnidadLabel(item.producto.se_pide_en_unidad_medida) }})
              </template>
              <template v-if="getPrecioCompraUnitario(item) !== null">
                /
                {{ formatCurrency(getPrecioCompraUnitario(item) as number) }}
                <template v-if="item.producto.se_vende_en_unidad_medida">
                  ({{ getUnidadLabel(item.producto.se_vende_en_unidad_medida) }})
                </template>
              </template>
            </span>
            <span
              v-if="item.total && item.total.ganancia_aplicada != null"
              class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
            >
              Ganancia: {{ item.total.ganancia_aplicada }}%
            </span>
            <span
              v-if="item.total && item.total.estado_compra"
              :class="[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                getEstadoCompraClass(item.total.estado_compra),
              ]"
            >
              {{ getEstadoCompraLabel(item.total.estado_compra) }}
            </span>
          </div>
          <p
            v-if="
              item.total &&
              item.total.estado_compra === 'no_comprado' &&
              item.total.motivo_no_compra
            "
            class="mt-2 text-xs text-[var(--text-200)]"
          >
            Motivo: {{ item.total.motivo_no_compra }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.producto-card-updated {
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(224, 242, 254, 0.95));
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.25),
    0 10px 20px -14px rgba(37, 99, 235, 0.6);
}
</style>
