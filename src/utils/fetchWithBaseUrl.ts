/**
 * Fetch interceptor to add base URL from environment
 */
import { API_BASE_URL } from '@/config/env'

export function createFetchWithBaseUrl() {
  return async (url: string, options?: RequestInit) => {
    // Si la URL ya es completa (comienza con http), usarla tal cual
    if (url.startsWith('http')) {
      return fetch(url, options)
    }

    // Si es una URL relativa, agregar la base URL
    const fullUrl = `${API_BASE_URL}${url}`
    return fetch(fullUrl, options)
  }
}

export const fetchWithBaseUrl = createFetchWithBaseUrl()
