<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Search, Eye, Package } from 'lucide-vue-next'
import { useNotification } from '@/composables/useNotification'
import BaseButton from '@/components/BaseButton.vue'
import BasePagination from '@/components/BasePagination.vue'
import {
  compraApiListarCompras,
  compraApiCrearCompra,
  compraApiCambiarEstadoCompra,
  compraApiEliminarCompra,
} from '@/apps/compras/api'
import type { CompraSchema, CompraCreateSchema } from '@/apps/compras/api/schemas'
import { negocioApiListarNegocios } from '@/apps/negocios/api'
import { pedidoApiListarPedidosCompletadosSinCompra } from '@/apps/pedidos/api'

const LIMIT = 10

const router = useRouter()
const { error: showError, success: showSuccess } = useNotification()

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

const compras = ref<CompraSchema[]>([])
const negocios = ref<any[]>([])
const pedidos = ref<any[]>([])
const totalCount = ref(0)
const offset = ref(0)
const busqueda = ref('')
const negocioFiltro = ref<number | null>(null)

const isSaving = ref(false)
const isUpdatingEstado = ref(false)
const isDeletingCompra = ref(false)

const getItemsFromResponse = (data: any) => {
  return data?.items ?? data?.results ?? data?.data?.items ?? data?.data?.results ?? []
}

const getCountFromResponse = (data: any) => {
  return data?.count ?? data?.data?.count ?? 0
}

const loadCompras = async () => {
  try {
    const params = {
      limit: LIMIT,
      offset: offset.value,
    }

    const response = await compraApiListarCompras(params, { headers: getAuthHeaders() })

    if (response.status === 200) {
      const newCompras = getItemsFromResponse(response.data)
      console.log('loadCompras - new data:', newCompras)
      compras.value = newCompras
      totalCount.value = getCountFromResponse(response.data)
      console.log('loadCompras - compras.value updated:', compras.value)
    }
  } catch (error) {
    console.error('Error al cargar compras:', error)
    compras.value = []
  }
}

const loadNegocios = async () => {
  try {
    const response = await negocioApiListarNegocios(
      {
        limit: 100,
        offset: 0,
      },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      negocios.value = getItemsFromResponse(response.data)
    }
  } catch (error) {
    console.error('Error al cargar negocios:', error)
    negocios.value = []
  }
}

const loadPedidos = async () => {
  try {
    const response = await pedidoApiListarPedidosCompletadosSinCompra(
      { limit: 100, offset: 0 },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200 || response.status === 201) {
      pedidos.value = getItemsFromResponse(response.data)
      console.log('loadPedidos - pedidos cargados:', pedidos.value)
    } else {
      pedidos.value = []
    }
  } catch (error) {
    console.error('Error al cargar pedidos:', error)
    pedidos.value = []
  }
}

