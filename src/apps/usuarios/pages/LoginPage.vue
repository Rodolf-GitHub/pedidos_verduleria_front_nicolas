<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CircleHelp,
  Eye,
  EyeOff,
  LockKeyhole,
  MessageCircle,
  Share2,
  Sparkles,
  TriangleAlert,
  User,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { usuariosApiLoginUsuario } from '@/apps/usuarios/api'
import type { UsuarioLoginSchema } from '@/apps/usuarios/api/schemas'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import InstallBanner from '@/apps/ayuda/components/InstallBanner.vue'
import { HOSTING_BLOQUEADO } from '@/config/env'

const router = useRouter()
const LOGIN_TIMEOUT_MS = 12000

const nombre = ref('')
const contraseña = ref('')
const mostrarContraseña = ref(false)
const loading = ref(false)
const nombreError = ref('')
const contraseñaError = ref('')
const showHelpModal = ref(false)
const showErrorModal = ref(false)
const errorModalTitle = ref('')
const errorModalMessage = ref('')
const errorModalHint = ref('')
const errorModalReason = ref('')
const errorModalSteps = ref<string[]>([])

const nombreNormalizado = computed(() => nombre.value.trim())
const puedeEnviar = computed(
  () => nombreNormalizado.value.length > 0 && contraseña.value.length > 0 && !loading.value,
)

const limpiarErroresCampos = () => {
  nombreError.value = ''
  contraseñaError.value = ''
}

const validarCampos = () => {
  limpiarErroresCampos()
  let valido = true

  if (!nombreNormalizado.value) {
    nombreError.value = 'Escribe tu nombre de usuario.'
    valido = false
  }

  if (!contraseña.value) {
    contraseñaError.value = 'Escribe tu contraseña.'
    valido = false
  }

  return valido
}

const handleShare = async () => {
  const url = window.location.origin
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Pedidos Verduleria',
        text: 'Accede a la aplicacion',
        url,
      })
      return
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return
    }

    window.open(url, '_blank')
  } catch (shareError) {
    console.error('Error al compartir la aplicacion:', shareError)
  }
}

const handleShareHelp = () => {
  showHelpModal.value = true
}

const closeHelpModal = () => {
  showHelpModal.value = false
}

const openErrorModal = (
  title: string,
  message: string,
  hint = '',
  reason = '',
  steps: string[] = [],
) => {
  errorModalTitle.value = title
  errorModalMessage.value = message
  errorModalHint.value = hint
  errorModalReason.value = reason
  errorModalSteps.value = steps
  showErrorModal.value = true
}

const closeErrorModal = () => {
  showErrorModal.value = false
}

