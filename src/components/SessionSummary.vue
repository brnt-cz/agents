<script setup lang="ts">
import { computed } from 'vue'
import type { AgentEvent } from '../composables/useAgentEvents'

const props = defineProps<{
  events: AgentEvent[]
}>()

const stats = computed(() => {
  let totalAgents = 0
  let totalTokens = 0
  let totalDurationMs = 0
  const byType = new Map<string, number>()

  for (const e of props.events) {
    if (e.event === 'SubagentStart') {
      totalAgents++
      const t = e.agent_type || 'unknown'
      byType.set(t, (byType.get(t) || 0) + 1)
    }
    if (e.event === 'PostToolUse') {
      if (e.total_tokens != null) totalTokens += e.total_tokens
      if (e.duration_ms != null) totalDurationMs += e.duration_ms
    }
  }

  return { totalAgents, totalTokens, totalDurationMs, byType }
})

const show = computed(() => stats.value.totalAgents > 0)

function formatTokens(n: number): string {
  if (n === 0) return '0'
  const k = n / 1000
  return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
}

function formatDuration(ms: number): string {
  if (ms === 0) return '0s'
  const sec = ms / 1000
  return sec >= 10 ? `${sec.toFixed(1)}s` : `${sec.toFixed(1)}s`
}

const breakdown = computed(() => {
  return [...stats.value.byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type}: ${count}`)
    .join(' · ')
})
</script>

<template>
  <div
    v-if="show"
    class="shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-2"
  >
    <div class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-1.5 text-slate-400">
        <svg class="size-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" />
        </svg>
        <span class="font-semibold text-slate-300">{{ stats.totalAgents }}</span>
        <span>agents</span>
      </div>

      <div v-if="stats.totalTokens > 0" class="flex items-center gap-1.5 text-slate-400">
        <svg class="size-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span class="font-semibold text-slate-300">{{ formatTokens(stats.totalTokens) }}</span>
        <span>tokens</span>
      </div>

      <div v-if="stats.totalDurationMs > 0" class="flex items-center gap-1.5 text-slate-400">
        <svg class="size-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span class="font-semibold text-slate-300">{{ formatDuration(stats.totalDurationMs) }}</span>
        <span>total</span>
      </div>

      <!-- Per-type breakdown -->
      <div
        v-if="breakdown"
        class="ml-auto text-[11px] text-slate-600 font-mono"
      >
        {{ breakdown }}
      </div>
    </div>
  </div>
</template>
