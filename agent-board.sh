#!/usr/bin/env bash
# Launcher for Agent Board — starts Vite dev server and opens Chrome in app mode

PORT=6660
PROJECT_DIR="/www/brnt/agents"

# Check if already running
if lsof -ti:$PORT >/dev/null 2>&1; then
  # Server already running, just open the app
  google-chrome --app="http://localhost:$PORT" --class=agent-board 2>/dev/null &
  exit 0
fi

# Start Vite dev server in background
cd "$PROJECT_DIR" && npm run dev -- --port $PORT &>/dev/null &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

# Open Chrome in app mode
google-chrome --app="http://localhost:$PORT" --class=agent-board 2>/dev/null &

# Keep server running until Chrome window closes
wait $SERVER_PID
