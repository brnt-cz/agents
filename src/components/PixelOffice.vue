<script setup lang="ts">
import { ref, onMounted, onUnmounted, toRef } from 'vue'
import type { AgentGroup } from '../composables/useGroupedEvents'
import { usePixelOffice } from '../composables/usePixelOffice'

const props = defineProps<{
  groups: AgentGroup[]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const { start, stop, resize, CANVAS_HEIGHT } = usePixelOffice(
  toRef(() => props.groups),
  canvasRef,
)

let resizeObserver: ResizeObserver

onMounted(() => {
  if (containerRef.value) {
    resize(containerRef.value.clientWidth)
    start()

    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        resize(entry.contentRect.width)
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  stop()
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="containerRef"
    class="shrink-0 border-b border-slate-800 overflow-hidden"
    :style="{ height: CANVAS_HEIGHT + 'px' }"
  >
    <canvas
      ref="canvasRef"
      class="block w-full"
      :style="{ height: CANVAS_HEIGHT + 'px', imageRendering: 'pixelated' }"
    />
  </div>
</template>
