<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Package, Trash2, Search, Plus, Edit, Check, X } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useNotification } from '@/composables/useNotification'
import {
  compraApiObtenerCompra,
  compraApiAgregarProductoACompra,
  compraApiActualizarProductoDeCompra,
  compraApiEliminarProductoDeCompra,
  compraApiCambiarEstadoCompra,
  compraApiEliminarCompra,
} from '@/apps/compras/api'
import type {
  CompraSchema,
  AgregarProductoCompraSchema,
  ActualizarProductoCompraSchema,
} from '@/apps/compras/api/schemas'
import { pedidoApiObtenerPedido } from '@/apps/pedidos/api'
import type { PedidoSchema } from '@/apps/pedidos/api/schemas'
import { API_BASE_URL } from '@/config/env'
import { negocioApiListarNegocios } from '@/apps/negocios/api'
import { productoApiListarProductos } from '@/apps/productos/api'
import type { ProductoSchema } from '@/apps/productos/api/schemas'
import { UNIDADES_MEDIDA_VALUES } from '@/utils/unidadesMedida'

const router = useRouter()
const route = useRoute()
const { success: showSuccess, error: showError } = useNotification()

const compra = ref<CompraSchema | null>(null)
const pedido = ref<any>(null)
const negocioNombre = ref('')
const loading = ref(true)
const error = ref('')
const productosCatalogo = ref<ProductoSchema[]>([])
const busquedaProductos = ref('')
const showAgregarModal = ref(false)
const productoSeleccionado = ref<ProductoSchema | null>(null)
const addProductoForm = ref({
  producto_id: '',
  cantidad: '',
  unidad_medida: 'kg',
  precio_de_compra: '',
  ganancia_deseada: '0',
})
const addGananciaPreset = ref('manual')
const isAddingProducto = ref(false)
const isDeletingProducto = ref(false)
const isDeletingCompra = ref(false)
const isUpdatingEstado = ref(false)
const isEditingProducto = ref(false)
const productoEditando = ref<any>(null)
const editProductoForm = ref({
  cantidad: '',
  unidad_medida: '',
  precio_de_compra: '',
  ganancia_deseada: '',
  precio_venta: '',
})
const editGananciaPreset = ref('manual')

// Para manejar productos del pedido
const productosDelPedido = ref<any[]>([])
const showModalProductoPedido = ref(false)
const productoPedidoSeleccionado = ref<any>(null)
const formProductoPedido = ref({
  estado_compra: 'comprado', // 'comprado' o 'no_comprado'
  cantidad: '',
  unidad_medida: 'kg',
  precio_de_compra: '',
  ganancia_deseada: '0',
  motivo_no_compra: '',
})

const UNIDADES_MEDIDA = UNIDADES_MEDIDA_VALUES
const GANANCIA_PRESETS = ['20', '40', '60', '80', '100']

const productosFiltrados = computed(() => {
  if (!busquedaProductos.value.trim()) return productosCatalogo.value
  return productosCatalogo.value.filter((p) =>
    p.nombre?.toLowerCase().includes(busquedaProductos.value.toLowerCase()),
  )
})

const modalStep = computed(() => {
  return productoSeleccionado.value ? 2 : 1
})

const precioVentaCalculado = computed(() => {
  const precio = parseFloat(addProductoForm.value.precio_de_compra) || 0
  const ganancia = parseFloat(addProductoForm.value.ganancia_deseada) || 0
  if (precio <= 0) return 0
  return precio + (precio * ganancia) / 100
})

const canAgregarProducto = computed(() => {
  const cantidad = parseFloat(addProductoForm.value.cantidad)
  const precio = parseFloat(addProductoForm.value.precio_de_compra)
  return (
    !!addProductoForm.value.producto_id &&
    !!addProductoForm.value.unidad_medida &&
    !isNaN(cantidad) &&
    cantidad > 0 &&
    !isNaN(precio) &&
    precio > 0
  )
})

const canEditarProducto = computed(() => {
  const cantidad = parseFloat(editProductoForm.value.cantidad)
  const precio = parseFloat(editProductoForm.value.precio_de_compra)
  return (
    !!productoEditando.value?.producto?.id &&
    !!editProductoForm.value.unidad_medida &&
    !isNaN(cantidad) &&
    cantidad > 0 &&
    !isNaN(precio) &&
    precio > 0
  )
})

const precioVentaEditCalculado = computed(() => {
  const precio = parseFloat(editProductoForm.value.precio_de_compra) || 0
  const ganancia = parseFloat(editProductoForm.value.ganancia_deseada) || 0
  if (precio <= 0) return 0
  return precio + (precio * ganancia) / 100
})

