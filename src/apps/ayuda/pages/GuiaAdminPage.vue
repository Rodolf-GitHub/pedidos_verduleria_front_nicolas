<script setup lang="ts">
import { ref } from 'vue'
import {
  ShieldCheck,
  ShoppingCart,
  CalendarDays,
  Package,
  Users,
  Store,
  Share2,
} from 'lucide-vue-next'
import BaseButton from '@/components/BaseButton.vue'
import InstallBanner from '@/apps/ayuda/components/InstallBanner.vue'

const userName = ref(localStorage.getItem('user_name') || 'Usuario')

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
  } catch (error) {
    console.error('Error al compartir:', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <InstallBanner />

    <div class="flex items-center justify-center gap-2">
      <ShieldCheck class="h-5 w-5 text-red-600" :stroke-width="2" />
      <h1 class="text-2xl font-bold text-[var(--text-100)]">Guía administrador</h1>
    </div>

    <div class="flex flex-wrap justify-center gap-3">
      <BaseButton variant="secondary" size="sm" class="gap-2" @click="handleShare">
        <Share2 :size="16" />
        Compartir aplicacion
      </BaseButton>
    </div>

    <!-- Card general del rol -->
    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm space-y-3">
      <p class="text-lg font-bold text-[var(--text-200)]">
        {{ userName }}, tu rol es el de administrador; puedes hacer lo que hacen verduleros y
        compradores, y tienes acceso a todos los negocios, pedidos sin completar y compras diarias.
        Además tienes privilegios especiales.
      </p>
      <p class="text-lg font-bold text-[var(--text-200)]">
        Puedes modificar pedidos de otros usuarios, ajustar precios cuando sea necesario y mantener
        la información general al día.
      </p>
      <p class="text-lg font-bold text-[var(--text-200)]">
        También puedes crear cuentas de usuario, asignar roles y coordinar con el equipo para que
        todo quede organizado y actualizado.
      </p>
    </div>

    <!-- Card Pedidos -->
    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm">
      <RouterLink
        to="/pedidos"
        class="inline-flex items-center gap-2 font-semibold text-[var(--primary-100)]"
      >
        <ShoppingCart class="h-5 w-5" :stroke-width="2" /> Pedidos
      </RouterLink>
      <p class="mt-2 text-sm text-[var(--text-200)]">
        En esta sección puedes ver los pedidos de cada negocio por día, o crear pedidos para el otro
        día, poniendo la cantidad y unidad de medida que quieres de cada producto. Revisa los
        pedidos que te hacen los compradores y marca completado cuando termines. Recuerda marcar el
        pedido como completado para que el resto del equipo vea el estado correcto y se pueda hacer
        la compra; una vez que se haga la compra puedes ver la compra asociada y ajustar precios de
        venta en tu verdulería para el día siguiente.
      </p>
    </div>

    <!-- Card Compras -->
    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm">
      <RouterLink
        to="/pedidos-diarios"
        class="inline-flex items-center gap-2 font-semibold text-blue-700"
      >
        <CalendarDays class="h-5 w-5" :stroke-width="2" /> Compras
      </RouterLink>
      <p class="mt-2 text-sm text-[var(--text-200)]">
        En esta sección puedes ver los pedidos que te hacen todos los negocios eligiendo un día,
        puedes ir marcando como comprado o no cada producto que los verduleros te pidan y ajustando
        los precios a los que compraste los productos y la ganancia que quieres obtener para que los
        verduleros puedan ajustar sus precios de venta al día siguiente. Recuerda marcar la compra
        como completada para que el resto del equipo vea el estado correcto.
      </p>
    </div>

    <!-- Card Productos -->
    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm">
      <RouterLink
        to="/productos"
        class="inline-flex items-center gap-2 font-semibold text-amber-700"
      >
        <Package class="h-5 w-5" :stroke-width="2" /> Productos
      </RouterLink>
      <p class="mt-2 text-sm text-[var(--text-200)]">
        En esta sección puedes ver o modificar el catálogo de productos, sus unidades de medida, y
        precios de venta. Recuerda mantener esta información actualizada para facilitar el trabajo
        de los demás miembros del equipo.
      </p>
    </div>

    <!-- Card Usuarios -->
    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm">
      <RouterLink
        to="/usuarios"
        class="inline-flex items-center gap-2 font-semibold text-purple-700"
      >
        <Users class="h-5 w-5" :stroke-width="2" /> Usuarios
      </RouterLink>
      <p class="mt-2 text-sm text-[var(--text-200)]">
        Crea usuarios, actualiza contraseñas y asigna negocios a cada usuario.
      </p>
    </div>

    <!-- Card Negocios -->
    <div class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm">
      <RouterLink to="/negocios" class="inline-flex items-center gap-2 font-semibold text-teal-700">
        <Store class="h-5 w-5" :stroke-width="2" /> Negocios
      </RouterLink>
      <p class="mt-2 text-sm text-[var(--text-200)]">
        Gestiona los locales, crea, edita o elimina negocios.
      </p>
    </div>

    <!-- Card Contacto -->
    <details class="rounded-xl border border-[var(--bg-300)] bg-white p-5 shadow-sm">
      <summary class="cursor-pointer text-sm font-semibold text-[var(--text-100)]">
        Contacto
      </summary>
      <div class="mt-3 space-y-2">
        <p class="text-sm text-[var(--text-200)]">
          Software desarrollado por Rodolfo Israel Groero Leiva. Ante cualquier problema o consulta,
          contacta al programador.
        </p>
        <p class="text-sm text-[var(--text-200)]">Email: rodolfogroero2@gmail.com</p>
        <p class="text-sm text-[var(--text-200)]">WhatsApp: +59891854199</p>
      </div>
    </details>
  </div>
</template>

<style scoped></style>
