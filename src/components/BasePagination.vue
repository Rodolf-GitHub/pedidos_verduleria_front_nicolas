<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  total: number
  limit: number
  offset: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:offset': [value: number]
}>()

const currentPage = computed(() => Math.floor(props.offset / props.limit) + 1)
const totalPages = computed(() => Math.ceil(props.total / props.limit))
const hasPrevious = computed(() => props.offset > 0)
const hasNext = computed(() => props.offset + props.limit < props.total)

const previousPage = () => {
  if (hasPrevious.value) {
    emit('update:offset', props.offset - props.limit)
  }
}

const nextPage = () => {
  if (hasNext.value) {
    emit('update:offset', props.offset + props.limit)
  }
}

const goToPage = (page: number) => {
  const newOffset = (page - 1) * props.limit
  emit('update:offset', newOffset)
}

const pages = computed(() => {
  const pages: (number | string)[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('...')
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (end < totalPages.value) {
    if (end < totalPages.value - 1) pages.push('...')
    pages.push(totalPages.value)
  }

  return pages
})
</script>

<template>
  <div
    class="flex items-center justify-between gap-4 rounded-lg border border-[var(--bg-300)] bg-white p-4"
  >
    <div class="text-sm text-[var(--text-200)]">
      Página <span class="font-semibold text-[var(--text-100)]">{{ currentPage }}</span> de
      <span class="font-semibold text-[var(--text-100)]">{{ totalPages }}</span> (Total:
      <span class="font-semibold text-[var(--text-100)]">{{ total }}</span
      >)
    </div>

    <div class="flex items-center gap-1">
      <button
        @click="previousPage"
        :disabled="!hasPrevious"
        class="rounded-lg p-2 text-[var(--text-200)] hover:bg-[var(--bg-100)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        :title="hasPrevious ? 'Página anterior' : 'No hay página anterior'"
      >
        <ChevronLeft :size="20" :stroke-width="2" />
      </button>

      <div class="flex items-center gap-1 sm:hidden">
        <span
          class="rounded-lg bg-[var(--bg-100)] px-3 py-2 text-sm font-semibold text-[var(--text-100)]"
        >
          {{ currentPage }} / {{ totalPages }}
        </span>
      </div>

      <div class="hidden items-center gap-1 sm:flex">
        <button
          v-for="page in pages"
          :key="page"
          @click="typeof page === 'number' && goToPage(page)"
          :disabled="page === '...'"
          :class="[
            'min-w-[36px] h-10 rounded-lg font-medium transition-all text-sm',
            page === currentPage
              ? 'bg-[var(--primary-100)] text-white'
              : page === '...'
                ? 'text-[var(--text-200)] cursor-default'
                : 'text-[var(--text-100)] hover:bg-[var(--bg-100)]',
          ]"
        >
          {{ page }}
        </button>
      </div>

      <button
        @click="nextPage"
        :disabled="!hasNext"
        class="rounded-lg p-2 text-[var(--text-200)] hover:bg-[var(--bg-100)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        :title="hasNext ? 'Página siguiente' : 'No hay página siguiente'"
      >
        <ChevronRight :size="20" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<style scoped></style>
