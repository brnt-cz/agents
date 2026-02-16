<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AgentGroup } from '../composables/useGroupedEvents'
import { renderMarkdown } from '../composables/useMarkdown'

const props = defineProps<{
  group: AgentGroup
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()

const expanded = ref(false)

const agentStyle = computed(() => {
  switch (props.group.agent_type) {
    case 'Explore': return { icon: 'search', badge: 'bg-sky-500/15 text-sky-400 ring-sky-500/25' }
    case 'Plan': return { icon: 'clipboard', badge: 'bg-amber-500/15 text-amber-400 ring-amber-500/25' }
    case 'Bash': return { icon: 'terminal', badge: 'bg-slate-500/15 text-slate-300 ring-slate-500/25' }
    case 'general-purpose': return { icon: 'cpu', badge: 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/25' }
    case 'vue3-typescript-expert': return { icon: 'code', badge: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/25' }
    case 'tailwind-expert': return { icon: 'palette', badge: 'bg-pink-500/15 text-pink-400 ring-pink-500/25' }
    case 'sports-analyst': return { icon: 'trophy', badge: 'bg-purple-500/15 text-purple-400 ring-purple-500/25' }
    case 'nextgen-fullstack-dev': return { icon: 'layers', badge: 'bg-orange-500/15 text-orange-400 ring-orange-500/25' }
    case 'creative-web-designer': return { icon: 'brush', badge: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/25' }
    case 'evolu-dev-expert': return { icon: 'database', badge: 'bg-green-500/15 text-green-400 ring-green-500/25' }
    default: return { icon: 'wrench', badge: 'bg-slate-500/15 text-slate-400 ring-slate-500/25' }
  }
})

const timeFormatted = computed(() => {
  const evt = props.group.dispatch || props.group.start
  if (!evt) return ''
  const d = new Date(evt.timestamp)
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const statsFormatted = computed(() => {
  const parts: string[] = []
  const r = props.group.result
  if (r?.duration_ms != null) {
    const sec = r.duration_ms / 1000
    parts.push(`${sec.toFixed(1)}s`)
  }
  if (r?.total_tokens != null) {
    const k = r.total_tokens / 1000
    parts.push(k >= 10 ? `${Math.round(k)}k tokens` : `${k.toFixed(1)}k tokens`)
  }
  return parts.join(' · ')
})

const promptText = computed(() => props.group.dispatch?.prompt || '')
const resultText = computed(() => props.group.result?.result || '')
const resultHtml = computed(() => resultText.value ? renderMarkdown(resultText.value) : '')

function saveResult() {
  if (!resultText.value) return
  const blob = new Blob([resultText.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const name = (props.group.description || props.group.agent_type || 'result')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50)
  a.download = `${name}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="event-enter bg-slate-900/80 rounded-lg shadow-sm shadow-black/20 transition-colors hover:bg-slate-900">
    <!-- Collapsed: single-line header -->
    <div
      class="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
      @click="expanded = !expanded"
    >
      <!-- Expand chevron -->
      <svg
        class="size-5 text-white transition-transform shrink-0"
        :class="{ 'rotate-90': expanded }"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="m9 18 6-6-6-6"/>
      </svg>

      <span class="text-xs font-mono text-slate-500">{{ timeFormatted }}</span>

      <!-- Status badge -->
      <span
        v-if="group.status === 'running'"
        class="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400"
      >
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
        RUNNING
      </span>
      <span
        v-else
        class="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-500/15 text-slate-400"
      >
        DONE
      </span>

      <!-- Agent badge -->
      <span
        v-if="group.agent_type && group.agent_type !== 'unknown'"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ring-1 text-[11px] font-semibold"
        :class="agentStyle.badge"
      >
        {{ group.agent_type }}
      </span>

      <!-- Description -->
      <span
        v-if="group.description"
        class="text-sm text-slate-200 font-medium truncate"
      >
        {{ group.description }}
      </span>

      <!-- Stats (right-aligned) -->
      <span
        v-if="statsFormatted"
        class="ml-auto text-[11px] text-slate-500 font-mono shrink-0"
      >
        {{ statsFormatted }}
      </span>

      <!-- Dismiss button -->
      <button
        class="shrink-0 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        :class="{ 'ml-auto': !statsFormatted }"
        title="Dismiss"
        @click.stop="emit('dismiss', group.id)"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>

    <!-- Expanded content -->
    <div v-if="expanded" class="px-4 pb-3 space-y-3 border-t border-slate-800/50">
      <!-- Prompt -->
      <div v-if="promptText" class="mt-3">
        <div class="text-[10px] text-slate-600 font-bold tracking-wider mb-1">PROMPT</div>
        <pre class="text-xs text-slate-400 whitespace-pre-wrap break-words font-mono leading-relaxed bg-slate-950/50 rounded px-3 py-2 max-h-64 overflow-y-auto">{{ promptText }}</pre>
      </div>

      <!-- Result (markdown) -->
      <div v-if="resultText" class="mt-2">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] text-slate-600 font-bold tracking-wider">RESULT</span>
          <button
            class="text-[10px] text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
            title="Save as .md"
            @click="saveResult"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </button>
        </div>
        <div
          class="md-result text-xs leading-relaxed bg-slate-950/50 rounded px-3 py-2 max-h-64 overflow-y-auto"
          v-html="resultHtml"
        />
      </div>

      <!-- Timeline phases -->
      <div class="flex flex-wrap gap-3 text-[10px] text-slate-600 font-mono mt-2">
        <span v-if="group.dispatch">DISPATCH {{ new Date(group.dispatch.timestamp).toLocaleTimeString('cs-CZ') }}</span>
        <span v-if="group.start">START {{ new Date(group.start.timestamp).toLocaleTimeString('cs-CZ') }}</span>
        <span v-if="group.stop">STOP {{ new Date(group.stop.timestamp).toLocaleTimeString('cs-CZ') }}</span>
        <span v-if="group.result">RESULT {{ new Date(group.result.timestamp).toLocaleTimeString('cs-CZ') }}</span>
      </div>
    </div>
  </div>
</template>
