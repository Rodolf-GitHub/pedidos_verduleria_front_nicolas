<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Edit, Trash2, Search, Image as ImageIcon, Apple } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BasePagination from '@/components/BasePagination.vue'
import {
  productoApiListarProductos,
  productoApiCrearProducto,
  productoApiActualizarProducto,
  productoApiEliminarProducto,
} from '@/apps/productos/api'
import type { ProductoSchema } from '@/apps/productos/api/schemas'
import { API_BASE_URL } from '@/config/env'
import { UNIDADES_MEDIDA, UNIDADES_MEDIDA_LABELS } from '@/utils/unidadesMedida'
import type { UnidadMedida } from '@/utils/unidadesMedida'

const LIMIT = 10
const GANANCIA_PRESETS = ['20', '40', '60', '80', '100']

const productos = ref<ProductoSchema[]>([])
const totalCount = ref(0)
const loading = ref(false)
const busqueda = ref('')
const offset = ref(0)
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedProducto = ref<ProductoSchema | null>(null)
const imagePreview = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const gananciaPreset = ref('40')

const formData = ref({
  nombre: '',
  se_vende_en_unidad_medida: 'kg',
  se_pide_en_unidad_medida: 'kg',
  precio_compra: '',
  ganancia_porcentaje: '',
  factor_division: '',
})

const formErrors = ref({
  nombre: '',
  se_vende_en_unidad_medida: '',
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

const parseNumberOrNull = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  return Number.isNaN(numeric) ? null : numeric
}

const hasValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return !Number.isNaN(value)
}

const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath
  if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) return imagePath
  return `${API_BASE_URL}${imagePath}`
}

const getUnidadLabel = (unidad: string | null | undefined) => {
  if (!unidad) return 'kg'
  return UNIDADES_MEDIDA_LABELS[unidad as UnidadMedida] || unidad
}

const getUnidadAbreviatura = (unidad: string | null | undefined) => {
  if (!unidad) return 'kg'
  return unidad
}

const handleGananciaPresetChange = () => {
  if (gananciaPreset.value !== 'manual') {
    formData.value.ganancia_porcentaje = gananciaPreset.value
  }
}

