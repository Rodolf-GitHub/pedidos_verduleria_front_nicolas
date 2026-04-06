/**
 * Configuration for environment variables
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Cambiar a false cuando el cliente abone el hosting.
 * true = bloquea el acceso después del login.
 */
export const HOSTING_BLOQUEADO = false
