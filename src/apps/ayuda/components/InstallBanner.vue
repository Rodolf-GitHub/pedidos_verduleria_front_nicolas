<template>
  <section
    v-if="installAvailable"
    class="install-banner"
    :class="{ 'install-banner--compact': props.compact }"
  >
    <div class="install-card" :class="{ 'install-card--compact': props.compact }">
      <div class="install-text">
        <p class="install-title">{{ resolvedTitle }}</p>
        <p v-if="resolvedSubtitle" class="install-sub">{{ resolvedSubtitle }}</p>
      </div>
      <button
        class="install-btn"
        :class="{ 'install-btn--compact': props.compact }"
        @click="handleInstall"
      >
        Instalar
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const props = withDefaults(
  defineProps<{ title?: string; subtitle?: string; compact?: boolean }>(),
  {
    compact: false,
  },
)

const resolvedTitle = computed(() => props.title ?? 'Instala la app de Pedidos Verdulería')
const resolvedSubtitle = computed(
  () => props.subtitle ?? (props.compact ? '' : 'La experiencia es mejor desde la aplicación.'),
)

const installAvailable = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

const onBeforeInstallPrompt = (event: Event) => {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  installAvailable.value = true
}

const handleInstall = async () => {
  if (!deferredPrompt) return
  await deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
  installAvailable.value = false
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

  const existing = (window as any).__deferredBeforeInstallPrompt
  if (existing) {
    deferredPrompt = existing as BeforeInstallPromptEvent
    installAvailable.value = true
  }

  if (typeof window !== 'undefined' && !(window as any).__captureBeforeInstallPrompt) {
    ;(window as any).__captureBeforeInstallPrompt = true
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      ;(window as any).__deferredBeforeInstallPrompt = e
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
})
</script>

<style scoped>
.install-banner {
  display: flex;
  justify-content: center;
  padding: 0.75rem 1rem;
}

.install-banner--compact {
  padding: 0.15rem 0;
}

.install-card {
  width: 100%;
  max-width: 1100px;
  background: linear-gradient(135deg, rgba(255, 45, 149, 0.08), rgba(255, 255, 255, 0.9));
  border: 1px solid var(--border, #eee);
  border-radius: 18px;
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  box-shadow: 0 12px 35px rgba(255, 45, 149, 0.08);
  backdrop-filter: blur(6px);
}

.install-card--compact {
  border-radius: 999px;
  padding: 0.4rem 0.45rem 0.4rem 0.8rem;
  gap: 0.5rem;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.14), rgba(255, 193, 7, 0.1));
  border-color: rgba(76, 175, 80, 0.25);
  box-shadow: 0 8px 20px rgba(76, 175, 80, 0.15);
}

.install-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  text-align: left;
}

.install-title {
  font-weight: 800;
  color: var(--text-100, #333333);
  font-size: 1rem;
}

.install-sub {
  color: var(--text-200, #5c5c5c);
  font-size: 0.9rem;
}

.install-card--compact .install-title {
  font-size: 0.82rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
}

.install-btn {
  border: none;
  border-radius: 999px;
  background: linear-gradient(120deg, #16a34a, #22c55e);
  color: #fff;
  font-weight: 700;
  padding: 0.7rem 1.4rem;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(34, 197, 94, 0.25);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.install-btn--compact {
  padding: 0.38rem 0.78rem;
  font-size: 0.76rem;
  box-shadow: 0 7px 16px rgba(34, 197, 94, 0.24);
}

.install-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(34, 197, 94, 0.32);
}

.install-btn:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .install-banner {
    padding: 0.25rem 0;
  }

  .install-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
  }

  .install-card--compact {
    flex-direction: row;
    align-items: center;
    padding: 0.35rem 0.35rem 0.35rem 0.7rem;
  }

  .install-text {
    text-align: left;
  }

  .install-btn {
    width: 100%;
    text-align: center;
  }

  .install-btn--compact {
    width: auto;
    flex-shrink: 0;
    padding: 0.35rem 0.65rem;
  }
}
</style>
