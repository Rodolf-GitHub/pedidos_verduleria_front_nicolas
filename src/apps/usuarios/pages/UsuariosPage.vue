<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Trash2, Search, Plus, Edit, Check, X, Users } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import { useNotification } from '@/composables/useNotification'
import { fetchWithBaseUrl } from '@/utils/fetchWithBaseUrl'
import {
  usuariosApiListarUsuarios,
  usuariosApiObtenerUsuario,
  usuariosApiAsignarNegocioAUsuario,
  usuariosApiQuitarNegocioDeUsuario,
  usuariosApiRegisterUsuario,
  usuariosApiActualizarUsuario,
  usuariosApiEliminarUsuario,
} from '@/apps/usuarios/api'
import type {
  UsuarioSchema,
  UsuarioAsignarNegocioSchema,
  UsuarioQuitarNegocioSchema,
  UsuarioCreateSchema,
  UsuarioCambiarContraseASchema,
} from '@/apps/usuarios/api/schemas'
import { negocioApiListarNegocios } from '@/apps/negocios/api'
import type { NegocioSchema } from '@/apps/negocios/api/schemas'

const router = useRouter()
const { success: showSuccess, error: showError } = useNotification()

const usuarios = ref<UsuarioSchema[]>([])
const usuarioSeleccionado = ref<UsuarioSchema | null>(null)
const loading = ref(true)
const error = ref('')
const busqueda = ref('')
const page = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const showDetallesModal = ref(false)
const negocios = ref<NegocioSchema[]>([])
const negocioSeleccionadoAgregar = ref<number | null>(null)
const isAsigningNegocio = ref(false)
const isRemovingNegocio = ref(false)
const showCrearUsuarioModal = ref(false)
const isCreatingUsuario = ref(false)
const formCrearUsuario = ref<{
  nombre: string
  contraseña: string
  rol: 'verdulero' | 'admin' | 'comprador'
}>({
  nombre: '',
  contraseña: '',
  rol: 'verdulero',
})
const showCambiarContrasenaModal = ref(false)
const isChangingContrasena = ref(false)
const usuarioContrasena = ref<UsuarioSchema | null>(null)
const formCambiarContrasena = ref({
  nueva_contraseña: '',
})

const showEditarUsuarioModal = ref(false)
const isEditingUsuario = ref(false)
const isDeletingUsuario = ref(false)
const formEditarUsuario = ref<{
  nombre: string
  contraseña: string
  rol: 'verdulero' | 'admin' | 'comprador'
}>({
  nombre: '',
  contraseña: '',
  rol: 'verdulero',
})

const isAdminRole = (rol: string | null | undefined) => rol === 'admin'

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
})

const getItemsFromResponse = (data: any) => {
  return data?.items ?? data?.results ?? data?.data?.items ?? data?.data?.results ?? []
}

const usuariosFiltrados = computed(() => {
  if (!busqueda.value.trim()) return usuarios.value
  return usuarios.value.filter(
    (u) =>
      u.nombre?.toLowerCase().includes(busqueda.value.toLowerCase()) ||
      u.rol?.toLowerCase().includes(busqueda.value.toLowerCase()),
  )
})

const cargarUsuarios = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await usuariosApiListarUsuarios(
      {
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
      },
      { headers: getAuthHeaders() },
    )

    if (response.status === 200) {
      usuarios.value = getItemsFromResponse(response.data)
      totalItems.value = response.data?.count || 0
    }
  } catch (err) {
    console.error('Error al cargar usuarios:', err)
    error.value = 'No se pudieron cargar los usuarios'
  } finally {
    loading.value = false
  }
}

const abrirDetalles = async (usuario: UsuarioSchema) => {
  try {
    if (usuario.id) {
      const response = await usuariosApiObtenerUsuario(usuario.id, {
        headers: getAuthHeaders(),
      })
      if (response.status === 200) {
        usuarioSeleccionado.value = response.data
        showDetallesModal.value = true
      }
    }
  } catch (err) {
    console.error('Error al obtener usuario:', err)
    showError('No se pudo cargar los detalles del usuario')
  }
}

