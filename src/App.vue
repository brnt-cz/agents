<script setup lang="ts">
import { computed } from 'vue'
import AgentTimeline from './components/AgentTimeline.vue'
import SessionSummary from './components/SessionSummary.vue'
import { useAgentEvents } from './composables/useAgentEvents'
import { useGroupedEvents } from './composables/useGroupedEvents'

const {
  filteredEvents,
  connected,
  sessions,
  agentTypes,
  filterSession,
  filterAgentType,
  clearEvents,
} = useAgentEvents()

const { timelineItems } = useGroupedEvents(filteredEvents)
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
          <div v-if="sessions.length > 1" class="relative">
            <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
            <select
              v-model="filterSession"
              class="appearance-none text-xs bg-slate-800/80 text-slate-300 border border-slate-700/60 rounded-lg pl-2.5 pr-7 py-1.5 outline-none transition-all hover:border-slate-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 cursor-pointer"
            >
              <option :value="null">All sessions</option>
              <option v-for="s in sessions" :key="s" :value="s">
                {{ s.slice(0, 12) }}…
              </option>
            </select>
          </div>

          <!-- Agent type filter -->
          <div v-if="agentTypes.length > 1" class="relative">
            <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
            <select
              v-model="filterAgentType"
              class="appearance-none text-xs bg-slate-800/80 text-slate-300 border border-slate-700/60 rounded-lg pl-2.5 pr-7 py-1.5 outline-none transition-all hover:border-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 cursor-pointer"
            >
              <option :value="null">All types</option>
              <option v-for="t in agentTypes" :key="t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>

          <!-- Clear button -->
          <button
            class="inline-flex items-center gap-1.5 text-[11px] text-slate-500 border border-transparent rounded-lg px-2.5 py-1.5 transition-all hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 active:scale-95 cursor-pointer"
            @click="clearEvents"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Clear
          </button>
        </div>
      </div>
    </header>

    <!-- Session Summary -->
    <SessionSummary :events="filteredEvents" />

    <!-- Timeline -->
    <main class="flex-1 overflow-hidden p-4">
      <AgentTimeline :items="timelineItems" />
    </main>
  </div>
</template>
