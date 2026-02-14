<script setup lang="ts">
import { computed } from 'vue'
import AgentTimeline from './components/AgentTimeline.vue'
import { useAgentEvents } from './composables/useAgentEvents'

const {
  filteredEvents,
  connected,
  sessions,
  agentTypes,
  filterSession,
  filterAgentType,
  clearEvents,
} = useAgentEvents()

const eventCount = computed(() => filteredEvents.value.length)
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="shrink-0 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-base font-semibold text-slate-100 tracking-tight">
            Agent Board
          </h1>
          <div class="flex items-center gap-1.5">
            <span
              class="w-2 h-2 rounded-full transition-colors"
              :class="connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-600'"
            />
            <span class="text-[11px] text-slate-500">
              {{ connected ? 'Live' : 'Disconnected' }}
            </span>
          </div>
          <span class="text-[11px] text-slate-600 font-mono">
            {{ eventCount }} events
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Session filter -->
          <select
            v-if="sessions.length > 1"
            v-model="filterSession"
            class="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1"
          >
            <option :value="null">All sessions</option>
            <option v-for="s in sessions" :key="s" :value="s">
              {{ s.slice(0, 12) }}…
            </option>
          </select>

          <!-- Agent type filter -->
          <select
            v-if="agentTypes.length > 1"
            v-model="filterAgentType"
            class="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1"
          >
            <option :value="null">All types</option>
            <option v-for="t in agentTypes" :key="t" :value="t">
              {{ t }}
            </option>
          </select>

          <button
            class="text-[11px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
            @click="clearEvents"
          >
            Clear
          </button>
        </div>
      </div>
    </header>

    <!-- Timeline -->
    <main class="flex-1 overflow-hidden p-4">
      <AgentTimeline :events="filteredEvents" />
    </main>
  </div>
</template>
