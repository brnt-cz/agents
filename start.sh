#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=6660
LOG="$DIR/nohup.out"

# Kill existing process on the port
if pid=$(lsof -ti:"$PORT" 2>/dev/null); then
  kill "$pid" 2>/dev/null && sleep 0.5
fi

# Start dev server in background
cd "$DIR"
nohup npm run dev -- --port "$PORT" > "$LOG" 2>&1 &
disown

echo "Agent Board running on http://localhost:$PORT (log: $LOG)"