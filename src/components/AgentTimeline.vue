<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { AgentEvent } from '../composables/useAgentEvents'
import AgentCard from './AgentCard.vue'

const props = defineProps<{
  events: AgentEvent[]
}>()

const container = ref<HTMLElement | null>(null)
const autoScroll = ref(true)

watch(
  () => props.events.length,
  async () => {
    if (!autoScroll.value || !container.value) return
    await nextTick()
    container.value.scrollTop = container.value.scrollHeight
  },
)

function onScroll() {
  if (!container.value) return
  const { scrollTop, scrollHeight, clientHeight } = container.value
  // If user scrolled up more than 100px from bottom, disable auto-scroll
  autoScroll.value = scrollHeight - scrollTop - clientHeight < 100
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Sticky resume auto-scroll -->
    <div
      v-if="!autoScroll"
      class="sticky top-0 z-10 flex justify-center py-1.5"
    >
      <button
        class="text-xs bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1 rounded-full backdrop-blur transition-colors cursor-pointer"
        @click="autoScroll = true"
      >
        ↓ Auto-scroll
      </button>
    </div>

    <div
      ref="container"
      class="flex-1 overflow-y-auto space-y-2 pr-1"
      @scroll="onScroll"
    >
      <div v-if="events.length === 0" class="flex items-center justify-center h-full">
        <div class="text-center text-slate-600">
          <svg class="mx-auto mb-3 size-10 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12 7 2" /><path d="m7 12 5-10" /><path d="m12 12 5-10" /><path d="m17 12 5-10" /><circle cx="4.5" cy="18" r="2.5" /><circle cx="12" cy="18" r="2.5" /><circle cx="19.5" cy="18" r="2.5" /><path d="M4.5 15.5V12" /><path d="M12 15.5V12" /><path d="M19.5 15.5V12" />
          </svg>
          <p class="text-sm">Waiting for agent events…</p>
          <p class="text-xs mt-1">Start Claude Code with sub-agents to see activity</p>
        </div>
      </div>

      <AgentCard
        v-for="(event, i) in events"
        :key="i"
        :event="event"
      />
    </div>
  </div>
</template>
