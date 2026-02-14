# Agent Board

Real-time dashboard for visualizing Claude Code sub-agent communication.

Captures `PreToolUse`, `PostToolUse`, `SubagentStart`, and `SubagentStop` hook events and displays them as a live timeline via SSE.

## Architecture

```
Claude Code Hooks  →  log-agent.sh  →  agent-events.jsonl  →  Vite Plugin (fs.watch)  →  SSE  →  Vue Frontend
```

## Stack

- **Vue 3** + TypeScript
- **Vite** with custom SSE plugin
- **Tailwind CSS v4**
- **PWA** — installable as a standalone app

## Setup

```bash
npm install
```

### Configure Claude Code hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "/path/to/hooks/log-agent.sh", "timeout": 10 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "/path/to/hooks/log-agent.sh", "timeout": 10 }]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [{ "type": "command", "command": "/path/to/hooks/log-agent.sh", "timeout": 10 }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "/path/to/hooks/log-agent.sh", "timeout": 10 }]
      }
    ]
  }
}
```

Replace `/path/to/hooks/log-agent.sh` with the absolute path to `hooks/log-agent.sh` in this project.

## Usage

```bash
npm run dev
```

Open `http://localhost:6660` in a browser. Start a Claude Code session that uses sub-agents (Task tool) — events will appear in real-time.

### Desktop launcher

Run `agent-board.sh` to auto-start the dev server and open Chrome in app mode.

## API

| Endpoint | Description |
|---|---|
| `GET /api/events` | All events as JSON array |
| `GET /api/events/stream` | SSE stream for real-time updates |
| `POST /api/events/clear` | Clear all events |

---

# Agent Board (CZ)

Real-time dashboard pro vizualizaci komunikace sub-agentů v Claude Code.

Zachycuje hook eventy `PreToolUse`, `PostToolUse`, `SubagentStart` a `SubagentStop` a zobrazuje je jako živou timeline přes SSE.

## Architektura

```
Claude Code Hooks  →  log-agent.sh  →  agent-events.jsonl  →  Vite Plugin (fs.watch)  →  SSE  →  Vue Frontend
```

## Stack

- **Vue 3** + TypeScript
- **Vite** s vlastním SSE pluginem
- **Tailwind CSS v4**
- **PWA** — instalovatelné jako samostatná aplikace

## Instalace

```bash
npm install
```

### Konfigurace Claude Code hooks

Přidejte do `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "/cesta/k/hooks/log-agent.sh", "timeout": 10 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "/cesta/k/hooks/log-agent.sh", "timeout": 10 }]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [{ "type": "command", "command": "/cesta/k/hooks/log-agent.sh", "timeout": 10 }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{ "type": "command", "command": "/cesta/k/hooks/log-agent.sh", "timeout": 10 }]
      }
    ]
  }
}
```

Nahraďte `/cesta/k/hooks/log-agent.sh` absolutní cestou k souboru `hooks/log-agent.sh` v tomto projektu.

## Spuštění

```bash
npm run dev
```

Otevřete `http://localhost:6660` v prohlížeči. Spusťte Claude Code session, která používá sub-agenty (Task tool) — eventy se budou zobrazovat v reálném čase.

### Desktop launcher

Spusťte `agent-board.sh` pro automatický start dev serveru a otevření Chrome v app mode.

## API

| Endpoint | Popis |
|---|---|
| `GET /api/events` | Všechny eventy jako JSON pole |
| `GET /api/events/stream` | SSE stream pro real-time aktualizace |
| `POST /api/events/clear` | Smazat všechny eventy |
