<template>
  <div class="w-full bg-gray-200 rounded-full h-2.5">
    <div
      class="bg-blue-600 h-2.5 rounded-full"
      :style="`width: ${visibleProgress}%`"
    ></div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'

const { loaded, total, holdback, release } = defineProps<{
  loaded: number
  total: number
  holdback: number
  release: boolean
}>()
const progress = computed(() => (total > 0 ? (loaded / total) * 100 : 0))
const visibleProgress = computed(() => Math.min(100, Math.max(progress.value - (release ? 0 : holdback), 0)))
</script>
