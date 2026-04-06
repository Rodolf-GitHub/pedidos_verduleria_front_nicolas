<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Apple, Trash2, Search, Plus, Edit, Download } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useNotification } from '@/composables/useNotification'
import { API_BASE_URL } from '@/config/env'
import { UNIDADES_MEDIDA_VALUES } from '@/utils/unidadesMedida'
import {
  pedidoApiObtenerPedido,
  pedidoApiAgregarProductoAPedido,
  pedidoApiEliminarProductoDePedido,
  pedidoApiActualizarProductoEnPedido,
} from '@/apps/pedidos/api'
import type {
  PedidoSchema,
  AgregarProductoPedidoSchema,
  EliminarProductoPedidoSchema,
  ActualizarProductoPedidoSchema,
  PedidoProductoSchema,
} from '@/apps/pedidos/api/schemas'
import { negocioApiListarNegocios } from '@/apps/negocios/api'
import { productoApiListarProductos } from '@/apps/productos/api'
import type { ProductoSchema } from '@/apps/productos/api/schemas'

const router = useRouter()
const route = useRoute()
const { success: showSuccess, error: showError } = useNotification()

const pedido = ref<PedidoSchema | null>(null)
const negocioNombre = ref('')
const loading = ref(true)
const error = ref('')
const productosCatalogo = ref<ProductoSchema[]>([])
const busquedaProductos = ref('')
const showAgregarModal = ref(false)
const productoSeleccionado = ref<ProductoSchema | null>(null)
const addProductoForm = ref({
  producto_id: '',
  cantidad: '1',
  unidad_medida: '',
})
const isAddingProducto = ref(false)
const isDeletingProducto = ref(false)
const showEditarModal = ref(false)
const productoEditando = ref<PedidoProductoSchema | null>(null)
const editarProductoForm = ref({
  cantidad: '1',
  unidad_medida: '',
})
const isEditingProducto = ref(false)

const UNIDADES_MEDIDA = UNIDADES_MEDIDA_VALUES

const unidadRecomendada = computed(() => {
  const prod = productoSeleccionado.value
  if (!prod) return 'kg'
  return prod.se_pide_en_unidad_medida || prod.se_vende_en_unidad_medida || 'kg'
})

const productosFiltrados = computed(() => {
  if (!busquedaProductos.value.trim()) return productosCatalogo.value
  return productosCatalogo.value.filter((p) =>
    p.nombre?.toLowerCase().includes(busquedaProductos.value.toLowerCase()),
  )
})

const modalStep = computed(() => {
  return productoSeleccionado.value ? 2 : 1
})

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

const getItemsFromResponse = (data: any) => {
  return data?.items ?? data?.results ?? data?.data?.items ?? data?.data?.results ?? []
}

const getEstadoColor = (estado: string) => {
  const colors: { [key: string]: string } = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    confirmado: 'bg-blue-100 text-blue-800',
    en_preparacion: 'bg-purple-100 text-purple-800',
    listo: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
    completado: 'bg-green-100 text-green-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-800'
}

