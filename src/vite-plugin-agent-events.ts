import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { Plugin, ViteDevServer } from 'vite'

const LOG_FILE = path.join(os.homedir(), '.claude', 'agent-events.jsonl')

function parseJsonl(content: string): unknown[] {
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '')
  }
}

export default function agentEventsPlugin(): Plugin {
  const sseClients = new Set<{
    res: import('node:http').ServerResponse
    lastOffset: number
  }>()

  let watcher: fs.FSWatcher | null = null

  function broadcastNewEvents() {
    if (!fs.existsSync(LOG_FILE)) return

    const content = fs.readFileSync(LOG_FILE, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    for (const client of sseClients) {
      const newLines = lines.slice(client.lastOffset)
      for (const line of newLines) {
        try {
          const parsed = JSON.parse(line)
          client.res.write(`data: ${JSON.stringify(parsed)}\n\n`)
        } catch {
          // skip malformed lines
        }
      }
      client.lastOffset = lines.length
    }
  }

  return {
    name: 'agent-events',

    configureServer(server: ViteDevServer) {
      ensureLogFile()

      // Watch the log file for changes
      watcher = fs.watch(LOG_FILE, () => {
        broadcastNewEvents()
      })

      // GET /api/events - return all events as JSON array
      server.middlewares.use('/api/events/stream', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })

        const content = fs.existsSync(LOG_FILE)
          ? fs.readFileSync(LOG_FILE, 'utf-8')
          : ''
        const lines = content.split('\n').filter(l => l.trim())

        const client = { res, lastOffset: lines.length }
        sseClients.add(client)

        // Send all existing events as initial burst
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            res.write(`data: ${JSON.stringify(parsed)}\n\n`)
          } catch {
            // skip
          }
        }

        req.on('close', () => {
          sseClients.delete(client)
        })
      })

      server.middlewares.use('/api/events', (req, res, next) => {
        // Don't intercept /api/events/stream or /api/events/clear
        if (req.url && (req.url.startsWith('/stream') || req.url.startsWith('/clear'))) {
          next()
          return
        }

        const content = fs.existsSync(LOG_FILE)
          ? fs.readFileSync(LOG_FILE, 'utf-8')
          : ''
        const events = parseJsonl(content)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify(events))
      })

      // POST /api/events/clear - clear the log file
      server.middlewares.use('/api/events/clear', (_req, res) => {
        fs.writeFileSync(LOG_FILE, '')
        // Notify SSE clients about the clear
        for (const client of sseClients) {
          client.res.write(`data: ${JSON.stringify({ _clear: true })}\n\n`)
          client.lastOffset = 0
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
    },

    buildEnd() {
      if (watcher) {
        watcher.close()
        watcher = null
      }
    },
  }
}
