<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useNotification } from '@/composables/useNotification'

const { allNotifications, removeNotification } = useNotification()

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    default:
      return Info
  }
}

const getColors = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-indigo-50 border-indigo-200 text-indigo-800'
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[9999] space-y-2 max-w-md pointer-events-none">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in allNotifications"
        :key="notification.id"
        :class="[
          'flex items-start gap-3 p-4 border rounded-lg shadow-lg pointer-events-auto',
          getColors(notification.type),
        ]"
      >
        <component :is="getIcon(notification.type)" :size="20" class="flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm font-medium">{{ notification.message }}</p>
        </div>
        <button
          @click="removeNotification(notification.id)"
          class="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X :size="18" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
