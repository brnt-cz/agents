#!/usr/bin/env bash
# Hook script for Claude Code - logs agent communication events to NDJSON file
# Used by: PreToolUse (Task), PostToolUse (Task), SubagentStart, SubagentStop

set -euo pipefail

LOG_FILE="$HOME/.claude/agent-events.jsonl"

# Read hook input from stdin (JSON payload from Claude Code)
INPUT=$(cat)

# Extract event type and session_id from the JSON input
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# Current timestamp in ISO 8601
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Build the log entry based on event type
case "$EVENT" in
  PreToolUse)
    TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // "unknown"')
    DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // ""')
    PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

    jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg event "$EVENT" \
      --arg session "$SESSION_ID" \
      --arg tool "$TOOL_NAME" \
      --arg atype "$AGENT_TYPE" \
      --arg desc "$DESCRIPTION" \
      --arg prompt "$PROMPT" \
      '{
        timestamp: $ts,
        event: $event,
        session_id: $session,
        tool_name: $tool,
        agent_type: $atype,
        description: $desc,
        prompt: $prompt
      }' >> "$LOG_FILE"
    ;;

  PostToolUse)
    # Build JSON directly from input — avoids shell variable limits for large results
    echo "$INPUT" | jq -c \
      --arg ts "$TIMESTAMP" \
      --arg event "$EVENT" \
      --arg session "$SESSION_ID" \
      '{
        timestamp: $ts,
        event: $event,
        session_id: $session,
        tool_name: (.tool_name // "unknown"),
        agent_type: (.tool_input.subagent_type // "unknown"),
        description: (.tool_input.description // ""),
        result: ([.tool_response.content[]? | select(.type == "text") | .text] | join("\n"))
      }' >> "$LOG_FILE"
    ;;

  SubagentStart)
    AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "unknown"')
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')

    jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg event "$EVENT" \
      --arg session "$SESSION_ID" \
      --arg aid "$AGENT_ID" \
      --arg atype "$AGENT_TYPE" \
      '{
        timestamp: $ts,
        event: $event,
        session_id: $session,
        agent_id: $aid,
        agent_type: $atype
      }' >> "$LOG_FILE"
    ;;

  SubagentStop)
    AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "unknown"')
    AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')

    jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg event "$EVENT" \
      --arg session "$SESSION_ID" \
      --arg aid "$AGENT_ID" \
      --arg atype "$AGENT_TYPE" \
      '{
        timestamp: $ts,
        event: $event,
        session_id: $session,
        agent_id: $aid,
        agent_type: $atype
      }' >> "$LOG_FILE"
    ;;

  *)
    # Unknown event, log raw
    jq -n -c \
      --arg ts "$TIMESTAMP" \
      --arg event "$EVENT" \
      --arg session "$SESSION_ID" \
      --argjson input "$INPUT" \
      '{
        timestamp: $ts,
        event: $event,
        session_id: $session,
        raw: $input
      }' >> "$LOG_FILE"
    ;;
esac
