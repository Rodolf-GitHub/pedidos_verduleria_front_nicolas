<script setup lang="ts">
interface Props {
  modelValue: string | number
  label?: string
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-[var(--text-100)] mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="[
        'block w-full rounded-lg border px-3 py-2 text-[var(--text-100)] placeholder-[var(--text-200)] focus:outline-none focus:ring-2 transition-colors sm:text-sm',
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
          : 'border-[var(--bg-300)] focus:border-[var(--primary-100)] focus:ring-[var(--primary-100)]',
        disabled ? 'bg-[var(--bg-200)] cursor-not-allowed' : 'bg-white',
      ]"
    />
    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>

<style scoped></style>
