<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Edit, Trash2, Search, Store } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BasePagination from '@/components/BasePagination.vue'
import {
  negocioApiListarNegocios,
  negocioApiCrearNegocio,
  negocioApiActualizarNegocio,
  negocioApiEliminarNegocio,
} from '@/apps/negocios/api'
import type {
  NegocioSchema,
  NegocioCreateSchema,
  NegocioUpdateSchema,
} from '@/apps/negocios/api/schemas'

const LIMIT = 10

const negocios = ref<NegocioSchema[]>([])
const totalCount = ref(0)
const loading = ref(false)
const busqueda = ref('')
const offset = ref(0)
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedNegocio = ref<NegocioSchema | null>(null)

const formData = ref({
  nombre: '',
  direccion: '',
})

const formErrors = ref({
  nombre: '',
  direccion: '',
})

const loadNegocios = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    const response = await negocioApiListarNegocios(
      { busqueda: busqueda.value || undefined, limit: LIMIT, offset: offset.value },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 200) {
      negocios.value = response.data.items
      totalCount.value = response.data.count
    }
  } catch (error) {
    console.error('Error al cargar negocios:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  modalMode.value = 'create'
  selectedNegocio.value = null
  formData.value = {
    nombre: '',
    direccion: '',
  }
  formErrors.value = {
    nombre: '',
    direccion: '',
  }
  showModal.value = true
}

const openEditModal = (negocio: NegocioSchema) => {
  modalMode.value = 'edit'
  selectedNegocio.value = negocio
  formData.value = {
    nombre: negocio.nombre,
    direccion: negocio.direccion || '',
  }
  formErrors.value = {
    nombre: '',
    direccion: '',
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedNegocio.value = null
  formData.value = {
    nombre: '',
    direccion: '',
  }
}

const validateForm = () => {
  let isValid = true
  formErrors.value = {
    nombre: '',
    direccion: '',
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
      const createData: NegocioCreateSchema = {
        nombre: formData.value.nombre,
        direccion: formData.value.direccion || null,
      }

      await negocioApiCrearNegocio(createData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } else {
      const updateData: NegocioUpdateSchema = {
        nombre: formData.value.nombre,
        direccion: formData.value.direccion || null,
      }

      await negocioApiActualizarNegocio(selectedNegocio.value!.id!, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }

    closeModal()
    await loadNegocios()
  } catch (error) {
    console.error('Error al guardar negocio:', error)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (negocio: NegocioSchema) => {
  if (!confirm(`¿Estás seguro de eliminar el negocio "${negocio.nombre}"?`)) return

  loading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    await negocioApiEliminarNegocio(negocio.id!, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    await loadNegocios()
  } catch (error) {
    console.error('Error al eliminar negocio:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadNegocios()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-100)]">Negocios</h1>
        <p class="mt-1 text-sm text-[var(--text-200)]">Gestiona los negocios del sistema</p>
      </div>
      <BaseButton @click="openCreateModal" variant="primary">
        <Plus :size="18" :stroke-width="2" class="mr-2" />
        Nuevo Negocio
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
              loadNegocios()
            }
          "
          type="text"
          placeholder="Buscar negocios..."
          class="block w-full rounded-lg border border-[var(--bg-300)] bg-white py-2.5 pl-10 pr-3 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && negocios.length === 0" class="text-center py-12">
      <div
        class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--primary-100)] border-r-transparent"
      ></div>
      <p class="mt-2 text-sm text-[var(--text-200)]">Cargando negocios...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && negocios.length === 0"
      class="text-center py-12 bg-white rounded-lg border border-[var(--bg-300)]"
    >
      <Store :size="48" class="mx-auto text-[var(--text-200)] mb-4" :stroke-width="1.5" />
      <h3 class="text-lg font-medium text-[var(--text-100)] mb-2">No hay negocios registrados</h3>
      <p class="text-sm text-[var(--text-200)] mb-4">Comienza creando tu primer negocio</p>
      <BaseButton @click="openCreateModal" variant="primary">
        <Plus :size="18" :stroke-width="2" class="mr-2" />
        Crear Negocio
      </BaseButton>
    </div>

    <!-- Negocios Grid -->
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="negocio in negocios"
        :key="negocio.id || Math.random()"
        class="group relative rounded-lg border border-[var(--bg-300)] bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[var(--primary-100)]"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <div class="rounded-full bg-[var(--primary-100)] p-2.5">
                <Store :size="20" class="text-white" :stroke-width="2" />
              </div>
              <h3 class="text-lg font-semibold text-[var(--text-100)]">
                {{ negocio.nombre }}
              </h3>
            </div>
            <p v-if="negocio.direccion" class="text-sm text-[var(--text-200)] mb-4">
              📍 {{ negocio.direccion }}
            </p>
            <p v-else class="text-sm text-[var(--text-200)] italic mb-4">Sin dirección</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <BaseButton @click="openEditModal(negocio)" variant="secondary" size="sm" class="flex-1">
            <Edit :size="16" :stroke-width="2" class="mr-1.5" />
            Editar
          </BaseButton>
          <BaseButton @click="handleDelete(negocio)" variant="danger" size="sm">
            <Trash2 :size="16" :stroke-width="2" />
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && negocios.length > 0" class="mt-6">
      <BasePagination
        :total="totalCount"
        :limit="LIMIT"
        :offset="offset"
        @update:offset="
          (newOffset) => {
            offset = newOffset
            loadNegocios()
          }
        "
      />
    </div>

    <!-- Modal -->
    <BaseModal
      :show="showModal"
      :title="modalMode === 'create' ? 'Crear Negocio' : 'Editar Negocio'"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput
          v-model="formData.nombre"
          label="Nombre del Negocio"
          placeholder="Ej: Verdulería Central"
          :required="true"
          :error="formErrors.nombre"
        />

        <BaseInput
          v-model="formData.direccion"
          label="Dirección"
          placeholder="Ej: Calle Principal 123"
          :error="formErrors.direccion"
        />
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

<style scoped></style>
