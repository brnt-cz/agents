import { watch, onUnmounted, type Ref } from 'vue'
import type { AgentGroup } from './useGroupedEvents'

// ─── Types ───────────────────────────────────────────────────────────

type AnimPhase = 'entering' | 'working' | 'leaving' | 'gone'

interface CharacterState {
  agentId: string
  agentType: string
  body: string
  accent: string
  label: string
  phase: AnimPhase
  x: number
  targetX: number
  deskIndex: number
  walkSpeed: number
  frameTick: number
  currentFrame: 0 | 1
  facingRight: boolean
}

interface Desk {
  x: number
  occupied: boolean
  agentId: string | null
}

interface SteamParticle {
  x: number
  y: number
  life: number
}

// ─── Constants ───────────────────────────────────────────────────────

const SCALE = 3
const CANVAS_HEIGHT = 150
const LH = Math.floor(CANVAS_HEIGHT / SCALE) // 50 logical rows
const WALL_TOP = 2
const WALL_BOTTOM = 30
const FLOOR_Y = WALL_BOTTOM + 2
const CHAR_FLOOR_Y = FLOOR_Y - 9
const DOOR_X = 3
const MAX_DESKS = 6
const TARGET_FPS = 10

// ─── Agent Colors ────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, { body: string; accent: string; label: string }> = {
  'Explore':                { body: '#38bdf8', accent: '#0ea5e9', label: 'EXP' },
  'Plan':                   { body: '#fbbf24', accent: '#f59e0b', label: 'PLN' },
  'Bash':                   { body: '#94a3b8', accent: '#64748b', label: 'BSH' },
  'general-purpose':        { body: '#818cf8', accent: '#6366f1', label: 'GEN' },
  'vue3-typescript-expert': { body: '#22d3ee', accent: '#06b6d4', label: 'VUE' },
  'tailwind-expert':        { body: '#f472b6', accent: '#ec4899', label: 'TW' },
  'sports-analyst':         { body: '#a78bfa', accent: '#8b5cf6', label: 'SPR' },
  'nextgen-fullstack-dev':  { body: '#fb923c', accent: '#f97316', label: 'FS' },
  'creative-web-designer':  { body: '#facc15', accent: '#eab308', label: 'DES' },
  'evolu-dev-expert':       { body: '#4ade80', accent: '#22c55e', label: 'EVO' },
}

const DEFAULT_COLOR = { body: '#94a3b8', accent: '#64748b', label: '???' }

function getAgentColor(type: string) {
  return AGENT_COLORS[type] || DEFAULT_COLOR
}

// ─── Sprite Frames (6 wide × 9 tall) ─────────────────────────────────
// Palette: 0=transparent 1=skin 2=body 3=accent 4=legs 5=shoes 6=hair

type SpriteFrame = number[][]

const STAND: SpriteFrame = [
  [0, 0, 6, 6, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 3, 2, 2, 3, 0],
  [0, 0, 2, 2, 0, 0],
  [0, 0, 4, 4, 0, 0],
  [0, 0, 4, 4, 0, 0],
  [0, 5, 0, 0, 5, 0],
]

const WALK1: SpriteFrame = [
  [0, 0, 6, 6, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 3, 2, 2, 3, 0],
  [0, 0, 2, 2, 0, 0],
  [0, 4, 0, 4, 0, 0],
  [4, 0, 0, 0, 4, 0],
  [5, 0, 0, 0, 5, 0],
]

const WALK2: SpriteFrame = [
  [0, 0, 6, 6, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 3, 2, 2, 3, 0],
  [0, 0, 2, 2, 0, 0],
  [0, 0, 4, 0, 4, 0],
  [0, 4, 0, 0, 0, 4],
  [0, 5, 0, 0, 0, 5],
]

const TYPE1: SpriteFrame = [
  [0, 0, 6, 6, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 2, 2, 2, 2, 0],
  [3, 2, 2, 2, 2, 0],
  [0, 3, 2, 2, 3, 0],
]

const TYPE2: SpriteFrame = [
  [0, 0, 6, 6, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 2, 2, 2, 2, 0],
  [0, 2, 2, 2, 2, 3],
  [0, 3, 2, 2, 3, 0],
]

