<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userRole = localStorage.getItem('user_role') || 'usuario'

const getRolePath = () => {
  if (userRole === 'admin') return '/ayuda/admin'
  if (userRole === 'verdulero') return '/ayuda/verdulero'
  return '/ayuda/comprador'
}

onMounted(() => {
  router.replace(getRolePath())
})
</script>

<template>
  <div
    class="rounded-xl border border-[var(--bg-300)] bg-white p-5 text-center text-sm text-[var(--text-200)]"
  >
    Redirigiendo a la guia correspondiente...
  </div>
</template>