const cerrarDetalles = () => {
  showDetallesModal.value = false
  usuarioSeleccionado.value = null
}

const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const irPaginaAnterior = () => {
  if (page.value > 1) {
    page.value--
    cargarUsuarios()
  }
}

const irPaginaSiguiente = () => {
  if (page.value < totalPages.value) {
    page.value++
    cargarUsuarios()
  }
}

const handleOffsetUpdate = (newOffset: number) => {
  const nextPage = Math.floor(newOffset / pageSize.value) + 1
  if (nextPage !== page.value) {
    page.value = nextPage
    cargarUsuarios()
  }
}

const cargarNegocios = async () => {
  try {
    const response = await negocioApiListarNegocios(
      { limit: 100, offset: 0 },
      { headers: getAuthHeaders() },
    )
    if (response.status === 200) {
      negocios.value = getItemsFromResponse(response.data)
    }
  } catch (err) {
    console.error('Error al cargar negocios:', err)
  }
}

const negociosDisponibles = computed(() => {
  if (!usuarioSeleccionado.value?.negocios) return negocios.value
  const negocioIds = new Set(usuarioSeleccionado.value.negocios.map((n) => n.id))
  return negocios.value.filter((n) => !negocioIds.has(n.id))
})

const handleAsignarNegocio = async () => {
  if (!usuarioSeleccionado.value?.id || !negocioSeleccionadoAgregar.value) {
    showError('Debe seleccionar un negocio')
    return
  }

  isAsigningNegocio.value = true
  try {
    const payload: UsuarioAsignarNegocioSchema = {
      negocio_id: negocioSeleccionadoAgregar.value,
    }
    const response = await usuariosApiAsignarNegocioAUsuario(
      usuarioSeleccionado.value.id,
      payload,
      { headers: getAuthHeaders() },
    )
    if (response.status === 200) {
      showSuccess('Negocio asignado correctamente')
      usuarioSeleccionado.value = response.data
      negocioSeleccionadoAgregar.value = null
    }
  } catch (err: any) {
    const errorMsg = err?.data?.detail || err?.message || 'Error al asignar negocio'
    showError(errorMsg)
  } finally {
    isAsigningNegocio.value = false
  }
}

const handleQuitarNegocio = async (negocioId: number | undefined) => {
  if (!usuarioSeleccionado.value?.id || !negocioId) {
    showError('Error al quitar negocio')
    return
  }

  if (!confirm('¿Está seguro de que desea quitar este negocio del usuario?')) return

  isRemovingNegocio.value = true
  try {
    const payload: UsuarioQuitarNegocioSchema = {
      negocio_id: negocioId,
    }
    const response = await usuariosApiQuitarNegocioDeUsuario(
      usuarioSeleccionado.value.id,
      payload,
      { headers: getAuthHeaders() },
    )
    if (response.status === 200) {
      showSuccess('Negocio removido correctamente')
      usuarioSeleccionado.value = response.data
    }
  } catch (err: any) {
    const errorMsg = err?.data?.detail || err?.message || 'Error al quitar negocio'
    showError(errorMsg)
  } finally {
    isRemovingNegocio.value = false
  }
}

const abrirCrearUsuarioModal = () => {
  formCrearUsuario.value = {
    nombre: '',
    contraseña: '',
    rol: 'verdulero',
  }
  showCrearUsuarioModal.value = true
}

const cerrarCrearUsuarioModal = () => {
  showCrearUsuarioModal.value = false
  formCrearUsuario.value = {
    nombre: '',
    contraseña: '',
    rol: 'verdulero',
  }
}

const abrirCambiarContrasenaModal = (usuario: UsuarioSchema) => {
  usuarioContrasena.value = usuario
  formCambiarContrasena.value = { nueva_contraseña: '' }
  showCambiarContrasenaModal.value = true
}

