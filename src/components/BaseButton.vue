<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
})

const variantClasses = {
  primary:
    'bg-[var(--primary-100)] text-white hover:bg-[var(--primary-200)] focus:ring-[var(--primary-100)]',
  secondary:
    'bg-[var(--bg-200)] text-[var(--text-100)] hover:bg-[var(--bg-300)] focus:ring-[var(--bg-300)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success:
    'bg-[var(--accent-100)] text-white hover:bg-[var(--accent-200)] focus:ring-[var(--accent-100)]',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <Loader2 v-if="loading" :size="16" class="mr-2 animate-spin" :stroke-width="2" />
    <slot></slot>
  </button>
</template>

<style scoped></style>
