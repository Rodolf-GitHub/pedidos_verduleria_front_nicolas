<script setup lang="ts">
import { ref } from 'vue'
import { ShoppingCart, CalendarDays, Package, Share2 } from 'lucide-vue-next'
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
      <ShoppingCart class="h-5 w-5 text-[var(--accent-100)]" :stroke-width="2" />
      <h1 class="text-2xl font-bold text-[var(--text-100)]">Guía comprador</h1>
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
        {{ userName }}, tu rol es el de comprador; eres el encargado de completar las compras de los
        pedidos que generan los verduleros.
      </p>
      <p class="text-lg font-bold text-[var(--text-200)]">
        Durante la compra debes ajustar precios para que el verdulero los pueda modificar al día
        siguiente si es necesario.
      </p>
      <p class="text-lg font-bold text-[var(--text-200)]">
        Cuando termines una compra, márcala como completada para que el resto del equipo vea el
        estado correcto.
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
        En esta sección puedes crear pedidos para el otro día, revisar productos y cantidades, y
        seguir el estado de cada pedido. Cuando termines, marca el pedido como completado para que
        el resto del equipo vea el estado correcto.
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
        En esta sección puedes ver los pedidos que te hacen todos los negocios eligiendo un día.
        Puedes ir marcando cada producto como comprado o no comprado, ajustar el precio de compra y
        la ganancia, y completar la compra diaria para que los verduleros actualicen sus precios de
        venta.
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
        En esta sección puedes ver o modificar el catálogo, las unidades de medida y los precios de
        compra y venta. Mantener esta información al día ayuda a que las compras se registren sin
        errores.
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
