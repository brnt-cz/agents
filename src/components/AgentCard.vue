<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AgentEvent } from '../composables/useAgentEvents'
import { renderMarkdown } from '../composables/useMarkdown'

const props = defineProps<{
  event: AgentEvent
}>()

const expanded = ref(false)

const eventBadgeColor = computed(() => {
  switch (props.event.event) {
    case 'PreToolUse': return 'bg-blue-500/15 text-blue-400'
    case 'PostToolUse': return 'bg-emerald-500/15 text-emerald-400'
    case 'SubagentStart': return 'bg-violet-500/15 text-violet-400'
    case 'SubagentStop': return 'bg-slate-500/15 text-slate-400'
    default: return 'bg-slate-500/15 text-slate-400'
  }
})

const eventLabel = computed(() => {
  switch (props.event.event) {
    case 'PreToolUse': return 'DISPATCH'
    case 'PostToolUse': return 'RESULT'
    case 'SubagentStart': return 'START'
    case 'SubagentStop': return 'STOP'
    default: return props.event.event
  }
})

const agentStyle = computed(() => {
  switch (props.event.agent_type) {
    // Built-in agents
    case 'Explore': return { icon: 'search', badge: 'bg-sky-500/15 text-sky-400 ring-sky-500/25' }
    case 'Plan': return { icon: 'clipboard', badge: 'bg-amber-500/15 text-amber-400 ring-amber-500/25' }
    case 'Bash': return { icon: 'terminal', badge: 'bg-slate-500/15 text-slate-300 ring-slate-500/25' }
    case 'general-purpose': return { icon: 'cpu', badge: 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/25' }
    // Custom agents — colors from ~/.claude/agents/*.md
    case 'vue3-typescript-expert': return { icon: 'code', badge: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/25' } // cyan
    case 'tailwind-expert': return { icon: 'palette', badge: 'bg-pink-500/15 text-pink-400 ring-pink-500/25' } // pink
    case 'sports-analyst': return { icon: 'trophy', badge: 'bg-purple-500/15 text-purple-400 ring-purple-500/25' } // purple
    case 'nextgen-fullstack-dev': return { icon: 'layers', badge: 'bg-orange-500/15 text-orange-400 ring-orange-500/25' } // orange
    case 'creative-web-designer': return { icon: 'brush', badge: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/25' } // yellow
    case 'evolu-dev-expert': return { icon: 'database', badge: 'bg-green-500/15 text-green-400 ring-green-500/25' } // green
    default: return { icon: 'wrench', badge: 'bg-slate-500/15 text-slate-400 ring-slate-500/25' }
  }
})

const timeFormatted = computed(() => {
  const d = new Date(props.event.timestamp)
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const textPreview = computed(() => {
  const text = props.event.prompt || props.event.result || ''
  if (text.length <= 200) return text
  return text.slice(0, 200) + '…'
})

const fullText = computed(() => {
  return props.event.prompt || props.event.result || ''
})

const hasExpandableText = computed(() => {
  return fullText.value.length > 200
})

const statsFormatted = computed(() => {
  const parts: string[] = []
  const e = props.event
  if (e.duration_ms != null) {
    const sec = e.duration_ms / 1000
    parts.push(sec >= 10 ? `${sec.toFixed(1)}s` : `${sec.toFixed(1)}s`)
  }
  if (e.total_tokens != null) {
    const k = e.total_tokens / 1000
    parts.push(k >= 10 ? `${Math.round(k)}k tokens` : `${k.toFixed(1)}k tokens`)
  }
  return parts.join(' · ')
})

const isResult = computed(() => props.event.event === 'PostToolUse' && !!props.event.result)

const resultHtml = computed(() => {
  if (!isResult.value) return ''
  return renderMarkdown(props.event.result!)
})

function saveResult() {
  if (!props.event.result) return
  const blob = new Blob([props.event.result], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const name = (props.event.description || props.event.agent_type || 'result')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50)
  a.download = `${name}.md`
  a.click()
  URL.revokeObjectURL(url)
}

const isCompact = computed(() => {
  const e = props.event
  return e.event === 'SubagentStop' && !e.description && !fullText.value
})
</script>

<template>
  <!-- Compact single-line for empty STOP events -->
  <div
    v-if="isCompact"
    class="event-enter flex items-center gap-2 px-4 py-1.5 text-slate-600 text-[11px]"
  >
    <span class="font-mono">{{ timeFormatted }}</span>
    <span class="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500 text-[10px] font-bold tracking-wider">STOP</span>
    <span v-if="event.agent_type && event.agent_type !== 'unknown'">{{ event.agent_type }}</span>
    <span v-if="event.agent_id && event.agent_id !== 'unknown'" class="font-mono">#{{ event.agent_id.slice(0, 8) }}</span>
  </div>

  <!-- Full card for events with content -->
  <div
    v-else
    class="event-enter bg-slate-900/80 rounded-lg shadow-sm shadow-black/20 transition-colors hover:bg-slate-900"
  >
    <div class="px-4 py-3">
      <!-- Header row -->
      <div class="flex items-center gap-2 mb-1.5">
        <span class="text-xs font-mono text-slate-500">{{ timeFormatted }}</span>
        <span
          class="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider"
          :class="eventBadgeColor"
        >
          {{ eventLabel }}
        </span>
        <span
          v-if="event.agent_type && event.agent_type !== 'unknown'"
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ring-1 text-[11px] font-semibold"
          :class="agentStyle.badge"
        >
          <!-- Agent type icon -->
          <svg v-if="agentStyle.icon === 'search'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'clipboard'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'terminal'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'cpu'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'palette'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9.9-10-9.9Z" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'code'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'trophy'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'layers'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L20.84 12" /><path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L20.84 17" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'brush'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02Z" />
          </svg>
          <svg v-else-if="agentStyle.icon === 'database'" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />
          </svg>
          <svg v-else class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
          </svg>
          {{ event.agent_type }}
        </span>
        <span
          v-if="event.agent_id && event.agent_id !== 'unknown'"
          class="text-[10px] text-slate-600 font-mono"
        >
          #{{ event.agent_id.slice(0, 8) }}
        </span>
        <span
          v-if="statsFormatted"
          class="ml-auto text-[11px] text-slate-500 font-mono"
        >
          {{ statsFormatted }}
        </span>
      </div>

      <!-- Description -->
      <p
        v-if="event.description"
        class="text-sm text-slate-200 font-medium mb-1"
      >
        {{ event.description }}
      </p>

      <!-- Result as markdown -->
      <div v-if="isResult" class="mt-1.5">
        <div class="flex items-center gap-2 mb-1">
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
          class="md-result text-xs leading-relaxed bg-slate-950/50 rounded px-3 py-2 max-h-48 overflow-y-auto"
          :class="{ 'max-h-none': expanded }"
          v-html="resultHtml"
        />
        <button
          v-if="hasExpandableText"
          class="text-[11px] text-slate-500 hover:text-slate-300 mt-1 transition-colors cursor-pointer"
          @click="expanded = !expanded"
        >
          {{ expanded ? '← Collapse' : 'Expand →' }}
        </button>
      </div>

      <!-- Prompt / other text as pre -->
      <div v-else-if="fullText" class="mt-1.5">
        <pre
          class="text-xs text-slate-400 whitespace-pre-wrap break-words font-mono leading-relaxed bg-slate-950/50 rounded px-3 py-2 max-h-48 overflow-y-auto"
          :class="{ 'max-h-none': expanded }"
        >{{ expanded ? fullText : textPreview }}</pre>
        <button
          v-if="hasExpandableText"
          class="text-[11px] text-slate-500 hover:text-slate-300 mt-1 transition-colors cursor-pointer"
          @click="expanded = !expanded"
        >
          {{ expanded ? '← Collapse' : 'Expand →' }}
        </button>
      </div>
    </div>
  </div>
</template>