const cerrarCambiarContrasenaModal = () => {
  showCambiarContrasenaModal.value = false
  usuarioContrasena.value = null
  formCambiarContrasena.value = { nueva_contraseña: '' }
}

const handleCambiarContrasenaAdmin = async () => {
  if (!formCambiarContrasena.value.nueva_contraseña.trim()) {
    showError('La nueva contraseña es obligatoria')
    return
  }

  isChangingContrasena.value = true
  try {
    const payload: UsuarioCambiarContraseASchema = {
      nueva_contraseña: formCambiarContrasena.value.nueva_contraseña,
    }
    const response = await fetchWithBaseUrl('/api/usuarios/actualizar_contrasena_admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    if (response.ok) {
      showSuccess('Contraseña actualizada correctamente')
      cerrarCambiarContrasenaModal()
    }
  } catch (err: any) {
    const errorMsg = err?.data?.detail || err?.message || 'Error al actualizar contraseña'
    showError(errorMsg)
  } finally {
    isChangingContrasena.value = false
  }
}

const handleCrearUsuario = async () => {
  if (!formCrearUsuario.value.nombre.trim()) {
    showError('El nombre es obligatorio')
    return
  }
  if (!formCrearUsuario.value.contraseña.trim()) {
    showError('La contraseña es obligatoria')
    return
  }

  isCreatingUsuario.value = true
  try {
    const payload: UsuarioCreateSchema = {
      nombre: formCrearUsuario.value.nombre,
      contraseña: formCrearUsuario.value.contraseña,
      rol: formCrearUsuario.value.rol,
    }
    const response = await usuariosApiRegisterUsuario(payload, {
      headers: getAuthHeaders(),
    })
    if (response.status === 200) {
      showSuccess('Usuario creado correctamente')
      cerrarCrearUsuarioModal()
      await cargarUsuarios()
    }
  } catch (err: any) {
    const errorMsg = err?.data?.detail || err?.message || 'Error al crear usuario'
    showError(errorMsg)
  } finally {
    isCreatingUsuario.value = false
  }
}

const abrirEditarUsuarioModal = () => {
  if (!usuarioSeleccionado.value) return
  formEditarUsuario.value = {
    nombre: usuarioSeleccionado.value.nombre,
    contraseña: '',
    rol: (usuarioSeleccionado.value?.rol || 'verdulero') as 'verdulero' | 'admin' | 'comprador',
  }
  showEditarUsuarioModal.value = true
}

const cerrarEditarUsuarioModal = () => {
  showEditarUsuarioModal.value = false
  formEditarUsuario.value = {
    nombre: '',
    contraseña: '',
    rol: 'verdulero',
  }
}

const handleActualizarUsuario = async () => {
  if (!usuarioSeleccionado.value?.id) {
    showError('Error: Usuario no válido')
    return
  }
  if (!formEditarUsuario.value.nombre.trim()) {
    showError('El nombre es obligatorio')
    return
  }

  isEditingUsuario.value = true
  try {
    const payload: UsuarioCreateSchema = {
      nombre: formEditarUsuario.value.nombre,
      contraseña: formEditarUsuario.value.contraseña || '',
      rol: formEditarUsuario.value.rol,
    }
    const response = await usuariosApiActualizarUsuario(usuarioSeleccionado.value.id, payload, {
      headers: getAuthHeaders(),
    })
    if (response.status === 200) {
      showSuccess('Usuario actualizado correctamente')
      usuarioSeleccionado.value = response.data
      cerrarEditarUsuarioModal()
      await cargarUsuarios()
    }
  } catch (err: any) {
    const errorMsg = err?.data?.detail || err?.message || 'Error al actualizar usuario'
    showError(errorMsg)
  } finally {
    isEditingUsuario.value = false
  }
}

