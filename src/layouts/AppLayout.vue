<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Menu,
  ShoppingCart,
  CalendarDays,
  Package,
  Store,
  User,
  LogOut,
  UserCircle,
  Users,
  HelpCircle,
} from 'lucide-vue-next'

const router = useRouter()
const sidebarOpen = ref(false)
const userMenuOpen = ref(false)

const userName = ref(localStorage.getItem('user_name') || 'Usuario')
const userRole = ref(localStorage.getItem('user_role') || 'usuario')

const isAdminRole = () => userRole.value === 'admin'
const isVerdulero = () => userRole.value === 'verdulero'

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
}

const closeSidebarOnMobile = () => {
  if (window.innerWidth < 1024) {
    sidebarOpen.value = false
  }
}

const handleLogout = () => {
  localStorage.removeItem('auth_token')
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-100)]">
    <!-- Navbar -->
    <nav
      class="fixed top-0 z-50 w-full border-b border-[var(--bg-300)] bg-gradient-to-r from-[var(--primary-100)] to-[var(--primary-200)] shadow-md"
    >
      <div class="px-2 py-3 sm:px-3 lg:px-5 lg:pl-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center justify-start rtl:justify-end">
            <button
              @click="toggleSidebar"
              type="button"
              class="inline-flex items-center rounded-lg p-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 lg:hidden"
            >
              <span class="sr-only">Open sidebar</span>
              <Menu :size="24" />
            </button>
            <RouterLink to="/ayuda" class="ms-2 flex md:me-24">
              <span
                class="self-center whitespace-nowrap text-lg sm:text-xl font-bold text-white md:text-2xl"
                >🥬 Verdulería</span
              >
            </RouterLink>
          </div>
          <div class="flex items-center">
            <div class="ms-3 flex items-center relative">
              <div>
                <button
                  @click="toggleUserMenu"
                  type="button"
                  class="flex rounded-full bg-white/20 p-1 text-sm hover:bg-white/30 focus:ring-4 focus:ring-white/30 transition-all"
                  aria-expanded="false"
                >
                  <span class="sr-only">Open user menu</span>
                  <div
                    class="h-8 w-8 rounded-full bg-white text-[var(--primary-100)] flex items-center justify-center font-semibold"
                  >
                    <User :size="20" />
                  </div>
                </button>

                <!-- Dropdown menu -->
                <div
                  v-if="userMenuOpen"
                  class="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                >
                  <div class="py-1">
                    <div class="px-4 py-3 border-b border-[var(--bg-300)]">
                      <p class="text-sm font-semibold text-[var(--text-100)]">{{ userName }}</p>
                      <p class="text-xs text-[var(--text-200)] capitalize">{{ userRole }}</p>
                    </div>
                    <a
                      href="#"
                      class="flex items-center px-4 py-2 text-sm text-[var(--text-100)] hover:bg-[var(--bg-200)] transition-colors"
                    >
                      <UserCircle class="mr-3 h-5 w-5 text-[var(--text-200)]" :stroke-width="2" />
                      Mi Perfil
                    </a>
                    <hr class="my-1 border-[var(--bg-300)]" />
                    <button
                      @click="handleLogout"
                      class="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut class="mr-3 h-5 w-5" :stroke-width="2" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed left-0 top-0 z-40 h-screen w-64 border-r border-[var(--bg-300)] bg-white pt-20 transition-transform shadow-lg',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <div class="h-full overflow-y-auto bg-gradient-to-b from-white to-[var(--bg-100)] px-3 pb-4">
        <ul class="space-y-2 font-medium">
          <li v-if="isAdminRole()">
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/usuarios"
              class="flex items-start gap-3 rounded-lg p-3 text-[var(--text-100)] hover:bg-purple-100 hover:text-white transition-all group"
              active-class="bg-purple-500 text-white shadow-md"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 group-hover:bg-white/20 group-hover:text-white"
              >
                <Users class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Usuarios</span>
                <span class="text-xs text-[var(--text-200)] group-hover:text-white/80">
                  Gestiona cuentas y roles
                </span>
              </span>
            </RouterLink>
          </li>
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/pedidos"
              class="flex items-start gap-3 rounded-lg p-3 text-[var(--text-100)] hover:bg-[var(--primary-100)] hover:text-white transition-all group"
              active-class="bg-[var(--primary-100)] text-white shadow-md"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-100)]/15 text-[var(--primary-100)] group-hover:bg-white/20 group-hover:text-white"
              >
                <ShoppingCart class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Pedidos</span>
                <span class="text-xs text-[var(--text-200)] group-hover:text-white/80">
                  Lista y estado de pedidos
                </span>
              </span>
            </RouterLink>
          </li>
          <li v-if="!isVerdulero()">
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/pedidos-diarios"
              class="flex items-start gap-3 rounded-lg p-3 text-[var(--text-100)] hover:bg-[var(--primary-200)] hover:text-white transition-all group"
              active-class="bg-[var(--primary-200)] text-white shadow-md"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 group-hover:bg-white/20 group-hover:text-white"
              >
                <CalendarDays class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Compras</span>
                <span class="text-xs text-[var(--text-200)] group-hover:text-white/80">
                  Control diario de compras
                </span>
              </span>
            </RouterLink>
          </li>
          <li>
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/productos"
              class="flex items-start gap-3 rounded-lg p-3 text-[var(--text-100)] hover:bg-[var(--accent-100)] hover:text-white transition-all group"
              active-class="bg-[var(--accent-100)] text-white shadow-md"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:bg-white/20 group-hover:text-white"
              >
                <Package class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Productos</span>
                <span class="text-xs text-[var(--text-200)] group-hover:text-white/80">
                  Catalogo y precios
                </span>
              </span>
            </RouterLink>
          </li>
          <li v-if="isAdminRole()">
            <RouterLink
              @click="closeSidebarOnMobile"
              to="/negocios"
              class="flex items-start gap-3 rounded-lg p-3 text-[var(--text-100)] hover:bg-[var(--primary-200)] hover:text-white transition-all group"
              active-class="bg-[var(--primary-200)] text-white shadow-md"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700 group-hover:bg-white/20 group-hover:text-white"
              >
                <Store class="h-5 w-5" :stroke-width="2" />
              </span>
              <span class="flex flex-col">
                <span class="text-sm font-semibold">Negocios</span>
                <span class="text-xs text-[var(--text-200)] group-hover:text-white/80">
                  Administra locales
                </span>
              </span>
            </RouterLink>
          </li>
        </ul>

        <div class="mt-6 border-t border-[var(--bg-300)] pt-4">
          <RouterLink
            @click="closeSidebarOnMobile"
            to="/ayuda"
            class="flex items-start gap-3 rounded-lg p-3 text-[var(--text-100)] hover:bg-[var(--bg-200)] hover:text-[var(--primary-100)] transition-all group"
            active-class="bg-[var(--bg-200)] text-[var(--primary-100)] shadow-sm"
          >
            <span
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-200)] text-[var(--text-200)] group-hover:bg-white group-hover:text-[var(--primary-100)]"
            >
              <HelpCircle class="h-5 w-5" :stroke-width="2" />
            </span>
            <span class="flex flex-col">
              <span class="text-sm font-semibold">Ayuda</span>
              <span class="text-xs text-[var(--text-200)] group-hover:text-[var(--primary-100)]">
                Guia rapida de uso
              </span>
            </span>
          </RouterLink>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="p-1 sm:p-2 lg:p-4 lg:ml-64 mt-14">
      <div class="rounded-lg p-1 sm:p-2 lg:p-4">
        <RouterView />
      </div>
    </div>

    <!-- Backdrop for mobile -->
    <div
      v-if="sidebarOpen"
      @click="toggleSidebar"
      class="fixed inset-0 z-30 bg-gray-900/50 lg:hidden"
    ></div>

    <!-- Backdrop for user menu -->
    <div v-if="userMenuOpen" @click="toggleUserMenu" class="fixed inset-0 z-40"></div>
  </div>
</template>

<style scoped></style>
