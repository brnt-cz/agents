<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AgentEvent } from '../composables/useAgentEvents'

const props = defineProps<{
  event: AgentEvent
}>()

const expanded = ref(false)

const eventColor = computed(() => {
  switch (props.event.event) {
    case 'PreToolUse': return 'border-blue-500'
    case 'PostToolUse': return 'border-emerald-500'
    case 'SubagentStart': return 'border-violet-500'
    case 'SubagentStop': return 'border-slate-400'
    default: return 'border-slate-600'
  }
})

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

const agentIconName = computed(() => {
  switch (props.event.agent_type) {
    case 'Explore': return 'search'
    case 'Plan': return 'clipboard'
    case 'Bash': return 'terminal'
    case 'general-purpose': return 'cpu'
    case 'tailwind-expert': return 'palette'
    case 'vue3-typescript-expert': return 'code'
    default: return 'wrench'
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
    class="event-enter bg-slate-900/80 rounded-lg border-l-[3px] shadow-sm shadow-black/20 transition-colors hover:bg-slate-900"
    :class="eventColor"
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
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium"
        >
          <!-- Agent type icon -->
          <svg v-if="agentIconName === 'search'" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <svg v-else-if="agentIconName === 'clipboard'" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
          <svg v-else-if="agentIconName === 'terminal'" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" />
          </svg>
          <svg v-else-if="agentIconName === 'cpu'" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
          </svg>
          <svg v-else-if="agentIconName === 'palette'" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9.9-10-9.9Z" />
          </svg>
          <svg v-else-if="agentIconName === 'code'" class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          <svg v-else class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      </div>

      <!-- Description -->
      <p
        v-if="event.description"
        class="text-sm text-slate-200 font-medium mb-1"
      >
        {{ event.description }}
      </p>

      <!-- Prompt / Result preview -->
      <div v-if="fullText" class="mt-1.5">
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
