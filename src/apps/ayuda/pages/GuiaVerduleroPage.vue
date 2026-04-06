<script setup lang="ts">
import { ref } from 'vue'
import { ShoppingBasket, ShoppingCart, Package, Share2 } from 'lucide-vue-next'
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
      <ShoppingBasket class="h-5 w-5 text-[var(--primary-100)]" :stroke-width="2" />
      <h1 class="text-2xl font-bold text-[var(--text-100)]">Guía verdulero</h1>
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
        {{ userName }}, tu rol es el de verdulero; eres el encargado de hacer el pedido mirando los
        productos que necesita para el otro día. Crea el pedido con cantidades claras para facilitar
        la compra.
      </p>
      <p class="text-lg font-bold text-[var(--text-200)]">
        Cuando el comprador complete la compra y ajuste los precios, revisa y ajusta los precios de
        tu verdulería para el día siguiente.
      </p>
      <p class="text-lg font-bold text-[var(--text-200)]">
        Es importante marcar el pedido como completado cuando termines, para que los demás usuarios
        puedan verlo.
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
        el comprador pueda verlos y avanzar con la compra.
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
        En esta sección puedes ver el catálogo, las unidades de medida y los precios de venta. Como
        verdulero no ves ni editas precios de compra, pero sí puedes ajustar y revisar los precios
        de venta para tu verdulería.
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