const handleEliminarUsuario = async (usuario?: UsuarioSchema) => {
  const targetUsuario = usuario ?? usuarioSeleccionado.value
  if (!targetUsuario?.id) {
    showError('Error: Usuario no válido')
    return
  }

  if (
    !confirm(
      `¿Está seguro de que desea eliminar a ${targetUsuario.nombre}? Esta acción no se puede deshacer.`,
    )
  )
    return

  isDeletingUsuario.value = true
  try {
    const response = await usuariosApiEliminarUsuario(targetUsuario.id, {
      headers: getAuthHeaders(),
    })
    if (response.status === 200) {
      showSuccess('Usuario eliminado correctamente')
      if (showDetallesModal.value) {
        cerrarDetalles()
      } else if (usuarioSeleccionado.value?.id === targetUsuario.id) {
        usuarioSeleccionado.value = null
      }
      await cargarUsuarios()
    }
  } catch (err: any) {
    const errorMsg = err?.data?.detail || err?.message || 'Error al eliminar usuario'
    showError(errorMsg)
  } finally {
    isDeletingUsuario.value = false
  }
}

onMounted(() => {
  cargarNegocios()
  cargarUsuarios()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text-100)]">Usuarios</h1>
        <p class="mt-1 text-sm text-[var(--text-200)]">Gestiona los usuarios del sistema</p>
      </div>
      <BaseButton variant="primary" size="md" @click="abrirCrearUsuarioModal">
        <Plus :size="18" class="mr-2" />
        Agregar Usuario
      </BaseButton>
    </div>

    <!-- Loading/Error States -->
    <div v-if="loading" class="rounded-lg bg-white p-8 text-center shadow-sm">
      <p class="text-[var(--text-200)]">Cargando usuarios...</p>
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-700 shadow-sm">
      {{ error }}
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-3 h-5 w-5 text-[var(--text-200)]" />
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por email, nombre o apellido..."
          class="w-full rounded-lg border border-[var(--bg-300)] bg-white py-2 pl-10 pr-4 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
        />
      </div>

      <!-- Users Table / Cards -->
      <div
        v-if="usuariosFiltrados.length === 0"
        class="rounded-lg bg-white p-8 text-center shadow-sm"
      >
        <Users :size="48" class="mx-auto mb-3 text-[var(--text-200)]" />
        <p class="text-[var(--text-200)]">No hay usuarios</p>
      </div>

      <!-- Desktop Table View -->
      <div
        v-else
        class="hidden rounded-lg border border-[var(--bg-300)] bg-white shadow-sm md:block"
      >
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-[var(--bg-300)] bg-[var(--bg-100)]">
                <th class="px-6 py-3 text-left text-sm font-semibold text-[var(--text-100)]">
                  Nombre
                </th>
                <th class="px-6 py-3 text-left text-sm font-semibold text-[var(--text-100)]">
                  Rol
                </th>
                <th class="px-6 py-3 text-left text-sm font-semibold text-[var(--text-100)]">
                  Negocios
                </th>
                <th class="px-6 py-3 text-right text-sm font-semibold text-[var(--text-100)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="usuario in usuariosFiltrados"
                :key="usuario.id!"
                class="border-b border-[var(--bg-300)] transition-colors hover:bg-[var(--bg-100)]"
              >
                <td class="px-6 py-4 text-sm text-[var(--text-100)]">
                  {{ usuario.nombre }}
                </td>
                <td class="px-6 py-4 text-sm">
                  <span
                    :class="[
                      'inline-block px-3 py-1 rounded-full text-xs font-medium capitalize',
                      isAdminRole(usuario.rol)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700',
                    ]"
                  >
                    {{ usuario.rol }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-[var(--text-100)]">
                  {{ usuario.negocios?.length || 0 }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="abrirDetalles(usuario)"
                    class="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200 transition-colors"
                    title="Ver detalles"
                  >
                    <Edit :size="18" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Card View -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="usuario in usuariosFiltrados"
          :key="usuario.id!"
          class="rounded-lg border border-[var(--bg-300)] bg-white p-4 shadow-sm"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <p class="font-semibold text-[var(--text-100)]">
                {{ usuario.nombre }}
              </p>
            </div>
            <span
              :class="[
                'inline-block px-3 py-1 rounded-full text-xs font-medium capitalize',
                isAdminRole(usuario.rol) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
              ]"
            >
              {{ usuario.rol }}
            </span>
          </div>
          <p class="mb-3 text-sm text-[var(--text-200)]">
            Negocios: {{ usuario.negocios?.length || 0 }}
          </p>
          <button
            @click="abrirDetalles(usuario)"
            class="w-full rounded-lg bg-blue-100 py-2 text-blue-600 hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            Ver Detalles
          </button>
          <button
            @click="handleEliminarUsuario(usuario)"
            class="mt-2 w-full rounded-lg bg-red-100 py-2 text-red-700 hover:bg-red-200 transition-colors text-sm font-medium"
          >
            Eliminar
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <BasePagination
        :total="totalItems"
        :limit="pageSize"
        :offset="(page - 1) * pageSize"
        @update:offset="handleOffsetUpdate"
      />
    </div>

    <!-- Modal Detalles Usuario -->
    <BaseModal
      :show="showDetallesModal"
      :title="usuarioSeleccionado?.nombre || 'Detalles del Usuario'"
      @close="cerrarDetalles"
    >
      <div v-if="usuarioSeleccionado" class="space-y-4">
        <!-- Nombre -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">Nombre</label>
          <div class="rounded-lg bg-[var(--bg-100)] px-4 py-2 text-[var(--text-100)]">
            {{ usuarioSeleccionado.nombre }}
          </div>
        </div>

        <!-- Rol -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">Rol</label>
          <div class="rounded-lg bg-[var(--bg-100)] px-4 py-2">
            <span
              :class="[
                'inline-block px-3 py-1 rounded-full text-xs font-medium capitalize',
                isAdminRole(usuarioSeleccionado.rol)
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700',
              ]"
            >
              {{ usuarioSeleccionado.rol }}
            </span>
          </div>
        </div>

        <!-- Negocios Asignados -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Negocios Asignados</label
          >
          <div
            v-if="usuarioSeleccionado.negocios && usuarioSeleccionado.negocios.length > 0"
            class="space-y-2 mb-3"
          >
            <div
              v-for="negocio in usuarioSeleccionado.negocios"
              :key="negocio.id!"
              class="flex items-center justify-between rounded-lg bg-[var(--bg-100)] px-4 py-2"
            >
              <span class="text-[var(--text-100)]">{{ negocio.nombre }}</span>
              <button
                @click="handleQuitarNegocio(negocio.id || 0)"
                :disabled="isRemovingNegocio"
                class="rounded-lg bg-red-100 p-1 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                title="Quitar negocio"
              >
                <X :size="16" />
              </button>
            </div>
          </div>
          <div v-else class="rounded-lg bg-[var(--bg-100)] px-4 py-2 text-[var(--text-200)] mb-3">
            No tiene negocios asignados
          </div>

          <!-- Agregar Negocio -->
          <div class="space-y-2 border-t border-[var(--bg-300)] pt-3">
            <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
              >Agregar Negocio</label
            >
            <div class="flex gap-2">
              <select
                v-model.number="negocioSeleccionadoAgregar"
                class="flex-1 rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
              >
                <option :value="null">Seleccionar negocio...</option>
                <option
                  v-for="negocio in negociosDisponibles"
                  :key="negocio.id!"
                  :value="negocio.id"
                >
                  {{ negocio.nombre }}
                </option>
              </select>
              <BaseButton
                variant="success"
                size="md"
                @click="handleAsignarNegocio"
                :loading="isAsigningNegocio"
                :disabled="!negocioSeleccionadoAgregar"
              >
                <Plus :size="18" />
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between items-center">
          <BaseButton
            variant="danger"
            size="md"
            @click="handleEliminarUsuario"
            :loading="isDeletingUsuario"
          >
            <Trash2 :size="18" />
            Eliminar Usuario
          </BaseButton>
          <div class="flex justify-end gap-2">
            <BaseButton variant="secondary" size="md" @click="cerrarDetalles"> Cerrar </BaseButton>
            <BaseButton variant="primary" size="md" @click="abrirEditarUsuarioModal">
              Editar
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Crear Usuario -->
    <BaseModal
      :show="showCrearUsuarioModal"
      title="Crear Nuevo Usuario"
      @close="cerrarCrearUsuarioModal"
    >
      <div class="space-y-4">
        <!-- Nombre -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Nombre <span class="text-red-500">*</span></label
          >
          <input
            v-model="formCrearUsuario.nombre"
            type="text"
            placeholder="Nombre del usuario"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <!-- Contraseña -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Contraseña <span class="text-red-500">*</span></label
          >
          <input
            v-model="formCrearUsuario.contraseña"
            type="password"
            placeholder="Contraseña del usuario"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <!-- Rol -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Rol <span class="text-red-500">*</span></label
          >
          <select
            v-model="formCrearUsuario.rol"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option value="admin">Administrador</option>
            <option value="verdulero">Verdulero</option>
            <option value="comprador">Comprador</option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <BaseButton variant="secondary" size="md" @click="cerrarCrearUsuarioModal">
            Cancelar
          </BaseButton>
          <BaseButton
            variant="primary"
            size="md"
            @click="handleCrearUsuario"
            :loading="isCreatingUsuario"
          >
            Crear Usuario
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Editar Usuario -->
    <BaseModal
      :show="showEditarUsuarioModal"
      title="Editar Usuario"
      @close="cerrarEditarUsuarioModal"
    >
      <div class="space-y-4">
        <!-- Nombre -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Nombre <span class="text-red-500">*</span></label
          >
          <input
            v-model="formEditarUsuario.nombre"
            type="text"
            placeholder="Nombre del usuario"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <!-- Contraseña (opcional) -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Nueva Contraseña
            <span class="text-xs text-[var(--text-200)]">(dejar vacío para no cambiar)</span></label
          >
          <input
            v-model="formEditarUsuario.contraseña"
            type="password"
            placeholder="Dejar vacío para mantener la actual"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>

        <!-- Rol -->
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]"
            >Rol <span class="text-red-500">*</span></label
          >
          <select
            v-model="formEditarUsuario.rol"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            <option value="admin">Administrador</option>
            <option value="verdulero">Verdulero</option>
            <option value="comprador">Comprador</option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <BaseButton variant="secondary" size="md" @click="cerrarEditarUsuarioModal">
            Cancelar
          </BaseButton>
          <BaseButton
            variant="primary"
            size="md"
            @click="handleActualizarUsuario"
            :loading="isEditingUsuario"
          >
            Guardar Cambios
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal Cambiar Contraseña Admin -->
    <BaseModal
      :show="showCambiarContrasenaModal"
      :title="
        usuarioContrasena?.nombre
          ? `Cambiar contraseña: ${usuarioContrasena.nombre}`
          : 'Cambiar contraseña'
      "
      @close="cerrarCambiarContrasenaModal"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--text-100)]">
            Nueva Contraseña <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formCambiarContrasena.nueva_contraseña"
            type="password"
            placeholder="Nueva contraseña"
            class="w-full rounded-lg border border-[var(--bg-300)] bg-white px-4 py-2 text-[var(--text-100)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <BaseButton variant="secondary" size="md" @click="cerrarCambiarContrasenaModal">
            Cancelar
          </BaseButton>
          <BaseButton
            variant="primary"
            size="md"
            @click="handleCambiarContrasenaAdmin"
            :loading="isChangingContrasena"
          >
            Guardar
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped></style>
