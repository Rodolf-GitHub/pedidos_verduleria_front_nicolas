<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldAlert, LogOut, MessageCircle, Info, ChevronDown, ChevronUp } from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
const mostrarInfo = ref(false)

const handleSalir = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_name')
  localStorage.removeItem('user_role')
  router.push('/')
}
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-[var(--bg-100)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8"
  >
    <div class="w-full max-w-md space-y-5">
      <div
        class="rounded-2xl border border-red-200 bg-white/95 px-5 py-8 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-7 sm:py-10 text-center space-y-6"
      >
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldAlert :size="32" class="text-red-600" />
        </div>

        <div class="space-y-3">
          <h1 class="text-2xl font-bold tracking-tight text-[var(--text-100)]">Acceso bloqueado</h1>

          <p class="text-sm text-[var(--text-100)] leading-relaxed">
            El servicio de hosting <strong>no fue abonado</strong> en la fecha acordada.
          </p>

          <p class="text-sm text-[var(--text-200)] leading-relaxed">
            Para resolver el problema, el titular del negocio debe comunicarse con el administrador
            del sistema.
          </p>

          <p class="text-sm font-medium text-[var(--text-200)]">Gracias por su comprensión.</p>
        </div>

        <div>
          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary-200)] hover:text-[var(--primary-300)] transition-colors"
            @click="mostrarInfo = !mostrarInfo"
          >
            <Info :size="16" />
            ¿Por qué se debe pagar este servicio?
            <ChevronUp v-if="mostrarInfo" :size="14" />
            <ChevronDown v-else :size="14" />
          </button>

          <Transition name="info">
            <div
              v-if="mostrarInfo"
              class="mt-3 rounded-xl bg-[var(--bg-100)] border border-[var(--bg-300)]/50 p-4 text-left space-y-3"
            >
              <p class="text-sm font-semibold text-[var(--text-100)]">¿Qué es el hosting?</p>
              <p class="text-sm text-[var(--text-200)] leading-relaxed">
                El <strong class="text-[var(--text-100)]">hosting</strong> es el servicio que
                mantiene esta aplicación disponible en internet las 24 horas del día, los 7 días de
                la semana. Es como el "alquiler" del espacio donde vive la app para que vos y tu
                equipo puedan usarla desde cualquier dispositivo.
              </p>
              <p class="text-sm font-semibold text-[var(--text-100)]">¿Por qué tiene un costo?</p>
              <p class="text-sm text-[var(--text-200)] leading-relaxed">
                Tener una aplicación funcionando en internet
                <strong class="text-[var(--text-100)]">no es gratis</strong>. Requiere servidores,
                mantenimiento técnico, seguridad y actualizaciones constantes. Todo eso tiene un
                costo mensual que debe ser cubierto para que el sistema siga operativo.
              </p>
              <p class="text-sm font-semibold text-[var(--text-100)]">¿Qué pasa si no se paga?</p>
              <p class="text-sm text-[var(--text-200)] leading-relaxed">
                Si el servicio no se abona en la fecha acordada, el acceso a la aplicación se
                suspende automáticamente hasta que se regularice el pago. Esto no afecta los datos
                guardados, pero impide el uso del sistema.
              </p>
            </div>
          </Transition>
        </div>

        <div class="space-y-3 pt-2">
          <BaseButton class="w-full gap-2 rounded-xl" variant="danger" @click="handleSalir">
            <LogOut :size="18" />
            Salir
          </BaseButton>

          <a
            href="https://wa.me/59891854199"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--bg-200)] px-3 py-2.5 text-sm font-medium text-[var(--text-100)] transition-all hover:bg-[var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[var(--bg-300)] focus:ring-offset-2"
          >
            <MessageCircle :size="16" />
            Contactar soporte
          </a>
        </div>
      </div>

      <p class="text-center text-[10px] text-[var(--text-200)]">
        Powered by
        <a
          href="https://groerosoftware.com"
          target="_blank"
          rel="noreferrer"
          class="font-semibold text-[var(--primary-200)] underline hover:text-[var(--primary-300)]"
        >
          groerosoftware.com
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.info-enter-active,
.info-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.info-enter-from,
.info-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.info-enter-to,
.info-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