const formattedDate = computed(() => {
  if (!pedido.value?.fecha_creacion) return ''
  return new Date(pedido.value.fecha_creacion).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const totalProductos = computed(() => {
  return pedido.value?.productos?.length || 0
})

const calcularTotalProductos = computed(() => {
  if (!pedido.value?.productos) return 0
  return pedido.value.productos.reduce((sum, p) => sum + parseFloat(p.cantidad || '0'), 0)
})

const cargarPedido = async () => {
  const pedidoId = route.params.id as string
  loading.value = true
  error.value = ''

  try {
    const response = await pedidoApiObtenerPedido(pedidoId as unknown as number, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200) {
      const pedidoData = response.data as PedidoSchema
      pedido.value = pedidoData

      // Obtener nombre del negocio
      if (pedido.value && pedido.value.negocio) {
        const negociosResponse = await negocioApiListarNegocios(
          { limit: 1000, offset: 0 },
          { headers: getAuthHeaders() },
        )

        if (negociosResponse.status === 200) {
          const negocios = getItemsFromResponse(negociosResponse.data)
          const negocio = negocios.find((n: any) => n.id === pedido.value?.negocio)
          negocioNombre.value = negocio?.nombre || 'Sin negocio'
        }
      }

      // Cargar productos disponibles
      await loadProductos()
    }
  } catch (err) {
    console.error('Error al cargar pedido:', err)
    error.value = 'No se pudo cargar el pedido'
  } finally {
    loading.value = false
  }
}

const loadProductos = async () => {
  try {
    const response = await productoApiListarProductos(
      {
        limit: 200,
        offset: 0,
      },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      productosCatalogo.value = getItemsFromResponse(response.data)
    }
  } catch (error) {
    console.error('Error al cargar productos:', error)
    productosCatalogo.value = []
  }
}

const handleProductoChange = () => {
  // Ya no se selecciona unidad, solo cantidad
}

const seleccionarProducto = (producto: ProductoSchema) => {
  productoSeleccionado.value = producto
  addProductoForm.value.producto_id = producto.id?.toString() || ''
  addProductoForm.value.unidad_medida =
    producto.se_pide_en_unidad_medida || producto.se_vende_en_unidad_medida || 'kg'
}

const volverAListaProductos = () => {
  productoSeleccionado.value = null
}

const abrirModalAgregarProducto = () => {
  addProductoForm.value = {
    producto_id: '',
    cantidad: '1',
    unidad_medida: '',
  }
  productoSeleccionado.value = null
  busquedaProductos.value = ''
  showAgregarModal.value = true
}

const cerrarModal = () => {
  showAgregarModal.value = false
  productoSeleccionado.value = null
  addProductoForm.value = {
    producto_id: '',
    cantidad: '1',
    unidad_medida: '',
  }
  busquedaProductos.value = ''
}

const handleAgregarProducto = async () => {
  if (!pedido.value?.id || !addProductoForm.value.producto_id) return

  isAddingProducto.value = true
  try {
    const unidadSeleccionada = (addProductoForm.value.unidad_medida ||
      unidadRecomendada.value ||
      'kg') as AgregarProductoPedidoSchema['unidad_medida']

    const payload: AgregarProductoPedidoSchema = {
      producto_id: parseInt(addProductoForm.value.producto_id),
      cantidad: parseFloat(addProductoForm.value.cantidad),
      unidad_medida: unidadSeleccionada,
    }

    const response = await pedidoApiAgregarProductoAPedido(pedido.value.id, payload, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200 || response.status === 201) {
      cerrarModal()
      await cargarPedido()
    }
  } catch (error) {
    console.error('Error al agregar producto:', error)
  } finally {
    isAddingProducto.value = false
  }
}

const handleEliminarProducto = async (productoId: number) => {
  if (!pedido.value?.id) return
  if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return

  isDeletingProducto.value = true
  try {
    const payload: EliminarProductoPedidoSchema = {
      producto_id: productoId,
    }

    const response = await pedidoApiEliminarProductoDePedido(pedido.value.id, payload, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200 || response.status === 204) {
      await cargarPedido()
    }
  } catch (error) {
    console.error('Error al eliminar producto:', error)
  } finally {
    isDeletingProducto.value = false
  }
}

const abrirEditarModal = (producto: PedidoProductoSchema) => {
  productoEditando.value = producto
  editarProductoForm.value = {
    cantidad: producto.cantidad || '1',
    unidad_medida:
      producto.unidad_medida ||
      producto.producto?.se_pide_en_unidad_medida ||
      producto.producto?.se_vende_en_unidad_medida ||
      'kg',
  }
  showEditarModal.value = true
}

const cerrarEditarModal = () => {
  showEditarModal.value = false
  productoEditando.value = null
  editarProductoForm.value = {
    cantidad: '1',
    unidad_medida: '',
  }
}

const handleActualizarProducto = async () => {
  if (!pedido.value?.id || !productoEditando.value?.producto?.id) return

  isEditingProducto.value = true
  try {
    const unidadSeleccionada = (editarProductoForm.value.unidad_medida ||
      productoEditando.value?.unidad_medida ||
      productoEditando.value?.producto?.se_pide_en_unidad_medida ||
      productoEditando.value?.producto?.se_vende_en_unidad_medida ||
      'kg') as ActualizarProductoPedidoSchema['unidad_medida']

    const payload: ActualizarProductoPedidoSchema = {
      producto_id: productoEditando.value.producto.id,
      cantidad: parseFloat(editarProductoForm.value.cantidad),
      unidad_medida: unidadSeleccionada,
    }

    const response = await pedidoApiActualizarProductoEnPedido(pedido.value.id, payload, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200) {
      cerrarEditarModal()
      await cargarPedido()
    }
  } catch (error) {
    console.error('Error al actualizar producto:', error)
  } finally {
    isEditingProducto.value = false
  }
}

const volver = () => {
  router.back()
}

const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath
  return `${API_BASE_URL}${imagePath}`
}

const exportarComoTexto = async () => {
  try {
    let texto = `DETALLES DEL PEDIDO\n`
    texto += `${'='.repeat(50)}\n\n`

    texto += `Negocio: ${negocioNombre.value}\n`
    texto += `Fecha: ${formattedDate.value}\n`
    texto += `\n`

    texto += `PRODUCTOS (${totalProductos.value})\n`
    texto += `${'-'.repeat(50)}\n`

    if (pedido.value?.productos && pedido.value.productos.length > 0) {
      for (const producto of pedido.value.productos) {
        const unidad = producto.unidad_medida || producto.producto?.se_pide_en_unidad_medida || 'kg'
        const cantidad = Number.isFinite(parseFloat(producto.cantidad))
          ? parseFloat(producto.cantidad)
          : 0
        texto += `• ${cantidad} ${unidad} de ${producto.producto?.nombre}\n`
      }
    }

    texto += `\n${'='.repeat(50)}\n`

    // Copiar al clipboard
    await navigator.clipboard.writeText(texto)
    showSuccess('Pedido copiado al portapapeles')
  } catch (error) {
    console.error('Error al copiar:', error)
    showError('Error al copiar. Por favor intenta de nuevo.')
  }
}

const exportarComoImagen = async () => {
  try {
    // Crear HTML personalizado con toda la información
    let htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 10px; background: white; color: #333; font-size: 14px; font-weight: bold; }
    h1 { font-size: 16px; margin-bottom: 5px; text-align: center; font-weight: bold; }
    .info-section { margin: 2px 0; padding: 3px; border: 1px solid #ddd; }
    .info-row { margin: 1px 0; font-size: 13px; font-weight: bold; }
    .info-label { font-weight: bold; display: inline-block; width: 80px; }
    h2 { font-size: 13px; margin-top: 3px; margin-bottom: 2px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 2px; }
    .producto { margin: 2px 0; padding: 2px; border: 1px solid #ddd; display: flex; gap: 5px; align-items: flex-start; }
    .producto-img { flex-shrink: 0; }
    .producto-img img { width: 25px; height: 25px; border-radius: 4px; object-fit: cover; }
    .producto-img div { width: 25px; height: 25px; border-radius: 4px; }
    .producto-info { flex: 1; }
    .producto-cantidad { font-size: 13px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Detalles del Pedido</h1>
  
  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Negocio:</span>
      <span>${negocioNombre.value}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Fecha:</span>
      <span>${formattedDate.value}</span>
    </div>
  </div>
  
  <h2>Productos (${totalProductos.value})</h2>
`

    if (pedido.value?.productos && pedido.value.productos.length > 0) {
      for (const producto of pedido.value.productos) {
        const imageUrl = getImageUrl(producto.producto?.imagen)
        const imgHtml = imageUrl
          ? `<img src="${imageUrl}" alt="${producto.producto?.nombre}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'" />`
          : `<div style="width: 25px; height: 25px; background: #f0f0f0; border-radius: 4px;"></div>`
        const unidad = producto.unidad_medida || producto.producto?.se_pide_en_unidad_medida || 'kg'
        const cantidad = Number.isFinite(parseFloat(producto.cantidad))
          ? parseFloat(producto.cantidad)
          : 0

        htmlContent += `
  <div class="producto">
    <div class="producto-img">
      ${imgHtml}
    </div>
    <div class="producto-info">
      <div class="producto-cantidad">${cantidad} ${unidad} de ${producto.producto?.nombre}</div>
    </div>
  </div>
`
      }
    }

    htmlContent += `
</body>
</html>`

    // Crear un blob y abrirlo en una ventana nueva
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // Abrir en ventana nueva
    const ventana = window.open(url)
    if (!ventana) {
      alert('No se pudo abrir la ventana. Por favor intenta de nuevo.')
      return
    }

    // Cuando cargue, esperar a que las imágenes se carguen y luego permitir imprimir
    ventana.addEventListener('load', () => {
      setTimeout(() => {
        ventana.print()
      }, 500)
    })
  } catch (error) {
    console.error('Error al exportar imagen:', error)
    alert('Error al exportar. Por favor intenta de nuevo.')
  }
}

onMounted(() => {
  cargarPedido()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button @click="volver" class="rounded-lg p-2 hover:bg-[var(--bg-200)] transition-colors">
        <ChevronLeft :size="24" class="text-[var(--text-100)]" />
      </button>
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-100)]">Detalles del Pedido</h1>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="rounded-lg bg-white p-8 text-center shadow-sm">
      <p class="text-[var(--text-200)]">Cargando pedido...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4">
      <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- Pedido Details -->
    <div v-else-if="pedido" class="space-y-6" data-export>
      <!-- Header con botón -->
      <div class="flex justify-center gap-3" data-no-export>
        <BaseButton variant="primary" @click="abrirModalAgregarProducto">
          <Plus :size="18" class="mr-2" />
          Agregar Producto
        </BaseButton>
        <BaseButton variant="secondary" @click="exportarComoTexto">
          <Download :size="18" class="mr-2" />
          Copiar Pedido
        </BaseButton>
        <BaseButton variant="secondary" @click="exportarComoImagen">
          <Download :size="18" class="mr-2" />
          Exportar PDF
        </BaseButton>
      </div>

      <!-- Productos -->
      <div class="rounded-lg bg-white border border-[var(--bg-300)] shadow-sm p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-[var(--text-100)]">Productos</h2>
          <span
            class="px-2 py-1 rounded-full bg-[var(--primary-100)] text-white text-xs font-medium"
          >
            {{ totalProductos }}
          </span>
        </div>

        <div v-if="pedido.productos && pedido.productos.length > 0" class="space-y-1.5">
          <div
            v-for="(producto, idx) in pedido.productos"
            :key="idx"
            class="group relative flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-[var(--bg-300)] bg-white hover:bg-[var(--bg-100)] hover:border-[var(--accent-100)] transition-all"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <!-- Image Circular -->
              <div
                class="relative h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--bg-200)] to-[var(--bg-100)] flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="getImageUrl(producto.producto?.imagen)"
                  :src="getImageUrl(producto.producto?.imagen) || ''"
                  :alt="producto.producto?.nombre"
                  class="h-full w-full object-cover"
                />
                <div v-else class="text-center">
                  <Apple :size="16" class="text-[var(--text-200)]" :stroke-width="1.5" />
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-[var(--text-100)] line-clamp-1">
                  {{ Number(parseFloat(producto.cantidad)) || 0 }}
                  {{
                    producto.unidad_medida ||
                    producto.producto?.se_pide_en_unidad_medida ||
                    'unidad'
                  }}
                  de {{ producto.producto?.nombre }}
                </p>
              </div>
            </div>

            <!-- Botones -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                @click="abrirEditarModal(producto)"
                class="rounded bg-blue-100 p-1.5 text-blue-600 hover:bg-blue-200 transition-colors"
                title="Editar"
              >
                <Edit :size="16" />
              </button>
              <button
                @click="producto.producto?.id ? handleEliminarProducto(producto.producto.id) : null"
                :disabled="isDeletingProducto"
                class="rounded bg-red-100 p-1.5 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                title="Eliminar"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-4">
          <p class="text-[var(--text-200)] text-sm">No hay productos en este pedido</p>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex gap-3 justify-center" data-no-export>
        <BaseButton variant="secondary" @click="volver"> Volver </BaseButton>
      </div>
    </div>
  </div>

  <!-- Modal Agregar Producto -->
  <BaseModal
    :title="modalStep === 1 ? 'Seleccionar Producto' : 'Agregar Producto'"
    :show="showAgregarModal"
    size="lg"
    @close="cerrarModal"
  >
    <!-- Paso 1: Búsqueda y lista de productos -->
    <div v-if="modalStep === 1">
      <!-- Búsqueda -->
      <div class="mb-4">
        <div class="relative">
          <Search class="absolute left-3 top-3 h-5 w-5 text-[var(--text-200)]" />
          <input
            v-model="busquedaProductos"
            type="text"
            placeholder="Buscar producto..."
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-10 pr-4 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>
      </div>

      <!-- Lista de productos -->
      <div class="max-h-96 overflow-y-auto space-y-2">
        <div
          v-for="producto in productosFiltrados"
          :key="producto.id || Math.random()"
          @click="seleccionarProducto(producto)"
          class="flex items-center gap-4 p-3 rounded-lg border border-[var(--bg-300)] hover:bg-[var(--bg-100)] hover:border-[var(--primary-100)] cursor-pointer transition-all"
        >
          <!-- Imagen -->
          <div
            class="relative h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--bg-200)] to-[var(--bg-100)] flex items-center justify-center overflow-hidden border-2 border-[var(--bg-300)]"
          >
            <img
              v-if="getImageUrl(producto.imagen)"
              :src="getImageUrl(producto.imagen) || ''"
              :alt="producto.nombre"
              class="h-full w-full object-cover"
            />
            <div v-else class="text-center">
              <Apple :size="20" class="text-[var(--text-200)]" :stroke-width="1.5" />
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1">
            <p class="font-semibold text-[var(--text-100)]">{{ producto.nombre }}</p>
            <p class="text-xs text-[var(--text-200)]">
              {{ producto.se_vende_en_unidad_medida || 'kg' }}
            </p>
          </div>
        </div>

        <div v-if="productosFiltrados.length === 0" class="text-center py-8">
          <p class="text-[var(--text-200)]">No se encontraron productos</p>
        </div>
      </div>
    </div>

    <!-- Paso 2: Cantidad y unidad -->
    <div v-else-if="modalStep === 2 && productoSeleccionado">
      <!-- Header producto -->
      <div
        class="mb-5 overflow-hidden rounded-xl border border-[var(--bg-300)] bg-gradient-to-r from-indigo-50 via-white to-emerald-50 shadow-sm"
      >
        <div class="flex items-center gap-4 p-4">
          <div
            class="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-100 to-emerald-100"
          >
            <img
              v-if="getImageUrl(productoSeleccionado.imagen)"
              :src="getImageUrl(productoSeleccionado.imagen) || ''"
              :alt="productoSeleccionado.nombre"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center">
              <Apple :size="26" class="text-indigo-500" :stroke-width="1.5" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-lg font-semibold text-[var(--text-100)] line-clamp-1">
              {{ productoSeleccionado.nombre }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span
                class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800"
              >
                Se vende en: {{ productoSeleccionado.se_vende_en_unidad_medida || 'kg' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulario solo cantidad -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-[var(--text-100)] mb-2">
            Cantidad a pedir
          </label>
          <input
            v-model="addProductoForm.cantidad"
            type="number"
            min="0.01"
            step="0.01"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            autofocus
          />
        </div>
        <div>
          <label class="block text-sm font-semibold text-[var(--text-100)] mb-2">
            Unidad a pedir
          </label>
          <select
            v-model="addProductoForm.unidad_medida"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad" :value="unidad">
              {{ unidad }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <BaseButton variant="secondary" @click="cerrarModal"> Cancelar </BaseButton>
        <BaseButton v-if="modalStep === 2" variant="secondary" @click="volverAListaProductos">
          Volver
        </BaseButton>
        <BaseButton
          v-if="modalStep === 2"
          variant="primary"
          :loading="isAddingProducto"
          @click="handleAgregarProducto"
        >
          Agregar
        </BaseButton>
      </div>
    </template>
  </BaseModal>

  <!-- Modal Editar Producto -->
  <BaseModal title="Editar Producto" :show="showEditarModal" @close="cerrarEditarModal">
    <div v-if="productoEditando" class="space-y-4">
      <!-- Información del producto -->
      <div class="p-4 rounded-lg bg-[var(--bg-100)] border border-[var(--bg-300)]">
        <h3 class="font-semibold text-[var(--text-100)] mb-2">
          {{ productoEditando.producto?.nombre }}
        </h3>
        <p class="text-sm text-[var(--text-200)]">
          {{ productoEditando.producto?.se_vende_en_unidad_medida || 'kg' }}
        </p>
      </div>

      <!-- Formulario de edición -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-2">Cantidad *</label>
          <input
            v-model="editarProductoForm.cantidad"
            type="number"
            min="0.01"
            step="0.01"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            autofocus
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-2">Unidad *</label>
          <select
            v-model="editarProductoForm.unidad_medida"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad" :value="unidad">
              {{ unidad }}
            </option>
          </select>
          <p class="mt-1 text-xs text-[var(--text-200)]">
            Sugerido:
            {{
              productoEditando.producto?.se_pide_en_unidad_medida ||
              productoEditando.producto?.se_vende_en_unidad_medida ||
              'unidad'
            }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <BaseButton variant="secondary" @click="cerrarEditarModal"> Cancelar </BaseButton>
        <BaseButton
          variant="primary"
          :loading="isEditingProducto"
          @click="handleActualizarProducto"
        >
          Guardar Cambios
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped></style>
