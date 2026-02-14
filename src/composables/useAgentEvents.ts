import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface AgentEvent {
  timestamp: string
  event: string
  session_id: string
  tool_name?: string
  agent_type?: string
  description?: string
  prompt?: string
  result?: string
  agent_id?: string
  _clear?: boolean
}

const events = ref<AgentEvent[]>([])
const connected = ref(false)
const filterSession = ref<string | null>(null)
const filterAgentType = ref<string | null>(null)

export function useAgentEvents() {
  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const filteredEvents = computed(() => {
    return events.value.filter(e => {
      if (filterSession.value && e.session_id !== filterSession.value) return false
      if (filterAgentType.value && e.agent_type !== filterAgentType.value) return false
      return true
    })
  })

  const sessions = computed(() => {
    const set = new Set(events.value.map(e => e.session_id))
    return [...set]
  })

  const agentTypes = computed(() => {
    const set = new Set(events.value.map(e => e.agent_type).filter(Boolean))
    return [...set] as string[]
  })

  function connect() {
    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSource('/api/events/stream')

    eventSource.onopen = () => {
      connected.value = true
    }

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AgentEvent
        if (data._clear) {
          events.value = []
          return
        }
        events.value.push(data)
      } catch {
        // skip malformed
      }
    }

    eventSource.onerror = () => {
      connected.value = false
      eventSource?.close()
      eventSource = null
      // Auto-reconnect after 2s
      reconnectTimer = setTimeout(connect, 2000)
    }
  }

  async function clearEvents() {
    await fetch('/api/events/clear', { method: 'POST' })
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connected.value = false
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return {
    events,
    filteredEvents,
    connected,
    sessions,
    agentTypes,
    filterSession,
    filterAgentType,
    clearEvents,
  }
}
