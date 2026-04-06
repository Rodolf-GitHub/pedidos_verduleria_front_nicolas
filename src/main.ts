import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './main.css'
import App from './App.vue'
import router from './router'
import { useNotification } from '@/composables/useNotification'
import { API_BASE_URL } from '@/config/env'

const { error: showError } = useNotification()

let isHandlingUnauthorized = false

const originalFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  let [resource, config] = args

  // Si es una URL relativa, agregar la base URL
  if (typeof resource === 'string' && !resource.startsWith('http')) {
    resource = `${API_BASE_URL}${resource}`
  }

  const res = await originalFetch(resource, config)

  if (!res.ok) {
    let message = `Error ${res.status}`

    try {
      const text = await res.clone().text()
      if (text) {
        const data = JSON.parse(text)
        message = data?.detail || data?.message || message
      }
    } catch {
      // ignore parse errors
    }

    if (res.status === 401 && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_name')
      localStorage.removeItem('user_role')
      showError('Sesión expirada. Ingresa nuevamente.')
      router.replace('/')
      setTimeout(() => {
        isHandlingUnauthorized = false
      }, 500)
    } else {
      showError(message)
    }
  }

  return res
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