const handleStatusError = (status: number) => {
  if (status === 400) {
    openErrorModal(
      'Datos incompletos',
      'El servidor recibio datos invalidos para iniciar sesion.',
      'Revisa usuario y contraseña e intenta nuevamente.',
      'Esto suele pasar cuando uno de los campos esta vacio o tiene un error de escritura. La app intenta entrar, pero el sistema no entiende bien los datos que llegaron.',
      [
        'Revisa que el usuario este completo, sin espacios al principio o al final.',
        'Escribe la contraseña otra vez con calma.',
        'Presiona nuevamente "Iniciar sesion".',
      ],
    )
    return
  }

  if (status === 401 || status === 403) {
    openErrorModal(
      'Credenciales incorrectas',
      'El usuario o la contraseña no coinciden.',
      'Verifica con tu administrador si tus datos cambiaron.',
      'Esto significa que la cuenta existe, pero los datos escritos no son exactamente iguales a los guardados. Puede pasar por una letra mal escrita o por mayusculas/minusculas.',
      [
        'Confirma con cuidado tu usuario.',
        'Prueba escribir la contraseña nuevamente, mirando el icono del ojo si hace falta.',
        'Si sigue igual, pide al administrador que confirme tus datos.',
      ],
    )
    return
  }

  if (status === 404) {
    openErrorModal(
      'Servicio no disponible',
      'No se encontro el servicio de inicio de sesion.',
      'Intenta mas tarde o contacta soporte tecnico.',
      'No es un problema de tu telefono. En este momento la parte del sistema que recibe el login no esta disponible.',
      [
        'Espera 1 o 2 minutos.',
        'Intenta iniciar sesion otra vez.',
        'Si continua, avisa a soporte para que lo revisen.',
      ],
    )
    return
  }

  if (status === 429) {
    openErrorModal(
      'Demasiados intentos',
      'Se detectaron muchos intentos seguidos de inicio de sesion.',
      'Espera unos segundos y vuelve a intentar.',
      'Es una proteccion de seguridad. Cuando se intenta muchas veces seguidas, el sistema pausa temporalmente el acceso para cuidar la cuenta.',
      [
        'No intentes varias veces seguidas.',
        'Espera al menos 30 segundos.',
        'Vuelve a intentar una sola vez con calma.',
      ],
    )
    return
  }

  if (status >= 500) {
    openErrorModal(
      'Problema del servidor',
      'El servidor tuvo un error al procesar el inicio de sesion.',
      'No depende de tu usuario. Intenta nuevamente en unos minutos.',
      'Este error pasa del lado del sistema, no por algo que hayas hecho mal. Tu usuario puede estar bien y aun asi fallar si el servidor esta ocupado o con mantenimiento.',
      [
        'Espera un momento.',
        'Intenta iniciar sesion de nuevo.',
        'Si persiste, escribe a soporte y comenta que aparecio "Problema del servidor".',
      ],
    )
    return
  }

  openErrorModal(
    'No se pudo iniciar sesion',
    `Ocurrio un error inesperado (codigo ${status}).`,
    'Si el problema continua, comparte este codigo con soporte.',
    'A veces aparecen errores poco comunes que no dependen de lo que hiciste. Lo mejor es intentar de nuevo y, si se repite, avisar a soporte con el codigo.',
    [
      'Cierra este mensaje.',
      'Intenta iniciar sesion otra vez.',
      'Si vuelve a pasar, envia el codigo del error al soporte.',
    ],
  )
}

const handleLogin = async () => {
  if (!validarCampos()) {
    openErrorModal(
      'Campos pendientes',
      'Falta completar datos para iniciar sesion.',
      'Completa usuario y contraseña para continuar.',
      'Para entrar, la app necesita los dos datos. Si falta uno, no puede validar tu cuenta.',
      ['Completa el campo Usuario.', 'Completa el campo Contraseña.', 'Presiona "Iniciar sesion".'],
    )
    return
  }

  loading.value = true
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

  try {
    const loginData: UsuarioLoginSchema = {
      nombre: nombreNormalizado.value,
      contraseña: contraseña.value,
    }

    const response = await usuariosApiLoginUsuario(loginData, { signal: controller.signal })
    const status = Number(response.status)

    if (status === 200 && response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('user_name', response.data.nombre || nombreNormalizado.value)
      localStorage.setItem('user_role', response.data.rol || 'usuario')
      await router.push(HOSTING_BLOQUEADO ? '/acceso-bloqueado' : '/ayuda')
      return
    }

    handleStatusError(status)
  } catch (err) {
    console.error('Error al iniciar sesion:', err)

    if (err instanceof DOMException && err.name === 'AbortError') {
      openErrorModal(
        'Tiempo de espera agotado',
        'La conexion tardo demasiado y se cancelo automaticamente.',
        'Revisa tu internet e intenta nuevamente.',
        'Esto suele pasar cuando la señal de internet esta lenta o inestable. La app espera un tiempo y corta sola para que no quede cargando eternamente.',
        [
          'Revisa si tienes internet (Wi-Fi o datos moviles).',
          'Si la señal es baja, acercate al router o cambia de red.',
          'Vuelve a tocar "Iniciar sesion".',
        ],
      )
      return
    }

    if (err instanceof TypeError) {
      openErrorModal(
        'Sin conexion con el servidor',
        'No se pudo conectar con el servicio de inicio de sesion.',
        'Confirma internet o verifica si el servidor esta caido.',
        'Generalmente pasa por internet cortado, muy debil, o porque el servidor esta momentaneamente fuera de linea.',
        [
          'Abre otra pagina para comprobar si internet funciona.',
          'Si no carga nada, reconecta Wi-Fi o activa datos moviles.',
          'Si internet funciona pero sigue fallando, avisa a soporte.',
        ],
      )
      return
    }

    openErrorModal(
      'Error inesperado',
      'Ocurrio un error no previsto al intentar ingresar.',
      'Vuelve a intentar. Si persiste, contacta soporte.',
      'Es un fallo poco comun. No significa que hiciste algo mal, solo que la app recibio una respuesta que no esperaba.',
      [
        'Cierra este mensaje e intenta otra vez.',
        'Si vuelve a salir, reinicia la app.',
        'Si persiste, contacta soporte para que revisen tu caso.',
      ],
    )
  } finally {
    window.clearTimeout(timeoutId)
    loading.value = false
  }
}
</script>

