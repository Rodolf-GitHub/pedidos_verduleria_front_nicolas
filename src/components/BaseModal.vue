<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface Props {
  title: string
  show: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const emit = defineEmits<{
  close: []
}>()

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4"
      >
        <div
          :class="[
            'relative w-full rounded-lg bg-white shadow-xl transition-all flex flex-col max-h-[90vh]',
            sizeClasses[size],
          ]"
          @click.stop
        >
          <!-- Header -->
          <div
            class="flex-shrink-0 flex items-center justify-between border-b border-[var(--bg-300)] bg-gradient-to-r from-[var(--primary-100)] to-[var(--primary-200)] px-6 py-4 rounded-t-lg sticky top-0 z-10"
          >
            <h3 class="text-lg font-semibold text-white">
              {{ title }}
            </h3>
            <button
              @click="emit('close')"
              type="button"
              class="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <span class="sr-only">Cerrar</span>
              <X :size="20" :stroke-width="2" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="flex-shrink-0 flex items-center justify-end gap-3 border-t border-[var(--bg-300)] bg-[var(--bg-100)] px-6 py-4 rounded-b-lg"
          >
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
