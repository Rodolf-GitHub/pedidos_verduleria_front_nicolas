<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Trash2,
  Search,
  Eye,
  ShoppingCart,
  CheckCircle,
  RotateCcw,
  Calendar,
  Store,
  User,
  AlertTriangle,
} from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import BaseButton from '@/components/BaseButton.vue'
import BasePagination from '@/components/BasePagination.vue'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'
import {
  pedidoApiListarMisPedidos,
  pedidoApiCrearPedido,
  pedidoApiEliminarPedido,
  pedidoApiCambiarEstadoPedido,
  pedidoApiCambiarFechaPedido,
} from '@/apps/pedidos/api'
import { pedidoDiarioApiObtenerPedidoDiarioPorPedido } from '@/apps/pedidos_diarios/api'
import type {
  PedidoSimpleSchema,
  PedidoCreateSchema,
  PedidoActualizarFechaSchema,
} from '@/apps/pedidos/api/schemas'
import { negocioApiListarNegocios } from '@/apps/negocios/api'

const LIMIT = 10

const router = useRouter()

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

const pedidos = ref<PedidoSimpleSchema[]>([])
const negocios = ref<any[]>([])
const totalCount = ref(0)
const offset = ref(0)
const busqueda = ref('')
const negocioFiltro = ref<number | null>(null)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedPedido = ref<PedidoSimpleSchema | null>(null)
const isSaving = ref(false)
const isUpdatingEstado = ref(false)

const formData = ref({
  negocio_id: '',
})
const fechaEditar = ref('')

const getItemsFromResponse = (data: any) => {
  return data?.items ?? data?.results ?? data?.data?.items ?? data?.data?.results ?? []
}

const getCountFromResponse = (data: any) => {
  return data?.count ?? data?.data?.count ?? 0
}