// ─── Drawing helpers ─────────────────────────────────────────────────

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.floor(x * SCALE), Math.floor(y * SCALE), w * SCALE, h * SCALE)
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  palette: Record<number, string>,
  flipX: boolean = false,
) {
  for (let row = 0; row < frame.length; row++) {
    const cols = frame[row]
    for (let col = 0; col < cols.length; col++) {
      const idx = cols[col]
      if (idx === 0) continue
      const color = palette[idx]
      if (!color) continue
      const drawCol = flipX ? (cols.length - 1 - col) : col
      px(ctx, x + drawCol, y + row, 1, 1, color)
    }
  }
}

// ─── Composable ──────────────────────────────────────────────────────

export function usePixelOffice(
  groups: Ref<AgentGroup[]>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  let canvasWidth = 900
  let logicalWidth = Math.floor(canvasWidth / SCALE)
  let animFrameId = 0
  let lastTime = 0
  let globalTick = 0

  const characters = new Map<string, CharacterState>()
  let desks: Desk[] = []
  const steam: SteamParticle[] = []

  // ─── Desk management ───────────────────────────────────────────

  function recalcDesks() {
    logicalWidth = Math.floor(canvasWidth / SCALE)
    const usableStart = 18
    const usableEnd = logicalWidth - 18
    const usableWidth = usableEnd - usableStart
    const spacing = Math.floor(usableWidth / MAX_DESKS)

    const oldDesks = desks
    desks = []
    for (let i = 0; i < MAX_DESKS; i++) {
      const old = oldDesks[i]
      desks.push({
        x: usableStart + i * spacing + Math.floor(spacing / 2),
        occupied: old?.occupied ?? false,
        agentId: old?.agentId ?? null,
      })
    }

    // Update character targets
    for (const char of characters.values()) {
      if (char.deskIndex >= 0 && char.deskIndex < desks.length) {
        char.targetX = desks[char.deskIndex].x
      }
    }
  }

  function findFreeDesk(): number {
    for (let i = 0; i < desks.length; i++) {
      if (!desks[i].occupied) return i
    }
    return -1
  }

  function releaseDesk(index: number) {
    if (index >= 0 && index < desks.length) {
      desks[index].occupied = false
      desks[index].agentId = null
    }
  }

  // ─── Scene drawing ─────────────────────────────────────────────

  function drawCeiling(ctx: CanvasRenderingContext2D) {
    px(ctx, 0, 0, logicalWidth, WALL_TOP, '#0f172a')
  }

  function drawWall(ctx: CanvasRenderingContext2D) {
    // Base wall
    px(ctx, 0, WALL_TOP, logicalWidth, WALL_BOTTOM - WALL_TOP, '#1e293b')
    // Texture dots
    for (let y = WALL_TOP + 2; y < WALL_BOTTOM; y += 3) {
      for (let x = (y % 2) * 4; x < logicalWidth; x += 7) {
        px(ctx, x, y, 1, 1, '#1e2d4a')
      }
    }
    // Baseboard
    px(ctx, 0, WALL_BOTTOM, logicalWidth, 2, '#334155')
  }

  function drawFloor(ctx: CanvasRenderingContext2D) {
    const tileSize = 4
    for (let y = FLOOR_Y; y < LH; y++) {
      for (let x = 0; x < logicalWidth; x++) {
        const tx = Math.floor(x / tileSize)
        const ty = Math.floor((y - FLOOR_Y) / tileSize)
        const light = (tx + ty) % 2 === 0
        px(ctx, x, y, 1, 1, light ? '#1a1f2e' : '#171c28')
      }
    }
  }

  // Wall decorations use fractions of logicalWidth to spread evenly
  // Layout: door(2-10) ... painting(15%) ... window(30%) ... clock(45%) ... whiteboard(60%) ... painting2(75%) ... plant+coffee(right edge)

  function drawWindow(ctx: CanvasRenderingContext2D, tick: number) {
    const wx = Math.floor(logicalWidth * 0.30), wy = 8, ww = 12, wh = 14
    // Frame
    px(ctx, wx - 1, wy - 1, ww + 2, wh + 2, '#334155')
    // Sky tint
    px(ctx, wx, wy, ww, wh, '#0c2d48')
    // Subtle shimmer
    const alpha = 0.05 * Math.sin(tick * 0.03)
    ctx.fillStyle = `rgba(56, 189, 248, ${Math.abs(alpha)})`
    ctx.fillRect(wx * SCALE, wy * SCALE, ww * SCALE, wh * SCALE)
    // Cross bars
    px(ctx, wx + Math.floor(ww / 2), wy, 1, wh, '#334155')
    px(ctx, wx, wy + Math.floor(wh / 2), ww, 1, '#334155')
    // Stars
    px(ctx, wx + 2, wy + 2, 1, 1, '#94a3b8')
    px(ctx, wx + 8, wy + 4, 1, 1, '#cbd5e1')
    px(ctx, wx + 4, wy + 10, 1, 1, '#94a3b8')
    px(ctx, wx + 10, wy + 1, 1, 1, '#64748b')
  }

  function drawPainting(ctx: CanvasRenderingContext2D) {
    // Landscape painting at ~15% of wall
    const bx = Math.floor(logicalWidth * 0.15), by = 10
    // Frame
    px(ctx, bx - 1, by - 1, 10, 8, '#92400e')
    // Canvas
    px(ctx, bx, by, 8, 6, '#1e3a5f')
    // Mountain
    px(ctx, bx + 1, by + 3, 1, 1, '#475569')
    px(ctx, bx + 2, by + 2, 1, 1, '#475569')
    px(ctx, bx + 3, by + 1, 1, 1, '#64748b')
    px(ctx, bx + 4, by + 2, 1, 1, '#475569')
    px(ctx, bx + 5, by + 3, 1, 1, '#475569')
    // Snow cap
    px(ctx, bx + 3, by + 1, 1, 1, '#e2e8f0')
    // Ground
    px(ctx, bx, by + 4, 8, 2, '#15803d')
    // Sun
    px(ctx, bx + 6, by + 1, 1, 1, '#fbbf24')
  }

  function drawPainting2(ctx: CanvasRenderingContext2D) {
    // Abstract art at ~75% of wall
    const bx = Math.floor(logicalWidth * 0.75), by = 10
    // Frame
    px(ctx, bx - 1, by - 1, 10, 8, '#78350f')
    // Canvas background
    px(ctx, bx, by, 8, 6, '#1e1b4b')
    // Abstract shapes
    px(ctx, bx + 1, by + 1, 2, 2, '#ef4444')
    px(ctx, bx + 4, by + 2, 3, 3, '#8b5cf6')
    px(ctx, bx + 2, by + 3, 2, 2, '#fbbf24')
    px(ctx, bx + 6, by + 1, 1, 1, '#22d3ee')
  }

  function drawWhiteboard(ctx: CanvasRenderingContext2D) {
    // Whiteboard at ~58% of wall
    const bx = Math.floor(logicalWidth * 0.58), by = 6
    // Board
    px(ctx, bx - 1, by - 1, 14, 12, '#475569')
    px(ctx, bx, by, 12, 10, '#e2e8f0')
    // Sticky notes
    px(ctx, bx + 1, by + 1, 3, 3, '#fbbf24') // yellow
    px(ctx, bx + 5, by + 1, 3, 3, '#38bdf8') // blue
    px(ctx, bx + 1, by + 5, 3, 3, '#f472b6') // pink
    px(ctx, bx + 5, by + 5, 3, 3, '#4ade80') // green
    // "Text" lines on notes
    px(ctx, bx + 1, by + 2, 2, 1, '#d97706')
    px(ctx, bx + 5, by + 2, 2, 1, '#0284c7')
    px(ctx, bx + 1, by + 6, 2, 1, '#db2777')
    px(ctx, bx + 5, by + 6, 2, 1, '#16a34a')
    // Board marker tray
    px(ctx, bx + 2, by + 10, 8, 1, '#334155')
    // Markers
    px(ctx, bx + 3, by + 10, 1, 1, '#ef4444')
    px(ctx, bx + 5, by + 10, 1, 1, '#3b82f6')
    px(ctx, bx + 7, by + 10, 1, 1, '#22c55e')
  }

  function drawDoor(ctx: CanvasRenderingContext2D) {
    const dx = 2, dy = 12, dw = 7, dh = 18
    // Frame
    px(ctx, dx - 1, dy - 1, dw + 2, dh + 2, '#475569')
    // Door body
    px(ctx, dx, dy, dw, dh, '#78350f')
    // Panels
    px(ctx, dx + 1, dy + 2, dw - 2, 5, '#92400e')
    px(ctx, dx + 1, dy + 9, dw - 2, 5, '#92400e')
    // Knob
    px(ctx, dx + dw - 2, dy + 9, 1, 1, '#fbbf24')
  }

  function drawClock(ctx: CanvasRenderingContext2D, tick: number) {
    const cx = Math.floor(logicalWidth * 0.46), cy = 10, r = 3
    // Face
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          px(ctx, cx + dx, cy + dy, 1, 1, '#e2e8f0')
        }
      }
    }
    // Center dot
    px(ctx, cx, cy, 1, 1, '#0f172a')
    // Hands (rotating)
    const sec = (tick * 0.15) % (2 * Math.PI)
    const hx = Math.round(Math.sin(sec) * 2)
    const hy = Math.round(-Math.cos(sec) * 2)
    px(ctx, cx + hx, cy + hy, 1, 1, '#ef4444')
    // Hour hand (slower)
    const hr = (tick * 0.012) % (2 * Math.PI)
    const hhx = Math.round(Math.sin(hr) * 1.5)
    const hhy = Math.round(-Math.cos(hr) * 1.5)
    px(ctx, cx + hhx, cy + hhy, 1, 1, '#0f172a')
  }

  function drawPlant(ctx: CanvasRenderingContext2D) {
    const bx = logicalWidth - 8, by = WALL_BOTTOM - 9
    // Leaves
    const greens: [number, number][] = [
      [2, 0], [3, 0],
      [1, 1], [2, 1], [3, 1], [4, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
      [1, 3], [2, 3], [3, 3], [4, 3],
    ]
    for (const [gx, gy] of greens) {
      px(ctx, bx + gx, by + gy, 1, 1, (gx + gy) % 3 === 0 ? '#16a34a' : '#22c55e')
    }
    // Stem
    px(ctx, bx + 2, by + 4, 1, 2, '#15803d')
    px(ctx, bx + 3, by + 4, 1, 2, '#15803d')
    // Pot
    px(ctx, bx + 1, by + 6, 4, 2, '#92400e')
    px(ctx, bx + 0, by + 6, 1, 1, '#78350f')
    px(ctx, bx + 5, by + 6, 1, 1, '#78350f')
  }

  function drawCoffeeMachine(ctx: CanvasRenderingContext2D) {
    const mx = logicalWidth - 15, my = WALL_BOTTOM - 8
    // Machine body
    px(ctx, mx, my, 5, 6, '#475569')
    px(ctx, mx + 1, my + 1, 3, 2, '#334155') // display
    px(ctx, mx + 1, my + 1, 1, 1, '#22d3ee') // led
    // Spout
    px(ctx, mx + 2, my + 4, 1, 2, '#334155')
    // Cup
    px(ctx, mx + 1, my + 6, 3, 2, '#e2e8f0')
    px(ctx, mx + 2, my + 6, 1, 1, '#92400e') // coffee
  }

  function drawSteam(ctx: CanvasRenderingContext2D) {
    const mx = logicalWidth - 15
    const baseY = WALL_BOTTOM - 9
    // Spawn new particle occasionally
    if (globalTick % 8 === 0) {
      steam.push({
        x: mx + 1 + Math.random() * 2,
        y: baseY,
        life: 12 + Math.random() * 6,
      })
    }
    // Update and draw
    for (let i = steam.length - 1; i >= 0; i--) {
      const p = steam[i]
      p.y -= 0.3
      p.x += (Math.random() - 0.5) * 0.4
      p.life--
      if (p.life <= 0) {
        steam.splice(i, 1)
        continue
      }
      const alpha = Math.min(1, p.life / 8) * 0.4
      ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`
      ctx.fillRect(
        Math.floor(p.x * SCALE),
        Math.floor(p.y * SCALE),
        SCALE,
        SCALE,
      )
    }
  }

  // ─── Desk drawing ──────────────────────────────────────────────

  function drawDeskBack(ctx: CanvasRenderingContext2D, desk: Desk, tick: number) {
    const dx = desk.x - 4
    const dy = CHAR_FLOOR_Y + 1 // monitor sits on desk, above character sit position

    // Monitor stand
    px(ctx, desk.x, dy + 3, 1, 2, '#475569')
    // Monitor frame
    px(ctx, dx + 1, dy - 4, 7, 5, '#334155')
    // Screen
    px(ctx, dx + 2, dy - 3, 5, 3, '#0f172a')

    if (desk.occupied) {
      // Active screen with code lines
      px(ctx, dx + 3, dy - 2, 3, 1, '#334155')
      px(ctx, dx + 3, dy - 1, 2, 1, '#475569')
      // Blinking cursor
      if (Math.floor(tick / 5) % 2 === 0) {
        px(ctx, dx + 5, dy - 1, 1, 1, '#22d3ee')
      }
      // Monitor glow
      ctx.fillStyle = 'rgba(56, 189, 248, 0.04)'
      ctx.fillRect(
        Math.floor((dx - 1) * SCALE),
        Math.floor((dy - 5) * SCALE),
        11 * SCALE,
        8 * SCALE,
      )
    }
  }

  function drawDeskFront(ctx: CanvasRenderingContext2D, desk: Desk) {
    const dx = desk.x - 5
    const dy = CHAR_FLOOR_Y + 5

    // Desk surface
    px(ctx, dx, dy, 11, 2, '#92400e')
    px(ctx, dx, dy, 11, 1, '#a16207')
    // Desk legs
    px(ctx, dx + 1, dy + 2, 1, 3, '#78350f')
    px(ctx, dx + 9, dy + 2, 1, 3, '#78350f')
    // Keyboard
    px(ctx, desk.x - 2, dy - 1, 5, 1, '#475569')

    // Chair (always in front of desk, consistent position)
    const cy = dy + 2
    px(ctx, desk.x - 2, cy, 5, 1, '#334155')
    px(ctx, desk.x - 2, cy - 2, 5, 2, '#334155')
    px(ctx, desk.x - 2, cy - 2, 1, 2, '#475569')
    px(ctx, desk.x + 2, cy - 2, 1, 2, '#475569')
    px(ctx, desk.x - 1, cy + 1, 1, 2, '#1e293b')
    px(ctx, desk.x + 1, cy + 1, 1, 2, '#1e293b')
  }

  // ─── Character drawing ─────────────────────────────────────────

  function drawCharacter(ctx: CanvasRenderingContext2D, char: CharacterState) {
    const palette: Record<number, string> = {
      1: '#e8b88a', // skin
      2: char.body,
      3: char.accent,
      4: '#334155', // legs
      5: '#1e293b', // shoes
      6: '#1e293b', // hair
    }

    let frame: SpriteFrame
    let y = CHAR_FLOOR_Y

    switch (char.phase) {
      case 'entering':
      case 'leaving':
        frame = char.currentFrame === 0 ? WALK1 : WALK2
        break
      case 'working':
        frame = char.currentFrame === 0 ? TYPE1 : TYPE2
        y = CHAR_FLOOR_Y + 1 // head + torso above desk, arms at desk level
        break
      default:
        frame = STAND
    }

    drawSprite(ctx, frame, char.x - 3, y, palette, !char.facingRight)
  }

  function drawLabel(ctx: CanvasRenderingContext2D, char: CharacterState) {
    if (char.phase !== 'working' && char.phase !== 'entering') return

    const screenX = Math.floor(char.x * SCALE)
    const screenY = Math.floor((CHAR_FLOOR_Y - 2) * SCALE)

    // Background pill
    ctx.fillStyle = char.accent + '99'
    const tw = char.label.length * 5 + 4
    ctx.fillRect(
      Math.floor(screenX - tw / 2),
      screenY - 8,
      tw,
      9,
    )

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(7, SCALE * 3)}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(char.label, screenX, screenY - 7)
  }

  // ─── Animation update ──────────────────────────────────────────

  function updateCharacters() {
    for (const [id, char] of characters) {
      char.frameTick++

      switch (char.phase) {
        case 'entering':
          char.x += char.walkSpeed
          if (char.frameTick % 6 === 0) {
            char.currentFrame = char.currentFrame === 0 ? 1 : 0
          }
          if (char.x >= char.targetX) {
            char.x = char.targetX
            char.phase = 'working'
            char.frameTick = 0
            char.currentFrame = 0
          }
          break

        case 'working':
          if (char.frameTick % 12 === 0) {
            char.currentFrame = char.currentFrame === 0 ? 1 : 0
          }
          break

        case 'leaving':
          char.x -= char.walkSpeed
          char.facingRight = false
          if (char.frameTick % 6 === 0) {
            char.currentFrame = char.currentFrame === 0 ? 1 : 0
          }
          if (char.x <= DOOR_X) {
            char.phase = 'gone'
            releaseDesk(char.deskIndex)
            characters.delete(id)
          }
          break

        case 'gone':
          characters.delete(id)
          break
      }
    }
  }

  // ─── Watch groups ──────────────────────────────────────────────

  watch(groups, (newGroups) => {
    const runningIds = new Set<string>()
    for (const g of newGroups) {
      if (g.status === 'running') runningIds.add(g.id)
    }

    // New arrivals
    for (const g of newGroups) {
      if (g.status === 'running' && !characters.has(g.id)) {
        const deskIdx = findFreeDesk()
        if (deskIdx < 0) continue // no free desk

        const colors = getAgentColor(g.agent_type)
        desks[deskIdx].occupied = true
        desks[deskIdx].agentId = g.id

        characters.set(g.id, {
          agentId: g.id,
          agentType: g.agent_type,
          body: colors.body,
          accent: colors.accent,
          label: colors.label,
          phase: 'entering',
          x: DOOR_X + 2,
          targetX: desks[deskIdx].x,
          deskIndex: deskIdx,
          walkSpeed: 0.5 + Math.random() * 0.3,
          frameTick: 0,
          currentFrame: 0,
          facingRight: true,
        })
      }
    }

    // Departures
    for (const [id, char] of characters) {
      if (!runningIds.has(id) && (char.phase === 'working' || char.phase === 'entering')) {
        char.phase = 'leaving'
        char.facingRight = false
        char.frameTick = 0
      }
    }
  }, { deep: true })

  // ─── Main render loop ─────────────────────────────────────────

  function frame(time: number) {
    animFrameId = requestAnimationFrame(frame)

    if (time - lastTime < 1000 / TARGET_FPS) return
    lastTime = time
    globalTick++

    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    // Update
    updateCharacters()

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw scene layers
    drawCeiling(ctx)
    drawWall(ctx)
    drawWindow(ctx, globalTick)
    drawFloor(ctx)
    drawDoor(ctx)
    drawClock(ctx, globalTick)
    drawPainting(ctx)
    drawWhiteboard(ctx)
    drawPainting2(ctx)
    drawPlant(ctx)
    drawCoffeeMachine(ctx)
    drawSteam(ctx)

    // Draw desks (back: monitors)
    for (const desk of desks) {
      drawDeskBack(ctx, desk, globalTick)
    }

    // Draw characters
    for (const char of characters.values()) {
      drawCharacter(ctx, char)
    }

    // Draw desks (front: surface covers sitting characters' legs)
    for (const desk of desks) {
      drawDeskFront(ctx, desk)
    }

    // Draw labels above characters
    for (const char of characters.values()) {
      drawLabel(ctx, char)
    }
  }

  // ─── Public API ────────────────────────────────────────────────

  function start() {
    recalcDesks()
    animFrameId = requestAnimationFrame(frame)
  }

  function stop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId)
      animFrameId = 0
    }
  }

  function resize(width: number) {
    canvasWidth = width
    const canvas = canvasRef.value
    if (canvas) {
      canvas.width = width
      canvas.height = CANVAS_HEIGHT
    }
    recalcDesks()
  }

  onUnmounted(stop)

  return { start, stop, resize, CANVAS_HEIGHT }
}
