import { ref, computed } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])
let notificationId = 0

export const useNotification = () => {
  const addNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration: number = 5000,
  ) => {
    const id = `notification-${++notificationId}`
    const notification: Notification = {
      id,
      type,
      message,
      duration,
    }

    console.log(`[Notification] Adding ${type}: ${message}`)
    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const success = (message: string, duration?: number) => {
    return addNotification(message, 'success', duration)
  }

  const error = (message: string, duration?: number) => {
    return addNotification(message, 'error', duration ?? 7000)
  }

  const warning = (message: string, duration?: number) => {
    return addNotification(message, 'warning', duration)
  }

  const info = (message: string, duration?: number) => {
    return addNotification(message, 'info', duration)
  }

  const allNotifications = computed(() => notifications.value)

  return {
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
    allNotifications,
  }
}