const loadPedidos = async () => {
  try {
    const params = {
      limit: LIMIT,
      offset: offset.value,
      ...(busqueda.value.trim() ? { busqueda: busqueda.value.trim() } : {}),
    }

    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value === null ? 'null' : value.toString())
      }
    })
    const url = query.toString() ? `/api/pedidos/listar?${query.toString()}` : '/api/pedidos/listar'

    const response = await fetchWithBaseUrl(url, { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      pedidos.value = getItemsFromResponse(data)
      totalCount.value = getCountFromResponse(data)
    }
  } catch (error) {
    console.error('Error al cargar pedidos:', error)
    pedidos.value = []
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

const openCreateModal = async () => {
  modalMode.value = 'create'
  formData.value = {
    negocio_id: '',
  }
  selectedPedido.value = null
  await loadNegocios()
  showModal.value = true
}

const formatDateTimeLocal = (value?: string | Date | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const openEditModal = async (pedido: PedidoSimpleSchema) => {
  modalMode.value = 'edit'
  selectedPedido.value = pedido
  fechaEditar.value = formatDateTimeLocal(pedido.fecha_creacion)
  showModal.value = true
}

const handleSave = async () => {
  isSaving.value = true

  try {
    if (modalMode.value === 'create') {
      if (!formData.value.negocio_id) {
        return
      }
      const data: PedidoCreateSchema = {
        negocio_id: parseInt(formData.value.negocio_id),
      }

      const response = await pedidoApiCrearPedido(data, { headers: getAuthHeaders() })

      if (response.status === 200 || response.status === 201) {
        offset.value = 0
        await loadPedidos()
        showModal.value = false
      }
      return
    }

    if (!selectedPedido.value?.id || !fechaEditar.value) {
      return
    }

    const payload: PedidoActualizarFechaSchema = {
      fecha_creacion: new Date(fechaEditar.value).toISOString(),
    }
    const response = await pedidoApiCambiarFechaPedido(selectedPedido.value.id, payload, {
      headers: getAuthHeaders(),
    })
    if (response.status === 200) {
      await loadPedidos()
      showModal.value = false
    }
  } catch (error) {
    console.error('Error al guardar pedido:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCambiarEstado = async (pedido: PedidoSimpleSchema, nuevoEstado: string) => {
  if (!pedido.id) return
  isUpdatingEstado.value = true

  try {
    const response = await pedidoApiCambiarEstadoPedido(
      pedido.id,
      { estado: nuevoEstado as 'en_proceso' | 'completado' },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      await loadPedidos()
    }
  } catch (error) {
    console.error('Error al cambiar estado:', error)
  } finally {
    isUpdatingEstado.value = false
  }
}

const handleDelete = async (pedido: PedidoSimpleSchema) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este pedido?')) return

  try {
    if (pedido.id) {
      const response = await pedidoApiEliminarPedido(pedido.id, { headers: getAuthHeaders() })

      if (response.status === 200 || response.status === 204) {
        await loadPedidos()
      }
    }
  } catch (error) {
    console.error('Error al eliminar pedido:', error)
  }
}

const handleSearch = () => {
  offset.value = 0
  loadPedidos()
}

const irADetalles = (pedidoId: number) => {
  router.push({ name: 'pedido-detalles', params: { id: pedidoId } })
}

const verCompraAsociada = async (pedidoId: number) => {
  try {
    const response = await pedidoDiarioApiObtenerPedidoDiarioPorPedido(pedidoId, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200) {
      router.push({ name: 'pedido-diario-por-pedido', params: { pedidoId } })
      return
    }

    return
  } catch (error) {
    console.error('Error al validar compra asociada:', error)
    return
  }
}

const getNegocioNombre = (negocioId: number) => {
  const negocio = negocios.value.find((n) => n.id === negocioId)
  return negocio?.nombre || 'Sin negocio'
}

const getEstadoColor = (estado: string) => {
  const colors: { [key: string]: string } = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    confirmado: 'bg-blue-100 text-blue-800',
    en_preparacion: 'bg-purple-100 text-purple-800',
    listo: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-800'
}

const getCardStateClasses = (estado: string) => {
  if (estado === 'en_proceso') {
    return 'bg-yellow-50 border-yellow-200'
  }
  if (estado === 'completado') {
    return 'bg-blue-50 border-blue-200'
  }
  return 'bg-white border-[var(--bg-300)]'
}

const formattedDate = computed(() => {
  if (!selectedPedido.value?.fecha_creacion) return ''
  return new Date(selectedPedido.value.fecha_creacion).toLocaleDateString('es-AR')
})

const negociosUnicos = computed(() => {
  const negociosMap = new Map()
  pedidos.value.forEach((pedido) => {
    if (!negociosMap.has(pedido.negocio)) {
      negociosMap.set(pedido.negocio, getNegocioNombre(pedido.negocio))
    }
  })
  return Array.from(negociosMap.entries()).map(([id, nombre]) => ({ id, nombre }))
})

const pedidosFiltrados = computed(() => {
  if (!negocioFiltro.value) return pedidos.value
  return pedidos.value.filter((pedido) => pedido.negocio === negocioFiltro.value)
})

const pedidosListaVacia = computed(() => pedidosFiltrados.value.length === 0)

const toggleFiltroNegocio = (negocioId: number) => {
  negocioFiltro.value = negocioFiltro.value === negocioId ? null : negocioId
}

const obtenerDiaLabel = (fecha: string | Date | null | undefined): string => {
  if (!fecha) return 'Pedidos sin fecha'
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
    return 'Pedidos de hoy'
  } else if (fechaNormalizada.getTime() === ayerNormalizado.getTime()) {
    return 'Pedidos de ayer'
  } else if (fechaNormalizada.getTime() === antierNormalizado.getTime()) {
    return 'Pedidos de anteayer'
  } else {
    return `Pedidos del ${fechaObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
  }
}

const obtenerColorFondo = (diaLabel: string): string => {
  if (diaLabel === 'Pedidos de hoy') {
    return 'bg-blue-50'
  } else if (diaLabel === 'Pedidos de ayer') {
    return 'bg-green-50'
  } else if (diaLabel === 'Pedidos de anteayer') {
    return 'bg-orange-50'
  } else {
    return 'bg-gray-50'
  }
}

const pedidosAgrupados = computed(() => {
  const grupos: { [key: string]: PedidoSimpleSchema[] } = {}

  pedidosFiltrados.value.forEach((pedido) => {
    const diaLabel = obtenerDiaLabel(pedido.fecha_creacion)
    if (!grupos[diaLabel]) {
      grupos[diaLabel] = []
    }
    grupos[diaLabel].push(pedido)
  })

  // Ordenar los grupos: hoy, ayer, anteayer, y luego el resto por fecha descendente
  const orden = ['Pedidos de hoy', 'Pedidos de ayer', 'Pedidos de anteayer']
  const gruposOrdenados: { [key: string]: PedidoSimpleSchema[] } = {}

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

const getCantidadProductos = (pedido: PedidoSimpleSchema) => pedido.cantidad_productos ?? 0

const pendingCount = computed(() => {
  return pedidos.value.filter((p) => p.estado !== 'completado').length
})

// Cargar datos al montar
loadPedidos()
loadNegocios()
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-3xl font-bold text-[var(--text-100)]">Pedidos</h1>
      <BaseButton variant="primary" size="md" @click="openCreateModal">
        <Plus :size="18" class="mr-2" />
        Nuevo Pedido
      </BaseButton>
    </div>

    <!-- Filtros por Negocio -->
    <div
      v-if="pendingCount > 0"
      class="rounded-md border-l-4 border-yellow-400 bg-yellow-50 p-4 flex flex-col items-center text-center gap-2"
    >
      <AlertTriangle :size="22" class="text-yellow-600" />
      <div>
        <div class="text-sm font-semibold">Hay {{ pendingCount }} pedidos sin completar.</div>
        <div class="text-xs text-[var(--text-200)]">
          Recuerda completar los pedidos cuando termines para que el comprador pueda hacer la
          compra.
        </div>
      </div>
    </div>
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

    <!-- Pedidos List -->
    <div class="space-y-3">
      <div v-if="pedidosListaVacia" class="rounded-lg bg-white p-8 text-center shadow-sm">
        <p class="text-[var(--text-200)]">No hay pedidos para mostrar</p>
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="(diaLabel, index) in Object.keys(pedidosAgrupados)"
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

          <!-- Grupo de pedidos con color de fondo -->
          <div
            :class="[
              'rounded-lg p-4 space-y-3 border-l-4',
              obtenerColorFondo(diaLabel),
              diaLabel === 'Pedidos de hoy'
                ? 'border-l-blue-400'
                : diaLabel === 'Pedidos de ayer'
                  ? 'border-l-green-400'
                  : diaLabel === 'Pedidos de anteayer'
                    ? 'border-l-orange-400'
                    : 'border-l-gray-400',
            ]"
          >
            <div
              v-for="pedido in pedidosAgrupados[diaLabel]"
              :key="pedido.id || Math.random()"
              :class="[
                'flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow',
                getCardStateClasses(pedido.estado),
              ]"
            >
              <div
                v-if="pedido.estado === 'en_proceso'"
                class="-mx-3 -mt-3 rounded-t-lg bg-yellow-200 px-3 py-1 text-center text-xs font-semibold text-yellow-900"
              >
                --------- en proceso-------
              </div>
              <div
                v-if="pedido.estado === 'en_proceso'"
                class="-mx-3 -mt-1 px-3 pb-2 text-center text-xs font-semibold text-yellow-900"
              >
                {{ getCantidadProductos(pedido) }} producto(s)
              </div>
              <div
                v-else-if="pedido.estado === 'completado'"
                class="-mx-3 -mt-3 rounded-t-lg bg-blue-200 px-3 py-1 text-center text-xs font-semibold text-blue-900"
              >
                --------- completado-------
              </div>
              <div
                v-if="pedido.estado === 'completado'"
                class="-mx-3 -mt-1 px-3 pb-2 text-center text-xs font-semibold text-blue-900"
              >
                {{ getCantidadProductos(pedido) }} producto(s)
              </div>
              <!-- Info Principal -->
              <div class="flex-1 min-w-0">
                <p
                  class="flex items-center gap-2 text-sm font-medium text-[var(--text-200)] truncate"
                >
                  <Store :size="16" />
                  <span class="text-[var(--text-200)]">Negocio:</span>
                  <span class="font-semibold text-[var(--text-100)]">
                    {{ getNegocioNombre(pedido.negocio) }}
                  </span>
                </p>
                <p class="flex items-center gap-2 text-sm text-[var(--text-200)] mt-1">
                  <Calendar :size="16" />
                  <span>Fecha:</span>
                  <span class="font-semibold text-[var(--text-100)]">
                    {{
                      pedido.fecha_creacion
                        ? new Date(pedido.fecha_creacion).toLocaleDateString('es-AR')
                        : '—'
                    }}
                  </span>
                  <span class="text-[var(--text-200)]">•</span>
                  <span class="font-semibold text-[var(--text-100)]">
                    {{
                      pedido.fecha_creacion
                        ? new Date(pedido.fecha_creacion).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'
                    }}
                  </span>
                </p>
                <p class="flex items-center gap-2 text-sm text-[var(--text-200)] mt-1">
                  <User :size="16" />
                  <span>Creado por:</span>
                  <span class="font-semibold text-[var(--text-100)]">{{
                    pedido.creado_por_nombre
                  }}</span>
                </p>
                <div
                  v-if="pedido.estado !== 'en_proceso' && pedido.estado !== 'completado'"
                  class="flex items-center gap-2 mt-2"
                >
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getEstadoColor(pedido.estado),
                    ]"
                  >
                    {{ pedido.estado }}
                  </span>
                  <span class="text-xs text-[var(--text-200)]">
                    {{ getCantidadProductos(pedido) }} producto(s)
                  </span>
                </div>
              </div>

              <!-- Botones -->
              <div class="flex flex-wrap gap-3">
                <BaseButton
                  size="lg"
                  variant="primary"
                  class="gap-2"
                  title="Ver pedido"
                  @click="pedido.id ? irADetalles(pedido.id) : null"
                >
                  <Eye :size="20" />
                  Detalles
                </BaseButton>
                <BaseButton
                  size="lg"
                  variant="success"
                  class="gap-2"
                  title="Ver compra asociada"
                  @click="pedido.id ? verCompraAsociada(pedido.id) : null"
                >
                  <ShoppingCart :size="20" />
                  Ver compra
                </BaseButton>
                <BaseButton
                  size="lg"
                  variant="secondary"
                  class="gap-2"
                  @click="openEditModal(pedido)"
                >
                  <Calendar :size="20" />
                  Editar fecha
                </BaseButton>
                <BaseButton size="lg" variant="danger" class="gap-2" @click="handleDelete(pedido)">
                  <Trash2 :size="20" />
                  Eliminar
                </BaseButton>
                <div class="w-full flex justify-center">
                  <BaseButton
                    v-if="pedido.estado !== 'completado'"
                    size="lg"
                    variant="secondary"
                    class="gap-2 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500"
                    :class="getCantidadProductos(pedido) ? 'animate-pulse' : ''"
                    :loading="isUpdatingEstado"
                    :disabled="isUpdatingEstado"
                    @click="handleCambiarEstado(pedido, 'completado')"
                  >
                    <CheckCircle :size="20" />
                    {{ getCantidadProductos(pedido) ? 'Completar pedido' : 'Completar' }}
                  </BaseButton>
                  <BaseButton
                    v-if="pedido.estado === 'completado'"
                    size="lg"
                    variant="secondary"
                    class="gap-2"
                    :disabled="isUpdatingEstado"
                    @click="handleCambiarEstado(pedido, 'en_proceso')"
                  >
                    <RotateCcw :size="20" />
                    Reabrir
                  </BaseButton>
                </div>
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
      :offset="offset"
      @update:offset="
        (newOffset) => {
          offset = newOffset
          loadPedidos()
        }
      "
    />

    <!-- Create/Edit Modal -->
    <BaseModal
      :title="modalMode === 'create' ? 'Nuevo Pedido' : 'Editar Pedido'"
      :show="showModal"
      size="md"
      @close="showModal = false"
    >
      <div class="space-y-4">
        <div v-if="modalMode === 'create'">
          <label class="block text-sm font-medium text-[var(--text-100)] mb-2"> Negocio * </label>
          <select
            v-model="formData.negocio_id"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option value="">Selecciona un negocio</option>
            <option v-for="negocio in negocios" :key="negocio.id" :value="negocio.id">
              {{ negocio.nombre }}
            </option>
          </select>
        </div>

        <div v-else>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-2">
            Fecha del pedido
          </label>
          <input
            v-model="fechaEditar"
            type="datetime-local"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
          <p class="mt-2 text-xs text-[var(--text-200)]">Solo se actualiza la fecha del pedido.</p>
        </div>

        <div v-if="selectedPedido">
          <div class="rounded-lg bg-[var(--bg-100)] p-4 space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-[var(--text-200)]">Creado por:</span>
              <span class="font-medium text-[var(--text-100)]"
                >ID {{ selectedPedido.creado_por }}</span
              >
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-[var(--text-200)]">Fecha:</span>
              <span class="font-medium text-[var(--text-100)]">{{ formattedDate }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-[var(--text-200)]">Estado:</span>
              <span
                :class="[
                  'px-2 py-1 rounded text-sm font-medium',
                  getEstadoColor(selectedPedido.estado),
                ]"
              >
                {{ selectedPedido.estado }}
              </span>
            </div>
            <div class="pt-3 text-xs text-[var(--text-200)]">
              📌 Para agregar/eliminar productos, ve a la página de detalles del pedido
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="secondary" @click="showModal = false"> Cancelar </BaseButton>
          <BaseButton variant="primary" :loading="isSaving" @click="handleSave">
            {{ modalMode === 'create' ? 'Crear' : 'Actualizar fecha' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped></style>
