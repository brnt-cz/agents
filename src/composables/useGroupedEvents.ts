import { computed, ref, type Ref } from 'vue'
import type { AgentEvent } from './useAgentEvents'

export interface AgentGroup {
  id: string
  agent_type: string
  description: string
  dispatch?: AgentEvent   // PreToolUse
  start?: AgentEvent      // SubagentStart
  stop?: AgentEvent       // SubagentStop
  result?: AgentEvent     // PostToolUse
  status: 'running' | 'completed'
}

export type TimelineItem =
  | { type: 'group'; group: AgentGroup }
  | { type: 'event'; event: AgentEvent }

export function useGroupedEvents(events: Ref<AgentEvent[]>) {
  const dismissedIds = ref(new Set<string>())

  function dismissGroup(id: string) {
    dismissedIds.value = new Set([...dismissedIds.value, id])
  }

  const timelineItems = computed<TimelineItem[]>(() => {
    const groups = new Map<string, AgentGroup>()
    // First pass: index SubagentStart/Stop by agent_id
    const startByAgentId = new Map<string, AgentEvent>()
    const stopByAgentId = new Map<string, AgentEvent>()

    for (const e of events.value) {
      if (e.event === 'SubagentStart' && e.agent_id && e.agent_id !== 'unknown') {
        startByAgentId.set(e.agent_id, e)
      }
      if (e.event === 'SubagentStop' && e.agent_id && e.agent_id !== 'unknown') {
        stopByAgentId.set(e.agent_id, e)
      }
    }

    // Second pass: index PostToolUse by agent_id (from F1 hook extension)
    const postByAgentId = new Map<string, AgentEvent>()
    for (const e of events.value) {
      if (e.event === 'PostToolUse' && e.agent_id && e.agent_id !== 'unknown') {
        postByAgentId.set(e.agent_id, e)
      }
    }

    // Build groups from SubagentStart as the anchor
    for (const [agentId, startEvt] of startByAgentId) {
      const group: AgentGroup = {
        id: agentId,
        agent_type: startEvt.agent_type || 'unknown',
        description: '',
        start: startEvt,
        stop: stopByAgentId.get(agentId),
        status: stopByAgentId.has(agentId) ? 'completed' : 'running',
      }

      // Attach PostToolUse result if agent_id matches
      const post = postByAgentId.get(agentId)
      if (post) {
        group.result = post
        group.description = post.description || ''
      }

      groups.set(agentId, group)
    }

    // Match PreToolUse → group via session_id + agent_type + description + time proximity
    const preEvents = events.value.filter(e => e.event === 'PreToolUse')
    for (const pre of preEvents) {
      let matched = false
      for (const group of groups.values()) {
        if (group.dispatch) continue // already paired
        if (group.start &&
            pre.session_id === group.start.session_id &&
            pre.agent_type === group.agent_type) {
          // Check description match
          const descMatch = pre.description === (group.result?.description || group.description) ||
                            pre.description === group.description
          // Check time proximity: PreToolUse should be shortly before SubagentStart
          const preTime = new Date(pre.timestamp).getTime()
          const startTime = new Date(group.start.timestamp).getTime()
          const timeDiff = startTime - preTime

          if (descMatch || (timeDiff >= 0 && timeDiff < 2000)) {
            group.dispatch = pre
            if (!group.description && pre.description) {
              group.description = pre.description
            }
            matched = true
            break
          }
        }
      }
      if (!matched) {
        // PreToolUse without a matching group — could be for an agent that hasn't started yet
        // Try to find a PostToolUse pair without agent_id
        const post = events.value.find(e =>
          e.event === 'PostToolUse' &&
          e.session_id === pre.session_id &&
          e.agent_type === pre.agent_type &&
          e.description === pre.description &&
          (!e.agent_id || e.agent_id === 'unknown')
        )

        if (post) {
          const syntheticId = `pre-${pre.timestamp}-${pre.agent_type}`
          if (!groups.has(syntheticId)) {
            groups.set(syntheticId, {
              id: syntheticId,
              agent_type: pre.agent_type || 'unknown',
              description: pre.description || '',
              dispatch: pre,
              result: post,
              status: 'completed',
            })
          }
        }
      }
    }

    // Collect events that are part of a group (including dismissed — to hide them too)
    const groupedEventSet = new Set<AgentEvent>()
    for (const group of groups.values()) {
      if (group.dispatch) groupedEventSet.add(group.dispatch)
      if (group.start) groupedEventSet.add(group.start)
      if (group.stop) groupedEventSet.add(group.stop)
      if (group.result) groupedEventSet.add(group.result)
    }

    // Remove dismissed groups from rendering
    for (const id of dismissedIds.value) {
      groups.delete(id)
    }

    // Build timeline: groups appear at the position of their earliest event
    const items: { index: number; item: TimelineItem }[] = []

    // Map group → earliest event index
    for (const group of groups.values()) {
      let earliest = Infinity
      const evts = [group.dispatch, group.start, group.stop, group.result].filter(Boolean) as AgentEvent[]
      for (const evt of evts) {
        const idx = events.value.indexOf(evt)
        if (idx >= 0 && idx < earliest) earliest = idx
      }
      if (earliest < Infinity) {
        items.push({ index: earliest, item: { type: 'group', group } })
      }
    }

    // Add ungrouped events
    for (let i = 0; i < events.value.length; i++) {
      const e = events.value[i]
      if (!groupedEventSet.has(e)) {
        items.push({ index: i, item: { type: 'event', event: e } })
      }
    }

    // Sort by original event order
    items.sort((a, b) => a.index - b.index)
    return items.map(i => i.item)
  })

  return { timelineItems, dismissGroup }
}