<template>
  <div
    class="login-shell flex min-h-screen items-center justify-center bg-[var(--bg-100)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8"
  >
    <div class="login-orb login-orb--left" aria-hidden="true"></div>
    <div class="login-orb login-orb--right" aria-hidden="true"></div>

    <div class="w-full max-w-md space-y-5">
      <InstallBanner compact title="Instala la app" subtitle="" />

      <header class="space-y-1 text-center">
        <div
          class="mx-auto inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[var(--primary-300)] shadow-sm ring-1 ring-[var(--primary-100)]/20"
        >
          <Sparkles :size="14" />
          Acceso rapido
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--text-100)]">Iniciar sesion</h1>
        <p class="text-sm text-[var(--text-200)]">
          Usa el usuario y contraseña que te dio el administrador.
        </p>
      </header>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div
          class="rounded-2xl border border-[var(--bg-300)]/40 bg-white/95 px-5 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-7 sm:py-7"
        >
          <div class="space-y-4">
            <p class="text-xs text-center text-[var(--text-200)]">
              Entra en 2 pasos: usuario + contraseña.
            </p>

            <div>
              <label
                for="nombre"
                class="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-100)]"
              >
                <User :size="15" class="text-[var(--primary-200)]" />
                Usuario
              </label>
              <div class="mt-1 relative">
                <input
                  id="nombre"
                  v-model="nombre"
                  name="nombre"
                  type="text"
                  autocomplete="username"
                  required
                  :aria-invalid="Boolean(nombreError)"
                  class="block w-full rounded-xl border border-[var(--bg-300)] bg-white/90 px-3 py-2 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
                  placeholder="Ejemplo: juan"
                  @input="nombreError = ''"
                />
              </div>
              <p class="mt-1 text-xs text-[var(--text-200)]">
                Es el nombre que usas para entrar al sistema.
              </p>
              <p v-if="nombreError" class="mt-1 text-sm text-red-600">{{ nombreError }}</p>
            </div>

            <div>
              <label
                for="contraseña"
                class="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-100)]"
              >
                <LockKeyhole :size="15" class="text-[var(--primary-200)]" />
                Contraseña
              </label>
              <div class="relative mt-1">
                <input
                  id="contraseña"
                  v-model="contraseña"
                  name="contraseña"
                  :type="mostrarContraseña ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  :aria-invalid="Boolean(contraseñaError)"
                  class="block w-full rounded-xl border border-[var(--bg-300)] bg-white/90 px-3 py-2 pr-10 text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--primary-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] sm:text-sm"
                  placeholder="••••••••"
                  @input="contraseñaError = ''"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-200)] hover:text-[var(--text-100)]"
                  :aria-label="mostrarContraseña ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="mostrarContraseña = !mostrarContraseña"
                >
                  <EyeOff v-if="mostrarContraseña" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
              <p class="mt-1 text-xs text-[var(--text-200)]">
                Puedes tocar el icono del ojo para verla mientras escribes.
              </p>
              <p v-if="contraseñaError" class="mt-1 text-sm text-red-600">{{ contraseñaError }}</p>
            </div>

            <div>
              <BaseButton
                type="submit"
                class="w-full rounded-xl shadow-sm"
                :loading="loading"
                :disabled="!puedeEnviar"
              >
                {{ loading ? 'Ingresando...' : 'Iniciar sesion' }}
              </BaseButton>
              <p class="mt-2 text-center text-xs text-[var(--text-200)]">
                El boton se habilita cuando completas usuario y contraseña.
              </p>
            </div>

            <div class="flex flex-wrap justify-center gap-3 border-t border-[var(--bg-200)] pt-4">
              <BaseButton variant="secondary" size="sm" class="gap-2" @click="handleShare">
                <Share2 :size="16" />
                Compartir aplicacion
              </BaseButton>

              <BaseButton variant="secondary" size="sm" class="gap-2" @click="handleShareHelp">
                <CircleHelp :size="16" />
                Ayuda
              </BaseButton>

              <a
                href="https://wa.me/59891854199"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-200)] px-3 py-1.5 text-sm font-medium text-[var(--text-100)] transition-all hover:bg-[var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[var(--bg-300)] focus:ring-offset-2"
              >
                <MessageCircle :size="16" />
                Necesitas ayuda? Contactar soporte
              </a>
            </div>
          </div>
        </div>
      </form>

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

      <BaseModal
        :show="showHelpModal"
        title="Ayuda para compartir la app"
        size="md"
        @close="closeHelpModal"
      >
        <div class="space-y-3 text-sm text-[var(--text-100)]">
          <p class="font-semibold">
            Si algun companero la necesita puedes tocar en "Compartir aplicacion" para enviarsela.
          </p>
          <p>Al tocar compartir, el telefono te deja enviarla por WhatsApp, Telegram u otra app.</p>
          <p>
            Si no aparece el menu de compartir, copiamos el enlace automaticamente para que lo
            pegues en un chat.
          </p>
          <p class="rounded-lg bg-[var(--bg-100)] p-3 text-xs text-[var(--text-200)]">
            Consejo: pideles que entren desde su celular e instalen la app para usarla mas rapido.
          </p>
        </div>

        <template #footer>
          <BaseButton variant="secondary" @click="closeHelpModal">Cerrar</BaseButton>
          <BaseButton class="gap-2" @click="handleShare">
            <Share2 :size="16" />
            Compartir ahora
          </BaseButton>
        </template>
      </BaseModal>

      <BaseModal :show="showErrorModal" :title="errorModalTitle" size="md" @close="closeErrorModal">
        <div class="space-y-3 text-sm text-[var(--text-100)]">
          <p class="flex items-start gap-2 font-semibold text-red-700">
            <TriangleAlert :size="18" class="mt-0.5 shrink-0" />
            {{ errorModalMessage }}
          </p>
          <div v-if="errorModalReason" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)]">
              Por que pasa
            </p>
            <p class="rounded-lg bg-[var(--bg-100)] p-3 text-sm text-[var(--text-100)]">
              {{ errorModalReason }}
            </p>
          </div>
          <div v-if="errorModalSteps.length" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)]">
              Que hacer ahora
            </p>
            <ol class="list-decimal space-y-1 pl-5 text-sm text-[var(--text-100)]">
              <li v-for="(step, index) in errorModalSteps" :key="`${errorModalTitle}-${index}`">
                {{ step }}
              </li>
            </ol>
          </div>
          <p
            v-if="errorModalHint"
            class="rounded-lg bg-[var(--bg-100)] p-3 text-xs text-[var(--text-200)]"
          >
            {{ errorModalHint }}
          </p>
        </div>

        <template #footer>
          <BaseButton variant="secondary" @click="closeErrorModal">Cerrar</BaseButton>
        </template>
      </BaseModal>
    </div>
  </div>
</template>

<style scoped>
.login-shell {
  position: relative;
  overflow: hidden;
}

.login-orb {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  filter: blur(2px);
}

.login-orb--left {
  width: 230px;
  height: 230px;
  left: -60px;
  top: -35px;
  background: radial-gradient(circle, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0));
}

.login-orb--right {
  width: 220px;
  height: 220px;
  right: -70px;
  bottom: -70px;
  background: radial-gradient(circle, rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0));
}

@media (max-width: 640px) {
  .login-orb--left {
    width: 170px;
    height: 170px;
    top: -40px;
  }

  .login-orb--right {
    width: 160px;
    height: 160px;
    bottom: -50px;
  }
}
</style>