const crearCompraDesdeListaPedidos = async (pedidoId: number) => {
  try {
    const data: CompraCreateSchema = {
      en_respuesta_a_pedido_id: pedidoId,
    }
    const response = await compraApiCrearCompra(data, { headers: getAuthHeaders() })

    if (response.status === 200 || response.status === 201) {
      await loadCompras()
      await loadPedidos()
      showSuccess('Compra creada correctamente')
    }
  } catch (error) {
    console.error('Error al crear compra:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error al crear la compra'
    showError(errorMessage)
  }
}

const irAPedido = (pedidoId: number) => {
  router.push({ name: 'pedido-detalles', params: { id: pedidoId } })
}

const handleCambiarEstado = async (compra: CompraSchema, nuevoEstado: string) => {
  if (!compra.id) {
    showError('Compra inválida')
    return
  }
  isUpdatingEstado.value = true

  try {
    const payload = { estado: nuevoEstado }
    console.log('About to call compraApiCambiarEstadoCompra with:', compra.id, payload)
    const response = await compraApiCambiarEstadoCompra(
      compra.id,
      { estado: nuevoEstado as 'en_proceso' | 'completado' },
      {
        headers: getAuthHeaders(),
      },
    )

    console.log('Response received:', response)

    if (response.status === 200) {
      console.log('Status 200, loading compras and showing success')
      await loadCompras()
      showSuccess('Estado actualizado correctamente')
    } else if (response.status === 400) {
      // Backend returned validation error
      const errorDetail = (response.data as any)?.detail || 'Error al cambiar el estado'
      console.log('Status 400, showing error:', errorDetail)
      showError(errorDetail)
    } else {
      console.log('Status not 200 or 400:', response.status)
      showError('Error al cambiar el estado')
    }
  } catch (error) {
    console.error('Error caught in handleCambiarEstado:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error al cambiar el estado'
    console.log('Showing error notification:', errorMessage)
    showError(errorMessage)
  } finally {
    isUpdatingEstado.value = false
  }
}

const handleEliminarCompra = async (compra: CompraSchema) => {
  if (!compra.id) return
  if (!confirm('¿Estás seguro de que deseas eliminar esta compra?')) return

  isDeletingCompra.value = true
  try {
    const response = await compraApiEliminarCompra(compra.id, { headers: getAuthHeaders() })

    if (response.status === 200 || response.status === 204) {
      await loadCompras()
      showSuccess('Compra eliminada correctamente')
    }
  } catch (error) {
    console.error('Error al eliminar compra:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la compra'
    showError(errorMessage)
  } finally {
    isDeletingCompra.value = false
  }
}

const handleSearch = () => {
  offset.value = 0
  loadCompras()
}

const irADetalles = (compraId: number) => {
  router.push({ name: 'compra-detalles', params: { id: compraId } })
}

const getNegocioNombre = (negocioId: number) => {
  const negocio = negocios.value.find((n) => n.id === negocioId)
  return negocio?.nombre || 'Sin negocio'
}

const getPedidoInfo = (pedidoId: number) => {
  const pedido = pedidos.value.find((p) => p.id === pedidoId)
  return pedido ? `Pedido #${pedido.id}` : `Pedido #${pedidoId}`
}

const formatPedidoDate = (fecha: string | undefined) => {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-AR')
}

const getPedidoLabel = (pedido: any) => {
  const negocioNombre = getNegocioNombre(pedido.negocio)
  const fecha = formatPedidoDate(pedido.fecha_creacion)
  return `${negocioNombre}-${fecha}`
}

const getEstadoColor = (estado: string) => {
  const colors: { [key: string]: string } = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    confirmado: 'bg-blue-100 text-blue-800',
    en_preparacion: 'bg-purple-100 text-purple-800',
    completado: 'bg-indigo-100 text-indigo-800',
    cancelado: 'bg-red-100 text-red-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-800'
}

const negociosUnicos = computed(() => {
  const negociosMap = new Map()
  compras.value.forEach((compra) => {
    if (!negociosMap.has(compra.negocio)) {
      negociosMap.set(compra.negocio, getNegocioNombre(compra.negocio))
    }
  })
  return Array.from(negociosMap.entries()).map(([id, nombre]) => ({ id, nombre }))
})

const comprasFiltradas = computed(() => {
  if (!negocioFiltro.value) return compras.value
  return compras.value.filter((compra) => compra.negocio === negocioFiltro.value)
})

const comprasListaVacia = computed(() => comprasFiltradas.value.length === 0)

const toggleFiltroNegocio = (negocioId: number) => {
  negocioFiltro.value = negocioFiltro.value === negocioId ? null : negocioId
}

const obtenerDiaLabel = (fecha: string | Date): string => {
  const fechaObj = new Date(fecha)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  const antier = new Date(hoy)
  antier.setDate(hoy.getDate() - 2)

  // Normalizar a medianoche para comparar solo fechas
  const normalizarFecha = (d: Date) => {
    const temp = new Date(d)
    temp.setHours(0, 0, 0, 0)
    return temp
  }

  const fechaNormalizada = normalizarFecha(fechaObj)
  const hoyNormalizado = normalizarFecha(hoy)
  const ayerNormalizado = normalizarFecha(ayer)
  const antierNormalizado = normalizarFecha(antier)

  if (fechaNormalizada.getTime() === hoyNormalizado.getTime()) {
    return 'Compras de hoy'
  } else if (fechaNormalizada.getTime() === ayerNormalizado.getTime()) {
    return 'Compras de ayer'
  } else if (fechaNormalizada.getTime() === antierNormalizado.getTime()) {
    return 'Compras de anteayer'
  } else {
    return `Compras del ${fechaObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
  }
}

const obtenerColorFondo = (diaLabel: string): string => {
  if (diaLabel === 'Compras de hoy') {
    return 'bg-blue-50'
  } else if (diaLabel === 'Compras de ayer') {
    return 'bg-indigo-50'
  } else if (diaLabel === 'Compras de anteayer') {
    return 'bg-orange-50'
  } else {
    return 'bg-gray-50'
  }
}

const comprasAgrupadas = computed(() => {
  const grupos: { [key: string]: CompraSchema[] } = {}

  comprasFiltradas.value.forEach((compra) => {
    const diaLabel = obtenerDiaLabel(compra.fecha_creacion)
    if (!grupos[diaLabel]) {
      grupos[diaLabel] = []
    }
    grupos[diaLabel].push(compra)
  })

  // Ordenar los grupos: hoy, ayer, anteayer, y luego el resto por fecha descendente
  const orden = ['Compras de hoy', 'Compras de ayer', 'Compras de anteayer']
  const gruposOrdenados: { [key: string]: CompraSchema[] } = {}

  orden.forEach((label) => {
    if (grupos[label]) {
      gruposOrdenados[label] = grupos[label]
    }
  })

  // Agregar el resto ordenado por fecha descendente
  const resto = Object.keys(grupos)
    .filter((label) => !orden.includes(label))
    .sort((a, b) => {
      // Extraer fecha del label y ordenar descendentemente
      const grupoA = grupos[a]
      const grupoB = grupos[b]

      if (!grupoA || !grupoB || grupoA.length === 0 || grupoB.length === 0) return 0

      const fechaA = grupoA[0]?.fecha_creacion
      const fechaB = grupoB[0]?.fecha_creacion

      if (!fechaA || !fechaB) return 0

      return new Date(fechaB).getTime() - new Date(fechaA).getTime()
    })

  resto.forEach((label) => {
    const grupo = grupos[label]
    if (grupo) {
      gruposOrdenados[label] = grupo
    }
  })

  return gruposOrdenados
})

// Cargar datos al montar
loadCompras()
loadNegocios()
loadPedidos()
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-3xl font-bold text-[var(--text-100)]">Compras</h1>
    </div>

    <!-- Pedidos Pendientes de Compra -->
    <div
      v-if="pedidos.length > 0"
      class="rounded-lg border border-[var(--bg-300)] bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm p-4"
    >
      <h2 class="text-lg font-semibold text-[var(--text-100)] mb-4">
        📦 Pedidos pendientes de compra
      </h2>
      <div class="space-y-3">
        <div
          v-for="pedido in pedidos"
          :key="pedido.id"
          class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-white border border-[var(--bg-300)] p-3 shadow-sm hover:shadow-md transition-shadow"
        >
          <!-- Info del Pedido -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--text-200)]">
              {{ getNegocioNombre(pedido.negocio) }}
            </p>
            <p class="text-base font-semibold text-[var(--text-100)] mt-1">
              Pedido #{{ pedido.id }}
            </p>
            <p class="text-xs text-[var(--text-200)] mt-1">
              {{ new Date(pedido.fecha_creacion).toLocaleDateString('es-AR') }}
              <span v-if="pedido.productos" class="ml-2"
                >• {{ pedido.productos.length }} producto(s)</span
              >
            </p>
          </div>

          <!-- Botones -->
          <div class="flex flex-wrap gap-2">
            <button
              @click="irAPedido(pedido.id)"
              class="rounded-lg bg-blue-100 px-3 py-2 text-blue-600 hover:bg-blue-200 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Eye :size="16" />
              Ver Pedido
            </button>
            <button
              @click="crearCompraDesdeListaPedidos(pedido.id)"
              class="rounded-lg bg-indigo-100 px-3 py-2 text-indigo-600 hover:bg-indigo-200 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus :size="16" />
              Crear Compra
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-[var(--bg-300)] bg-gradient-to-br from-gray-50 to-gray-100 p-4"
    >
      <p class="text-sm text-[var(--text-200)]">✅ No hay pedidos pendientes de compra</p>
    </div>

    <!-- Search Bar -->
    <div class="flex gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-3 h-5 w-5 text-[var(--text-200)]" />
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por negocio o pedido..."
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-10 pr-4 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          @keyup.enter="handleSearch"
        />
      </div>
      <BaseButton variant="primary" size="md" @click="handleSearch"> Buscar </BaseButton>
    </div>

    <!-- Filtros por Negocio -->
    <div v-if="negociosUnicos.length > 0" class="space-y-2">
      <h2 class="text-sm font-semibold text-[var(--text-200)] uppercase tracking-wide">
        Filtrar por negocio
      </h2>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="negocio in negociosUnicos"
          :key="negocio.id"
          @click="toggleFiltroNegocio(negocio.id)"
          :class="[
            'px-4 py-2 rounded-lg font-medium text-sm transition-all',
            negocioFiltro === negocio.id
              ? 'bg-[var(--primary-100)] text-white shadow-md'
              : 'bg-white text-[var(--text-100)] border border-[var(--bg-300)] hover:border-[var(--primary-100)] hover:shadow-sm',
          ]"
        >
          {{ negocio.nombre }}
        </button>
      </div>
    </div>

    <!-- Compras List -->
    <div class="space-y-3">
      <div v-if="comprasListaVacia" class="rounded-lg bg-white p-8 text-center shadow-sm">
        <Package :size="48" class="mx-auto mb-3 text-[var(--text-200)]" />
        <p class="text-[var(--text-200)]">No hay compras para mostrar</p>
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="(diaLabel, index) in Object.keys(comprasAgrupadas)"
          :key="index"
          class="space-y-3"
        >
          <!-- Separador con label -->
          <div class="flex items-center gap-3 my-6">
            <div class="flex-1 border-t-2 border-[var(--bg-300)]"></div>
            <p class="text-sm font-semibold text-[var(--text-100)] whitespace-nowrap px-3">
              {{ diaLabel }}
            </p>
            <div class="flex-1 border-t-2 border-[var(--bg-300)]"></div>
          </div>

          <!-- Grupo de compras con color de fondo -->
          <div
            :class="[
              'rounded-lg p-4 space-y-3 border-l-4',
              obtenerColorFondo(diaLabel),
              diaLabel === 'Compras de hoy'
                ? 'border-l-blue-400'
                : diaLabel === 'Compras de ayer'
                  ? 'border-l-indigo-400'
                  : diaLabel === 'Compras de anteayer'
                    ? 'border-l-orange-400'
                    : 'border-l-gray-400',
            ]"
          >
            <div
              v-for="compra in comprasAgrupadas[diaLabel]"
              :key="compra.id || Math.random()"
              class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-[var(--bg-300)] bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <!-- Info Principal -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-[var(--text-200)] truncate">
                  {{ getNegocioNombre(compra.negocio) }}
                </p>
                <p class="text-lg font-semibold text-[var(--text-100)] mt-1">
                  {{ new Date(compra.fecha_creacion).toLocaleDateString('es-AR') }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getEstadoColor(compra.estado),
                    ]"
                  >
                    {{ compra.estado }}
                  </span>
                  <span class="text-xs text-[var(--text-200)]">
                    {{ getPedidoInfo(compra.en_respuesta_a_pedido) }}
                  </span>
                  <span v-if="compra.productos" class="text-xs text-[var(--text-200)]">
                    • {{ compra.productos.length }} producto(s)
                  </span>
                </div>
              </div>

              <!-- Botones -->
              <div class="flex flex-wrap gap-2">
                <button
                  @click="irADetalles(compra.id!)"
                  class="rounded-lg bg-purple-100 p-2 text-purple-600 hover:bg-purple-200 transition-colors"
                  title="Ver detalles"
                >
                  <Eye :size="16" />
                </button>
                <button
                  v-if="compra.estado !== 'completado'"
                  @click="handleCambiarEstado(compra, 'completado')"
                  class="rounded-lg bg-indigo-100 px-2 py-1 text-indigo-700 hover:bg-indigo-200 transition-colors text-xs font-medium"
                >
                  Completar
                </button>
                <button
                  v-if="compra.estado === 'completado'"
                  @click="handleCambiarEstado(compra, 'en_proceso')"
                  class="rounded-lg bg-yellow-100 px-2 py-1 text-yellow-700 hover:bg-yellow-200 transition-colors text-xs font-medium"
                >
                  Reabrir
                </button>
                <button
                  @click="handleEliminarCompra(compra)"
                  class="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200 transition-colors"
                  title="Eliminar compra"
                  :disabled="isDeletingCompra"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <BasePagination
      :total="totalCount"
      :limit="LIMIT"
      v-model:offset="offset"
      @update:offset="loadCompras"
    />
  </div>
</template>

<style scoped></style>