const handleEditGananciaPresetChange = () => {
  if (editGananciaPreset.value !== 'manual') {
    editProductoForm.value.ganancia_deseada = editGananciaPreset.value
  }
}

const handleAddGananciaPresetChange = () => {
  if (addGananciaPreset.value !== 'manual') {
    addProductoForm.value.ganancia_deseada = addGananciaPreset.value
  }
}

const canGuardarProductoPedido = computed(() => {
  if (!productoPedidoSeleccionado.value) return false
  if (formProductoPedido.value.estado_compra === 'comprado') {
    const cantidad = parseFloat(formProductoPedido.value.cantidad)
    const precio = parseFloat(formProductoPedido.value.precio_de_compra)
    return (
      !!formProductoPedido.value.unidad_medida &&
      !isNaN(cantidad) &&
      cantidad > 0 &&
      !isNaN(precio) &&
      precio > 0
    )
  }
  return !!formProductoPedido.value.motivo_no_compra?.trim()
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
  if (!compra.value?.fecha_creacion) return ''
  return new Date(compra.value.fecha_creacion).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const totalProductos = computed(() => {
  return compra.value?.productos?.length || 0
})

const cargarCompra = async () => {
  const compraId = route.params.id as string
  loading.value = true
  error.value = ''

  try {
    // Cargar productos disponibles PRIMERO
    await loadProductos()

    const response = await compraApiObtenerCompra(parseInt(compraId), {
      headers: getAuthHeaders(),
    })

    if (response.status === 200) {
      compra.value = response.data as CompraSchema

      // Obtener nombre del negocio
      if (compra.value && compra.value.negocio) {
        const negociosResponse = await negocioApiListarNegocios(
          { limit: 1000, offset: 0 },
          { headers: getAuthHeaders() },
        )

        if (negociosResponse.status === 200) {
          const negocios = getItemsFromResponse(negociosResponse.data)
          const negocio = negocios.find((n: any) => n.id === compra.value?.negocio)
          negocioNombre.value = negocio?.nombre || 'Sin negocio'
        }
      }

      // Cargar el pedido asociado
      if (compra.value && compra.value.en_respuesta_a_pedido) {
        await cargarPedidoAsociado(compra.value.en_respuesta_a_pedido)
      }
    }
  } catch (err) {
    console.error('Error al cargar compra:', err)
    error.value = 'No se pudo cargar la compra'
  } finally {
    loading.value = false
  }
}

const cargarPedidoAsociado = async (pedidoId: number) => {
  try {
    const response = await pedidoApiObtenerPedido(pedidoId, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200) {
      pedido.value = response.data as PedidoSchema
      // Extraer productos del pedido - vienen con estructura PedidoProductoSchema
      // que incluye: { id, producto, cantidad, unidad_medida }
      productosDelPedido.value = pedido.value.productos || []
      console.log('Productos del pedido cargados:', productosDelPedido.value)
    }
  } catch (err) {
    console.error('Error al cargar pedido asociado:', err)
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

const seleccionarProducto = (producto: ProductoSchema) => {
  productoSeleccionado.value = producto
  addProductoForm.value.producto_id = producto.id?.toString() || ''
  addProductoForm.value.unidad_medida = producto.se_vende_en_unidad_medida || 'kg'
  addGananciaPreset.value = 'manual'
}

const volverAListaProductos = () => {
  productoSeleccionado.value = null
}

const cerrarModal = () => {
  showAgregarModal.value = false
  productoSeleccionado.value = null
  addProductoForm.value = {
    producto_id: '',
    cantidad: '',
    unidad_medida: 'kg',
    precio_de_compra: '',
    ganancia_deseada: '0',
  }
  addGananciaPreset.value = 'manual'
  busquedaProductos.value = ''
}

const handleAgregarProducto = async () => {
  if (!compra.value?.id || !addProductoForm.value.producto_id) return

  isAddingProducto.value = true
  try {
    const payload: AgregarProductoCompraSchema = {
      producto_id: parseInt(addProductoForm.value.producto_id),
      cantidad: parseFloat(addProductoForm.value.cantidad),
      unidad_medida: addProductoForm.value.unidad_medida,
      precio_de_compra: parseFloat(addProductoForm.value.precio_de_compra),
      ganancia_deseada: parseFloat(addProductoForm.value.ganancia_deseada || '0'),
    }

    const response = await compraApiAgregarProductoACompra(compra.value.id, payload, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200 || response.status === 201) {
      cerrarModal()
      await cargarCompra()
    }
  } catch (error) {
    console.error('Error al agregar producto:', error)
  } finally {
    isAddingProducto.value = false
  }
}

const handleEliminarProducto = async (productoId: number | undefined) => {
  if (!compra.value?.id || !productoId) return
  if (!confirm('¿Estás seguro de que deseas eliminar este producto de la compra?')) return

  isDeletingProducto.value = true
  try {
    const response = await compraApiEliminarProductoDeCompra(
      compra.value.id,
      { producto_id: productoId },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200 || response.status === 204) {
      await cargarCompra()
    }
  } catch (error) {
    console.error('Error al eliminar producto:', error)
  } finally {
    isDeletingProducto.value = false
  }
}

const abrirEditarProducto = (producto: any) => {
  productoEditando.value = producto
  editProductoForm.value = {
    cantidad: producto.cantidad,
    unidad_medida: producto.unidad_medida,
    precio_de_compra: producto.precio_de_compra,
    ganancia_deseada: producto.ganancia_deseada || '',
    precio_venta: producto.precio_venta || '',
  }
  const gananciaActual = String(producto.ganancia_deseada ?? '')
  editGananciaPreset.value = GANANCIA_PRESETS.includes(gananciaActual) ? gananciaActual : 'manual'
  isEditingProducto.value = false
}

const cerrarEditarProducto = () => {
  productoEditando.value = null
  editProductoForm.value = {
    cantidad: '',
    unidad_medida: '',
    precio_de_compra: '',
    ganancia_deseada: '',
    precio_venta: '',
  }
  editGananciaPreset.value = 'manual'
}

const handleActualizarProducto = async () => {
  if (!compra.value?.id || !productoEditando.value?.producto?.id) return

  // Validar que cantidad y precio sean obligatorios
  if (!editProductoForm.value.cantidad || editProductoForm.value.cantidad === '') {
    showError('La cantidad es obligatoria')
    return
  }
  if (!editProductoForm.value.precio_de_compra || editProductoForm.value.precio_de_compra === '') {
    showError('El precio de compra es obligatorio')
    return
  }

  isEditingProducto.value = true
  try {
    const payload: ActualizarProductoCompraSchema & { producto_id: number } = {
      producto_id: productoEditando.value.producto.id,
      cantidad: parseFloat(editProductoForm.value.cantidad),
      unidad_medida: editProductoForm.value.unidad_medida,
      precio_de_compra: parseFloat(editProductoForm.value.precio_de_compra),
    }

    // Agregar ganancia_deseada solo si tiene valor
    if (editProductoForm.value.ganancia_deseada && editProductoForm.value.ganancia_deseada !== '') {
      payload.ganancia_deseada = parseFloat(editProductoForm.value.ganancia_deseada)
    }

    const response = await compraApiActualizarProductoDeCompra(compra.value.id, payload, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200 || response.status === 201) {
      showSuccess('Producto actualizado correctamente')
      cerrarEditarProducto()
      await cargarCompra()
    }
  } catch (error) {
    console.error('Error al actualizar producto:', error)
    showError('Error al actualizar el producto')
  } finally {
    isEditingProducto.value = false
  }
}

const handleCambiarEstado = async (nuevoEstado: string) => {
  if (!compra.value?.id) return
  isUpdatingEstado.value = true

  try {
    const response = await compraApiCambiarEstadoCompra(
      compra.value.id,
      { estado: nuevoEstado as 'en_proceso' | 'completado' },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      showSuccess('Estado actualizado correctamente')
      await cargarCompra()
    }
  } catch (error: any) {
    const errorMessage = error?.data?.detail || error?.message || 'Error al cambiar estado'
    showError(errorMessage)
  } finally {
    isUpdatingEstado.value = false
  }
}

const handleEliminarCompra = async () => {
  if (!compra.value?.id) return
  if (!confirm('¿Estás seguro de que deseas eliminar esta compra completa?')) return

  isDeletingCompra.value = true
  try {
    const response = await compraApiEliminarCompra(compra.value.id, {
      headers: getAuthHeaders(),
    })

    if (response.status === 200 || response.status === 204) {
      router.push({ name: 'compras' })
    }
  } catch (error) {
    console.error('Error al eliminar compra:', error)
    alert('No se pudo eliminar la compra')
  } finally {
    isDeletingCompra.value = false
  }
}

const abrirModalProductoPedido = (productoPedido: any) => {
  productoPedidoSeleccionado.value = productoPedido
  formProductoPedido.value = {
    estado_compra: 'comprado',
    cantidad: productoPedido.cantidad || '',
    unidad_medida: productoPedido.unidad_medida || 'kg',
    precio_de_compra: '',
    ganancia_deseada: '0',
    motivo_no_compra: '',
  }
  showModalProductoPedido.value = true
}

const cerrarModalProductoPedido = () => {
  showModalProductoPedido.value = false
  productoPedidoSeleccionado.value = null
  formProductoPedido.value = {
    estado_compra: 'comprado',
    cantidad: '',
    unidad_medida: 'kg',
    precio_de_compra: '',
    ganancia_deseada: '0',
    motivo_no_compra: '',
  }
}

const handleGuardarProductoPedido = async () => {
  if (!compra.value?.id || !productoPedidoSeleccionado.value) return

  const productoId = productoPedidoSeleccionado.value.producto?.id
  const pedidoProductoId = productoPedidoSeleccionado.value.id
  if (!productoId) {
    showError('Producto inválido')
    return
  }

  isAddingProducto.value = true
  try {
    let response

    if (formProductoPedido.value.estado_compra === 'comprado') {
      const cantidad = parseFloat(formProductoPedido.value.cantidad)
      if (!formProductoPedido.value.cantidad || isNaN(cantidad) || cantidad <= 0) {
        showError('La cantidad es obligatoria y debe ser mayor a 0')
        return
      }

      if (!formProductoPedido.value.unidad_medida) {
        showError('Debes seleccionar una unidad de medida')
        return
      }

      const precioDeCompra = parseFloat(formProductoPedido.value.precio_de_compra)
      if (
        !formProductoPedido.value.precio_de_compra ||
        isNaN(precioDeCompra) ||
        precioDeCompra <= 0
      ) {
        showError('El precio de compra es obligatorio y debe ser mayor a 0')
        return
      }

      const payload: AgregarProductoCompraSchema = {
        producto_id: productoId,
        unidad_medida: formProductoPedido.value.unidad_medida,
        precio_de_compra: precioDeCompra,
        ganancia_deseada: parseFloat(formProductoPedido.value.ganancia_deseada || '0'),
        pedido_producto_id: pedidoProductoId,
        estado_compra: 'comprado',
        motivo_no_compra: null,
      }

      response = await compraApiAgregarProductoACompra(compra.value.id, payload, {
        headers: getAuthHeaders(),
      })
    } else {
      const motivo = formProductoPedido.value.motivo_no_compra?.trim()
      if (!motivo) {
        showError('Debes indicar el motivo de no compra')
        return
      }

      const payload: AgregarProductoCompraSchema = {
        producto_id: productoId,
        cantidad: null,
        unidad_medida: formProductoPedido.value.unidad_medida || 'kg',
        precio_de_compra: 0,
        ganancia_deseada: 0,
        pedido_producto_id: pedidoProductoId,
        estado_compra: 'no_comprado',
        motivo_no_compra: motivo,
      }

      response = await compraApiAgregarProductoACompra(compra.value.id, payload, {
        headers: getAuthHeaders(),
      })
    }

    if (response.status === 200 || response.status === 201) {
      showSuccess(
        formProductoPedido.value.estado_compra === 'comprado'
          ? 'Producto agregado correctamente'
          : 'Producto marcado como no comprado',
      )
      cerrarModalProductoPedido()
      await cargarCompra()
    }
  } catch (error: any) {
    const errorMessage = error?.data?.detail || error?.message || 'Error al guardar producto'
    showError(errorMessage)
  } finally {
    isAddingProducto.value = false
  }
}

const getImagenUrl = (imagen: string | undefined) => {
  if (!imagen) return ''
  if (imagen.startsWith('http')) return imagen
  return `${API_BASE_URL}${imagen}`
}

const getPrecioVentaPublico = (producto: any) => {
  if (producto?.precio_venta !== undefined && producto?.precio_venta !== null) {
    return Number(producto.precio_venta).toFixed(2)
  }
  const precioCompra = Number(producto?.precio_de_compra) || 0
  const ganancia = Number(producto?.ganancia_deseada) || 0
  return (precioCompra * (1 + ganancia / 100)).toFixed(2)
}

const irAPedidoAsociado = () => {
  if (compra.value?.en_respuesta_a_pedido) {
    router.push({
      name: 'pedido-detalles',
      params: { id: compra.value.en_respuesta_a_pedido },
    })
  }
}

const volverACompras = () => {
  router.push({ name: 'compras' })
}

onMounted(() => {
  cargarCompra()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button
        @click="volverACompras"
        class="rounded-lg p-2 hover:bg-[var(--bg-300)] transition-colors"
      >
        <ChevronLeft :size="24" class="text-[var(--text-100)]" />
      </button>
      <div>
        <p class="text-sm font-medium text-[var(--text-200)]">{{ negocioNombre }}</p>
        <h1 class="text-3xl font-bold text-[var(--text-100)]">Detalles de Compra</h1>
      </div>
    </div>

    <!-- Loading/Error States -->
    <div v-if="loading" class="rounded-lg bg-white p-8 text-center shadow-sm">
      <p class="text-[var(--text-200)]">Cargando detalles de la compra...</p>
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-700 shadow-sm">
      {{ error }}
    </div>

    <!-- Main Content -->
    <div v-else-if="compra" class="space-y-6">
      <!-- Info Card -->
      <div class="rounded-lg border border-[var(--bg-300)] bg-white p-4 shadow-sm">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p class="text-xs text-[var(--text-200)] uppercase tracking-wide">Fecha</p>
            <p class="mt-1 text-sm font-semibold text-[var(--text-100)]">{{ formattedDate }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-200)] uppercase tracking-wide">Estado</p>
            <p
              :class="[
                'mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium',
                getEstadoColor(compra.estado),
              ]"
            >
              {{ compra.estado }}
            </p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-200)] uppercase tracking-wide">Productos</p>
            <p class="mt-1 text-sm font-semibold text-[var(--text-100)]">
              {{ totalProductos }} producto(s)
            </p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-200)] uppercase tracking-wide">Negocio</p>
            <p class="mt-1 text-sm font-semibold text-[var(--text-100)]">{{ negocioNombre }}</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 flex flex-wrap gap-2">
          <BaseButton
            v-if="compra.estado !== 'completado'"
            variant="success"
            size="sm"
            @click="handleCambiarEstado('completado')"
            :loading="isUpdatingEstado"
          >
            Completar Compra
          </BaseButton>
          <BaseButton variant="secondary" size="sm" @click="irAPedidoAsociado">
            Ver Pedido Asociado
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            @click="handleEliminarCompra"
            :loading="isDeletingCompra"
          >
            Eliminar Compra
          </BaseButton>
        </div>
      </div>

      <!-- Productos del Pedido Asociado -->
      <div v-if="pedido && productosDelPedido.length > 0" class="space-y-3">
        <h2 class="text-lg font-bold text-[var(--text-100)]">Productos del Pedido Asociado</h2>
        <p class="text-sm text-[var(--text-200)]">
          Selecciona si deseas comprar cada producto o no (con justificación)
        </p>

        <div class="space-y-1">
          <div
            v-for="productoPedido in productosDelPedido"
            :key="productoPedido.id"
            class="rounded-lg border border-[var(--bg-300)] bg-white p-1 shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="flex items-start gap-1">
              <!-- Imagen -->
              <div class="flex-shrink-0">
                <img
                  v-if="productoPedido.producto?.imagen"
                  :src="getImagenUrl(productoPedido.producto.imagen)"
                  :alt="productoPedido.producto?.nombre"
                  class="h-6 w-6 rounded-lg object-cover"
                />
                <div
                  v-else
                  class="h-6 w-6 rounded-lg bg-[var(--bg-300)] flex items-center justify-center"
                >
                  <Package :size="12" class="text-[var(--text-200)]" />
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-xs text-[var(--text-100)] truncate">
                  {{ productoPedido.cantidad }}
                  {{ productoPedido.unidad_medida || 'unidades' }} de
                  {{ productoPedido.producto?.nombre }}
                </p>
                <!-- Verificar si ya está agregado a la compra -->
                <p
                  v-if="
                    compra?.productos?.some((p) => p.producto?.id === productoPedido.producto?.id)
                  "
                  class="text-xs text-green-600 mt-0.5"
                >
                  ✓ Agregado
                </p>
              </div>

              <!-- Botón -->
              <button
                v-if="
                  !compra?.productos?.some((p) => p.producto?.id === productoPedido.producto?.id)
                "
                @click="abrirModalProductoPedido(productoPedido)"
                class="flex-shrink-0 rounded-lg bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200 transition-colors text-xs font-medium whitespace-nowrap"
              >
                <Plus :size="12" class="inline mr-1" />
                Procesar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Product Button -->
      <div class="flex justify-center">
        <BaseButton variant="primary" size="md" @click="showAgregarModal = true">
          <Plus :size="18" class="mr-2" />
          Agregar Otro Producto
        </BaseButton>
      </div>

      <!-- Products List -->
      <div class="space-y-3">
        <div v-if="totalProductos === 0" class="rounded-lg bg-white p-8 text-center shadow-sm">
          <Package :size="48" class="mx-auto mb-3 text-[var(--text-200)]" />
          <p class="text-[var(--text-200)]">No hay productos en esta compra</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="producto in compra.productos"
            :key="producto.producto?.id || Math.random()"
            class="rounded-lg border border-[var(--bg-300)] bg-white p-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <!-- Primera línea: imagen y nombre -->
            <div class="flex items-center gap-2 mb-1">
              <!-- Imagen -->
              <div v-if="producto.producto?.imagen" class="flex-shrink-0">
                <img
                  :src="getImagenUrl(producto.producto.imagen)"
                  :alt="producto.producto?.nombre"
                  class="h-10 w-10 rounded-lg object-cover"
                />
              </div>
              <div v-else class="flex-shrink-0">
                <div
                  class="h-10 w-10 rounded-lg bg-[var(--bg-300)] flex items-center justify-center"
                >
                  <Package :size="16" class="text-[var(--text-200)]" />
                </div>
              </div>

              <!-- Nombre -->
              <p class="font-semibold text-sm text-[var(--text-100)] truncate flex-1">
                {{ producto.producto?.nombre }}
              </p>

              <!-- Botones -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <button
                  v-if="producto.estado_compra !== 'no_comprado'"
                  @click="abrirEditarProducto(producto)"
                  class="rounded-lg bg-blue-100 p-1.5 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Editar producto"
                >
                  <Edit :size="16" />
                </button>

                <button
                  @click="
                    handleEliminarProducto(
                      (producto.producto?.id || undefined) as number | undefined,
                    )
                  "
                  class="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200 transition-colors"
                  title="Eliminar producto"
                  :disabled="isDeletingProducto"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>

            <!-- Segunda línea: cantidad y precios/ganancia -->
            <div class="pl-12 text-sm">
              <template v-if="producto.estado_compra === 'no_comprado'">
                <div class="flex items-center gap-3">
                  <span v-if="producto.cantidad" class="text-[var(--text-200)]">
                    Cantidad:
                    <span class="font-semibold text-[var(--text-100)]"
                      >{{ producto.cantidad }} {{ producto.unidad_medida }}</span
                    >
                  </span>
                  <span
                    class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                  >
                    No comprado
                  </span>
                  <p v-if="producto.motivo_no_compra" class="text-xs text-red-600">
                    {{ producto.motivo_no_compra }}
                  </p>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-3">
                  <span v-if="producto.cantidad" class="text-[var(--text-200)]">
                    Cantidad:
                    <span class="font-semibold text-[var(--text-100)]"
                      >{{ producto.cantidad }} {{ producto.unidad_medida }}</span
                    >
                  </span>
                  <span class="text-[var(--text-200)]">
                    Compra:
                    <span class="font-semibold text-[var(--text-100)]"
                      >${{ Number(producto.precio_de_compra || 0).toFixed(2) }}</span
                    >
                  </span>
                  <span class="text-[var(--text-200)]">
                    Venta:
                    <span class="font-semibold text-[var(--primary-100)]"
                      >${{ getPrecioVentaPublico(producto) }}</span
                    >
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Agregar Producto -->
    <BaseModal :show="showAgregarModal" title="Agregar Producto" @close="cerrarModal">
      <!-- Step 1: Search and Select -->
      <div v-if="modalStep === 1" class="space-y-4">
        <div class="relative">
          <Search class="absolute left-3 top-3 h-5 w-5 text-[var(--text-200)]" />
          <input
            v-model="busquedaProductos"
            type="text"
            placeholder="Buscar producto..."
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-10 pr-4 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <div class="max-h-96 space-y-1 overflow-y-auto">
          <button
            v-for="producto in productosFiltrados"
            :key="producto.id || Math.random()"
            @click="seleccionarProducto(producto)"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white p-1 text-left transition-all hover:border-[var(--primary-100)] hover:shadow-md"
          >
            <div class="flex items-center gap-1">
              <div v-if="producto.imagen && producto.imagen.trim()" class="flex-shrink-0">
                <img
                  :src="producto.imagen"
                  :alt="producto.nombre"
                  class="h-6 w-6 rounded-lg object-cover"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
              </div>
              <div v-else class="flex-shrink-0">
                <div class="h-6 w-6 rounded-lg bg-[var(--bg-300)] flex items-center justify-center">
                  <Package :size="12" class="text-[var(--text-200)]" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-xs text-[var(--text-100)] truncate">
                  {{ producto.nombre }}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2: Quantity and Price -->
      <div v-else-if="modalStep === 2" class="space-y-4">
        <div class="flex items-center gap-2">
          <button
            @click="volverAListaProductos"
            class="rounded-lg p-2 hover:bg-[var(--bg-300)] transition-colors"
          >
            <ChevronLeft :size="20" class="text-[var(--text-100)]" />
          </button>
          <div>
            <h2 class="text-2xl font-bold text-[var(--text-100)]">
              {{ productoSeleccionado?.nombre }}
            </h2>
          </div>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Cantidad <span class="text-red-500">*</span></label
          >
          <input
            v-model="addProductoForm.cantidad"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Unidad de Medida <span class="text-red-500">*</span></label
          >
          <select
            v-model="addProductoForm.unidad_medida"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad" :value="unidad">
              {{ unidad }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Precio de Compra <span class="text-red-500">*</span>
          </label>
          <input
            v-model="addProductoForm.precio_de_compra"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
          <p class="text-xs text-[var(--text-200)] mt-1">
            Por {{ productoSeleccionado?.se_vende_en_unidad_medida || 'unidades' }}
          </p>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Ganancia Deseada (%) - Opcional
          </label>
          <select
            v-model="addGananciaPreset"
            @change="handleAddGananciaPresetChange"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option value="manual">Ganancia manual</option>
            <option v-for="preset in GANANCIA_PRESETS" :key="preset" :value="preset">
              {{ preset }}%
            </option>
          </select>
          <input
            v-if="addGananciaPreset === 'manual'"
            v-model="addProductoForm.ganancia_deseada"
            type="number"
            placeholder="0"
            class="mt-2 w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
          <p class="text-xs text-[var(--text-200)] mt-1">
            Si no pones precio de venta, se calculará con esta ganancia
          </p>
        </div>

        <div class="rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <p class="text-sm font-medium text-green-700">Precio de Venta (lo que se debe vender)</p>
          <p class="text-xl font-semibold text-green-800">
            ${{ precioVentaCalculado.toFixed(2) }}
            <span class="text-xs font-normal text-green-700">
              /{{ productoSeleccionado?.se_vende_en_unidad_medida || 'unidades' }}
            </span>
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <BaseButton variant="secondary" size="md" @click="cerrarModal"> Cancelar </BaseButton>
          <BaseButton
            v-if="modalStep === 2"
            variant="primary"
            size="md"
            @click="handleAgregarProducto"
            :loading="isAddingProducto"
            :disabled="!canAgregarProducto || isAddingProducto"
          >
            Agregar
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Editar Producto -->
    <BaseModal
      :show="productoEditando !== null"
      title="Editar Producto"
      @close="cerrarEditarProducto"
    >
      <div class="space-y-4">
        <!-- Cantidad -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Cantidad <span class="text-red-500">*</span></label
          >
          <input
            v-model="editProductoForm.cantidad"
            type="number"
            step="0.01"
            placeholder="0.00"
            required
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <!-- Unidad de Medida -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Unidad de Medida
          </label>
          <select
            v-model="editProductoForm.unidad_medida"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad" :value="unidad">
              {{ unidad }}
            </option>
          </select>
        </div>

        <!-- Precio de Compra -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Precio de Compra <span class="text-red-500">*</span>
          </label>
          <input
            v-model="editProductoForm.precio_de_compra"
            type="number"
            step="0.01"
            placeholder="0.00"
            required
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
          <p class="text-xs text-[var(--text-200)] mt-1">
            Por {{ productoEditando?.producto?.se_vende_en_unidad_medida || 'unidades' }}
          </p>
        </div>

        <!-- Ganancia Deseada -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Ganancia Deseada (%) - Opcional
          </label>
          <select
            v-model="editGananciaPreset"
            @change="handleEditGananciaPresetChange"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option value="manual">Ganancia manual</option>
            <option v-for="preset in GANANCIA_PRESETS" :key="preset" :value="preset">
              {{ preset }}%
            </option>
          </select>
          <input
            v-if="editGananciaPreset === 'manual'"
            v-model="editProductoForm.ganancia_deseada"
            type="number"
            placeholder="0"
            class="mt-2 w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
          <p class="text-xs text-[var(--text-200)] mt-1">
            Si no pones precio de venta, se calculará con esta ganancia
          </p>
        </div>

        <!-- Precio de Venta (calculado) -->
        <div class="rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <p class="text-sm font-medium text-green-700">Precio de Venta (lo que se debe vender)</p>
          <p class="text-xl font-semibold text-green-800">
            ${{ precioVentaEditCalculado.toFixed(2) }}
            <span class="text-xs font-normal text-green-700">
              /{{ productoEditando?.producto?.se_vende_en_unidad_medida || 'unidades' }}
            </span>
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <BaseButton variant="secondary" size="md" @click="cerrarEditarProducto">
            Cancelar
          </BaseButton>
          <BaseButton
            variant="primary"
            size="md"
            @click="handleActualizarProducto"
            :loading="isEditingProducto"
            :disabled="!canEditarProducto || isEditingProducto"
          >
            Guardar
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Procesar Producto del Pedido -->
    <BaseModal
      :show="showModalProductoPedido"
      title="Procesar Producto del Pedido"
      @close="cerrarModalProductoPedido"
    >
      <div class="space-y-4">
        <div>
          <p class="font-semibold text-[var(--text-100)]">
            {{ productoPedidoSeleccionado?.producto?.nombre }}
          </p>
          <p class="text-sm text-[var(--text-200)]">
            Cantidad solicitada: {{ productoPedidoSeleccionado?.cantidad }}
            {{ productoPedidoSeleccionado?.unidad_medida || 'unidades' }}
          </p>
        </div>

        <!-- Opción: Comprado o No Comprado -->
        <div class="border-t border-[var(--bg-300)] pt-4">
          <label class="mb-3 block text-sm font-medium text-[var(--text-100)]"
            >¿Qué harás con este producto?</label
          >
          <div class="space-y-2">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="formProductoPedido.estado_compra"
                type="radio"
                value="comprado"
                class="rounded-full accent-[var(--primary-100)]"
              />
              <span class="text-[var(--text-100)]">Compré este producto</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="formProductoPedido.estado_compra"
                type="radio"
                value="no_comprado"
                class="rounded-full accent-[var(--primary-100)]"
              />
              <span class="text-[var(--text-100)]">No compré este producto</span>
            </label>
          </div>
        </div>

        <!-- Si lo compró: mostrar campos de cantidad y precio -->
        <div
          v-if="formProductoPedido.estado_compra === 'comprado'"
          class="space-y-4 border-t border-[var(--bg-300)] pt-4"
        >
          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
              >Cantidad Comprada</label
            >
            <input
              v-model="formProductoPedido.cantidad"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
              >Unidad de Medida</label
            >
            <select
              v-model="formProductoPedido.unidad_medida"
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            >
              <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad" :value="unidad">
                {{ unidad }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
              >Precio de Compra</label
            >
            <input
              v-model="formProductoPedido.precio_de_compra"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
              >Ganancia Deseada (%)</label
            >
            <input
              v-model="formProductoPedido.ganancia_deseada"
              type="number"
              placeholder="0"
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>
        </div>

        <!-- Si no lo compró: mostrar campo de justificación -->
        <div
          v-if="formProductoPedido.estado_compra === 'no_comprado'"
          class="space-y-4 border-t border-[var(--bg-300)] pt-4"
        >
          <div>
            <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
              Motivo por el que NO lo comprastes
            </label>
            <div class="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                class="rounded-md bg-[var(--bg-200)] px-3 py-1 text-xs font-medium text-[var(--text-100)] hover:bg-[var(--bg-300)] transition-colors"
                @click="formProductoPedido.motivo_no_compra = 'No disponible en el proveedor'"
              >
                No disponible en el proveedor
              </button>
              <button
                type="button"
                class="rounded-md bg-[var(--bg-200)] px-3 py-1 text-xs font-medium text-[var(--text-100)] hover:bg-[var(--bg-300)] transition-colors"
                @click="formProductoPedido.motivo_no_compra = 'Precio muy alto'"
              >
                Precio muy alto
              </button>
            </div>
            <textarea
              v-model="formProductoPedido.motivo_no_compra"
              placeholder="Ej: No disponible en el proveedor, precio muy alto, etc."
              rows="3"
              class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <BaseButton variant="secondary" size="md" @click="cerrarModalProductoPedido">
            Cancelar
          </BaseButton>
          <BaseButton
            variant="primary"
            size="md"
            @click="handleGuardarProductoPedido"
            :loading="isAddingProducto"
            :disabled="!canGuardarProductoPedido || isAddingProducto"
          >
            Guardar
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped></style>