const loadProductos = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    const response = await productoApiListarProductos(
      { busqueda: busqueda.value || undefined, limit: LIMIT, offset: offset.value },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 200) {
      productos.value = response.data.items
      totalCount.value = response.data.count
    }
  } catch (error) {
    console.error('Error al cargar productos:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  modalMode.value = 'create'
  selectedProducto.value = null
  formData.value = {
    nombre: '',
    se_vende_en_unidad_medida: 'kg',
    se_pide_en_unidad_medida: 'kg',
    precio_compra: '100',
    ganancia_porcentaje: '40',
    factor_division: '',
  }
  formErrors.value = {
    nombre: '',
    se_vende_en_unidad_medida: '',
  }
  gananciaPreset.value = '40'
  imagePreview.value = null
  selectedFile.value = null
  showModal.value = true
}

const openEditModal = (producto: ProductoSchema) => {
  modalMode.value = 'edit'
  selectedProducto.value = producto
  formData.value = {
    nombre: producto.nombre,
    se_vende_en_unidad_medida: producto.se_vende_en_unidad_medida || 'kg',
    se_pide_en_unidad_medida: producto.se_pide_en_unidad_medida || 'kg',
    precio_compra: producto.precio_compra ? String(producto.precio_compra) : '',
    ganancia_porcentaje: producto.ganancia_porcentaje ? String(producto.ganancia_porcentaje) : '',
    factor_division: producto.factor_division ? String(producto.factor_division) : '',
  }
  formErrors.value = {
    nombre: '',
    se_vende_en_unidad_medida: '',
  }
  // Determinar si la ganancia es un preset o manual
  const gananciaStr = String(producto.ganancia_porcentaje || '')
  if (GANANCIA_PRESETS.includes(gananciaStr)) {
    gananciaPreset.value = gananciaStr
  } else {
    gananciaPreset.value = 'manual'
  }
  imagePreview.value = producto.imagen || null
  selectedFile.value = null
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedProducto.value = null
  formData.value = {
    nombre: '',
    se_vende_en_unidad_medida: 'kg',
    se_pide_en_unidad_medida: 'kg',
    precio_compra: '',
    ganancia_porcentaje: '',
    factor_division: '',
  }
  gananciaPreset.value = '40'
  imagePreview.value = null
  selectedFile.value = null
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const validateForm = () => {
  let isValid = true
  formErrors.value = {
    nombre: '',
    se_vende_en_unidad_medida: '',
  }

  if (!formData.value.nombre.trim()) {
    formErrors.value.nombre = 'El nombre es requerido'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    const token = localStorage.getItem('auth_token')

    if (modalMode.value === 'create') {
      const payload = {
        nombre: formData.value.nombre,
        se_vende_en_unidad_medida: formData.value.se_vende_en_unidad_medida,
        se_compra_en_unidad_medida: formData.value.se_pide_en_unidad_medida,
        precio_compra: parseNumberOrNull(formData.value.precio_compra),
        ganancia_porcentaje: parseNumberOrNull(formData.value.ganancia_porcentaje),
        factor_division:
          formData.value.factor_division !== '' ? Number(formData.value.factor_division) : null,
      }

      const body: any = {
        payload,
      }

      if (selectedFile.value) {
        body.imagen = selectedFile.value
      }

      await productoApiCrearProducto(body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } else {
      const payload = {
        nombre: formData.value.nombre,
        se_vende_en_unidad_medida: formData.value.se_vende_en_unidad_medida,
        se_compra_en_unidad_medida: formData.value.se_pide_en_unidad_medida,
        precio_compra: parseNumberOrNull(formData.value.precio_compra),
        ganancia_porcentaje: parseNumberOrNull(formData.value.ganancia_porcentaje),
        factor_division:
          formData.value.factor_division !== '' ? Number(formData.value.factor_division) : null,
      }

      const body: any = {
        payload,
      }

      if (selectedFile.value) {
        body.imagen = selectedFile.value
      }

      await productoApiActualizarProducto(selectedProducto.value!.id!, body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }

    closeModal()
    await loadProductos()
  } catch (error) {
    console.error('Error al guardar producto:', error)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (producto: ProductoSchema) => {
  if (!confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) return

  loading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    await productoApiEliminarProducto(producto.id!, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    await loadProductos()
  } catch (error) {
    console.error('Error al eliminar producto:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProductos()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-100)]">Productos</h1>
        <p class="mt-1 text-sm text-[var(--text-200)]">Gestiona los productos disponibles</p>
      </div>
      <BaseButton @click="openCreateModal" variant="primary">
        <Plus :size="18" :stroke-width="2" class="mr-2" />
        Nuevo Producto
      </BaseButton>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search :size="20" class="text-[var(--text-200)]" />
        </div>
        <input
          v-model="busqueda"
          @input="
            () => {
              offset = 0
              loadProductos()
            }
          "
          type="text"
          placeholder="Buscar productos..."
          class="block w-full rounded-lg border border-[var(--bg-300)] bg-white py-2.5 pl-10 pr-3 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && productos.length === 0" class="text-center py-12">
      <div
        class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--accent-100)] border-r-transparent"
      ></div>
      <p class="mt-2 text-sm text-[var(--text-200)]">Cargando productos...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && productos.length === 0"
      class="text-center py-12 bg-white rounded-lg border border-[var(--bg-300)]"
    >
      <Apple :size="48" class="mx-auto text-[var(--text-200)] mb-4" :stroke-width="1.5" />
      <h3 class="text-lg font-medium text-[var(--text-100)] mb-2">No hay productos registrados</h3>
      <p class="text-sm text-[var(--text-200)] mb-4">Comienza creando tu primer producto</p>
      <BaseButton @click="openCreateModal" variant="primary">
        <Plus :size="18" :stroke-width="2" class="mr-2" />
        Crear Producto
      </BaseButton>
    </div>

    <!-- Productos List -->
    <div v-else class="space-y-3">
      <div
        v-for="producto in productos"
        :key="producto.id || Math.random()"
        :class="[
          'group rounded-lg border p-4 shadow-sm transition-all hover:shadow-md',
          'bg-blue-50/50 border-blue-100 hover:border-blue-200',
          producto.actualizado_recientemente ? 'producto-card-updated' : '',
        ]"
      >
        <div
          v-if="producto.actualizado_recientemente"
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
                  v-if="getImageUrl(producto.imagen)"
                  :src="getImageUrl(producto.imagen) || ''"
                  :alt="producto.nombre"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-[var(--text-200)]"
                >
                  <Apple :size="24" :stroke-width="1.5" />
                </div>
              </div>
              <div class="min-w-0">
                <h3 class="font-semibold text-[var(--text-100)] line-clamp-1">
                  {{ producto.nombre }}
                </h3>
                <p class="text-xs text-[var(--text-200)]">
                  Se vende en: {{ getUnidadLabel(producto.se_vende_en_unidad_medida) }}
                </p>
                <p class="text-xs text-[var(--text-200)]">
                  Se compra en: {{ getUnidadLabel(producto.se_pide_en_unidad_medida) }}
                </p>
              </div>
            </div>

            <div class="flex gap-2 flex-shrink-0">
              <BaseButton @click="openEditModal(producto)" variant="secondary" size="sm">
                <Edit :size="16" :stroke-width="2" />
              </BaseButton>
              <BaseButton @click="handleDelete(producto)" variant="danger" size="sm">
                <Trash2 :size="16" :stroke-width="2" />
              </BaseButton>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="hasValue(producto.precio_compra)"
              class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
            >
              Compra: {{ formatCurrency(producto.precio_compra) }} (por
              {{ getUnidadLabel(producto.se_pide_en_unidad_medida) }})
            </span>
            <span
              v-if="hasValue(producto.precio_compra_unitario)"
              class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
            >
              Compra: {{ formatCurrency(producto.precio_compra_unitario) }} (por
              {{ getUnidadLabel(producto.se_vende_en_unidad_medida) }})
            </span>
            <span
              v-if="hasValue(producto.ganancia_porcentaje)"
              class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
            >
              Ganancia: {{ producto.ganancia_porcentaje }}%
            </span>
            <span
              class="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-900 shadow-sm"
            >
              Venta: {{ formatCurrency(producto.precio_venta) }} (por
              {{ getUnidadLabel(producto.se_vende_en_unidad_medida) }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && productos.length > 0" class="mt-6">
      <BasePagination
        :total="totalCount"
        :limit="LIMIT"
        :offset="offset"
        @update:offset="
          (newOffset) => {
            offset = newOffset
            loadProductos()
          }
        "
      />
    </div>

    <!-- Modal -->
    <BaseModal
      :show="showModal"
      :title="modalMode === 'create' ? 'Crear Producto' : 'Editar Producto'"
      size="lg"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Image Upload -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-2"> Imagen </label>
          <div
            v-if="!imagePreview"
            class="relative flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--bg-300)] p-6 hover:border-[var(--primary-100)] transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              class="absolute inset-0 cursor-pointer opacity-0"
            />
            <div class="text-center">
              <ImageIcon
                :size="32"
                class="mx-auto text-[var(--text-200)] mb-2"
                :stroke-width="1.5"
              />
              <p class="text-sm text-[var(--text-100)]">Sube una imagen</p>
              <p class="text-xs text-[var(--text-200)]">PNG, JPG, GIF</p>
            </div>
          </div>
          <div v-else class="relative rounded-lg overflow-hidden">
            <img
              :src="getImageUrl(imagePreview) || ''"
              :alt="formData.nombre"
              class="h-48 w-full object-cover rounded-lg"
            />
            <button
              type="button"
              @click="
                () => {
                  imagePreview = null
                  selectedFile = null
                }
              "
              class="absolute top-2 right-2 rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700 transition-colors"
            >
              <Trash2 :size="16" :stroke-width="2" />
            </button>
          </div>
        </div>

        <!-- Nombre -->
        <BaseInput
          v-model="formData.nombre"
          label="Nombre del Producto"
          placeholder="Ej: Tomate Cherry"
          :required="true"
          :error="formErrors.nombre"
        />

        <!-- Unidad de Medida de Venta -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-1">
            Unidad en la que se <b>vende</b> el producto <span class="text-red-600">*</span>
          </label>
          <select
            v-model="formData.se_vende_en_unidad_medida"
            class="block w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
          >
            <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad.value" :value="unidad.value">
              {{ unidad.label }}
            </option>
          </select>
          <p class="mt-1 text-xs text-[var(--text-200)]">
            Los precios de venta serán por esta unidad.
          </p>
        </div>

        <!-- Unidad de Medida de Compra -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-1">
            Unidad en la que se <b>compra</b> el producto <span class="text-red-600">*</span>
          </label>
          <select
            v-model="formData.se_pide_en_unidad_medida"
            class="block w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
          >
            <option v-for="unidad in UNIDADES_MEDIDA" :key="unidad.value" :value="unidad.value">
              {{ unidad.label }}
            </option>
          </select>
          <p class="mt-1 text-xs text-[var(--text-200)]">
            La unidad en la que el proveedor entrega el producto.
          </p>
        </div>

        <!-- Factor de conversión -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-100)] mb-1">
            ¿Cuántos {{ getUnidadLabel(formData.se_vende_en_unidad_medida) }} hay en un(a)
            {{ getUnidadLabel(formData.se_pide_en_unidad_medida) }}?
          </label>
          <input
            v-model="formData.factor_division"
            type="number"
            min="1"
            step="1"
            placeholder="1"
            class="block w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
          />
          <p class="mt-1 text-xs text-[var(--text-200)]">
            Ejemplo: Si compras un(a) {{ getUnidadLabel(formData.se_pide_en_unidad_medida) }} que
            contiene 10 {{ getUnidadLabel(formData.se_vende_en_unidad_medida) }}, escribe 10.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-[var(--text-100)] mb-1">
              Precio de Compra (por {{ getUnidadAbreviatura(formData.se_pide_en_unidad_medida) }})
            </label>
            <input
              v-model="formData.precio_compra"
              type="number"
              step="0.01"
              placeholder="100.00"
              class="block w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-100)] mb-1">
              Ganancia (%)
            </label>
            <select
              v-model="gananciaPreset"
              @change="handleGananciaPresetChange"
              class="block w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
            >
              <option value="manual">Ganancia manual</option>
              <option v-for="preset in GANANCIA_PRESETS" :key="preset" :value="preset">
                {{ preset }}%
              </option>
            </select>
            <input
              v-if="gananciaPreset === 'manual'"
              v-model="formData.ganancia_porcentaje"
              type="number"
              placeholder="0"
              class="mt-2 block w-full rounded-lg border border-[var(--bg-300)] bg-white px-3 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
            />
          </div>
        </div>

        <div
          v-if="modalMode === 'edit'"
          class="rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-4 py-3"
        >
          <p class="text-sm text-[var(--text-200)]">
            Precio de venta (por
            {{ getUnidadAbreviatura(selectedProducto?.se_vende_en_unidad_medida) }})
          </p>
          <p class="text-lg font-semibold text-[var(--text-100)]">
            {{ formatCurrency(selectedProducto?.precio_venta) }}
          </p>
        </div>
      </form>

      <template #footer>
        <BaseButton @click="closeModal" variant="secondary"> Cancelar </BaseButton>
        <BaseButton @click="handleSubmit" variant="primary" :loading="loading">
          {{ modalMode === 'create' ? 'Crear' : 'Guardar' }}
        </BaseButton>
      </template>
    </BaseModal>
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
