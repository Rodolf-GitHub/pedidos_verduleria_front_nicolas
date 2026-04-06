<script setup lang="ts">
import BaseButton from '@/components/BaseButton.vue'
import { AlertTriangle, CheckCircle, ShoppingCart } from 'lucide-vue-next'

type Item = { fecha: string; urgencia?: string }

const props = defineProps<{ items: Item[] }>()
const emit = defineEmits<(e: 'open', fecha: string) => void>()

const getUrgencia = (p: Item) => {
  const u = p?.urgencia
  if (!u) return 'a_tiempo'
  return String(u)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

const open = (fecha: string) => emit('open', fecha)
</script>

<template>
  <div v-if="props.items?.length > 0" class="space-y-3">
    <div v-for="p in props.items" :key="p.fecha">
      <div
        v-if="getUrgencia(p) === 'critico' || getUrgencia(p) === 'critica'"
        class="rounded-md border-2 border-red-600 bg-red-100 p-4 text-red-900 flex flex-col items-center text-center gap-3"
      >
        <AlertTriangle class="h-8 w-8 sm:h-6 sm:w-6 text-red-600" />
        <div>
          <div class="text-sm font-semibold">Pedido crítico sin completar — {{ p.fecha }}</div>
          <div class="text-xs text-[var(--text-200)]">Completa este pedido lo antes posible.</div>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          class="border-2 border-red-500 bg-white text-red-700 hover:bg-red-50"
          @click="open(p.fecha)"
        >
          Ver pedido
        </BaseButton>
      </div>

      <div
        v-else-if="getUrgencia(p) === 'pendiente'"
        class="rounded-md border-2 border-orange-500 bg-yellow-300 p-4 text-yellow-900 flex flex-col items-center text-center gap-3"
      >
        <AlertTriangle class="h-8 w-8 sm:h-6 sm:w-6 text-orange-600" />
        <div>
          <div class="text-sm font-semibold">Tienes un pedido pendiente de ayer.</div>
          <div class="text-xs text-[var(--text-200)]">
            Es importante completarlo para que los verduleros puedan actualizar los precios.
          </div>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          class="border-2 border-orange-500 bg-white text-orange-700 hover:bg-orange-50"
          @click="open(p.fecha)"
        >
          Ver pedido
        </BaseButton>
      </div>

      <div
        v-else-if="getUrgencia(p) === 'a_tiempo'"
        class="rounded-md border-2 border-emerald-500 bg-emerald-100 p-4 text-emerald-900 flex flex-col items-center text-center gap-3"
      >
        <CheckCircle class="h-8 w-8 sm:h-6 sm:w-6 text-emerald-600" />
        <div>
          <div class="text-sm font-semibold">Ya el pedido de ayer está listo.</div>
          <div class="text-xs text-[var(--text-200)]">
            Puedes empezar a hacer la compra de hoy, recuerda completar la compra cuando termines.
          </div>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          class="border-2 border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50"
          @click="open(p.fecha)"
        >
          Ver pedido
        </BaseButton>
      </div>

      <div
        v-else
        class="rounded-md border-2 border-blue-500 bg-blue-100 p-4 text-blue-900 flex flex-col items-center text-center gap-3"
      >
        <ShoppingCart class="h-8 w-8 sm:h-6 sm:w-6 text-blue-600" />
        <div>
          <div class="text-sm font-semibold">
            Ya los negocios han empezado a hacer el pedido de hoy
          </div>
          <div class="text-xs text-[var(--text-200)]">
            Espera a que todos hagan sus pedidos para completar la compra.
          </div>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          class="border-2 border-blue-500 bg-white text-blue-700 hover:bg-blue-50"
          @click="open(p.fecha)"
        >
          Ver pedido
        </BaseButton>
      </div>
    </div>
  </div>
</template>
