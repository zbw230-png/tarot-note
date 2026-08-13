import { useState, useEffect, useRef } from 'react'
import type { TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import type { SpreadDef } from '../lib/spreads'
import type { TarotCard } from '../lib/cards'
import { allCards, getCardImage } from '../lib/cards'
import { makeParsedCard, type ParsedCard } from '../lib/parser'
import { getLayout } from '../lib/layouts'

interface Props {
  spread: SpreadDef
  onReadingStart: (cards: ParsedCard[]) => void
  disabled: boolean
}

/** A card in the shuffled deck, with a hidden (face-down) orientation. */
interface DeckCard {
  card: TarotCard
  reversed: boolean
}

// --- Arc carousel constants ---
const FAN_W = 56 // px, card width
const STEP_DEG = 7 // degrees between adjacent cards (a bit of fan overlap)
const VISIBLE_ANGLE = 45 // half-angle of the visible arc window
const R = 360 // arc radius, px
const HOVER_LIFT = 16 // px, lift of the highlighted center card
const FAN_TOP = 70 // px, y of the center card's midpoint from container top
const SLOT_W = 56 // px, spread slot width

const RAD = Math.PI / 180
const PIXELS_PER_CARD = R * STEP_DEG * RAD // horizontal distance per card at the center

/** Fisher–Yates shuffle (browser Math.random is fine here). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Deterministic hash (FNV-1a) from a card id → integer seed. */
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small deterministic PRNG for per-card imperfections. */
function makeRand(seed: number): () => number {
  let s = (seed % 233280) + 1
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** SVG turbulence noise (grayscale) for a paper-grain overlay. */
const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** A card back (unified design), with subtle per-card imperfections. */
function CardBack({
  lifted = false,
  seed = 0,
}: {
  lifted?: boolean
  seed?: number
}) {
  const rand = makeRand(seed)
  const rot = (rand() - 0.5) * 4 // −2°..+2° pattern skew
  const bright = 0.96 + rand() * 0.08 // slight color variance
  const contrast = 0.97 + rand() * 0.06
  const saturate = 0.92 + rand() * 0.14
  const grain = 0.05 + rand() * 0.06 // paper grain strength

  return (
    <div
      className={`relative w-full aspect-[7/12] rounded-md overflow-hidden border shadow-md transition-colors ${
        lifted
          ? 'border-amber-300/80 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/60'
          : 'border-black/40'
      }`}
    >
      <img
        src="/cards/back1.jpg"
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none"
        style={{
          transform: `rotate(${rot}deg) scale(1.06)`,
          filter: `brightness(${bright}) contrast(${contrast}) saturate(${saturate})`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: grain, backgroundImage: NOISE_URI, mixBlendMode: 'overlay' }}
      />
      <div
        className="absolute inset-0 pointer-events-none rounded-md"
        style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)' }}
      />
    </div>
  )
}

/** A draggable card on the arc. */
function FanCard({
  item,
  phi,
  x,
  y,
  scale,
  lifted,
  onHover,
  onLeave,
}: {
  item: DeckCard
  phi: number
  x: number
  y: number
  scale: number
  lifted: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draw-${item.card.id}`,
  })
  const lift = lifted ? HOVER_LIFT : 0

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `${y}px`,
        width: FAN_W,
        transform: `translate(-50%, -50%) rotate(${phi}deg) scale(${scale}) translateY(${-lift}px)`,
        zIndex: lifted ? 300 : Math.round(100 - Math.abs(phi)),
        transition: 'transform 0.15s ease',
        opacity: isDragging ? 0.3 : 1,
        willChange: 'transform',
      }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <CardBack lifted={lifted} seed={hashSeed(item.card.id)} />
      </motion.div>
    </button>
  )
}

/** A spread slot that accepts a dropped face-down card (reveals face + orientation). */
function Slot({
  index,
  spread,
  item,
  onTap,
}: {
  index: number
  spread: SpreadDef
  item: DeckCard | null
  onTap: (index: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` })
  const layout = getLayout(spread.key)
  const spot = layout.spots[index] || { x: 50, y: 50 }
  const posLabel = spread.positions[index]?.label || `牌${index + 1}`

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onTap(index)}
      className="absolute flex flex-col items-center cursor-pointer"
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: 'translate(-50%, -50%)', width: SLOT_W }}
    >
      {item ? (
        <>
          <motion.span
            initial={{ scale: 0.5, rotateY: 90 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ duration: 0.35 }}
            className={`relative w-full rounded-md overflow-hidden shadow-lg shadow-black/60 border bg-black/40 block ${
              isOver ? 'border-purple-400 ring-2 ring-purple-400/60' : 'border-white/15'
            }`}
          >
            <img
              src={getCardImage(item.card)}
              alt={item.card.name}
              draggable={false}
              className="block w-full h-auto select-none pointer-events-none"
              style={item.reversed ? { transform: 'rotate(180deg)' } : undefined}
            />
          </motion.span>
          <span className="mt-1 flex flex-col items-center leading-tight">
            <span className="text-[10px] text-purple-300 font-medium whitespace-nowrap">
              {posLabel}
            </span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {item.card.name}
              {item.reversed ? <span className="text-orange-400"> 逆</span> : ''}
            </span>
          </span>
        </>
      ) : (
        <>
          <span
            className={`w-full aspect-[7/12] rounded-md border-2 border-dashed flex items-center justify-center transition ${
              isOver ? 'border-purple-400 bg-purple-500/20' : 'border-gray-600/50 bg-gray-800/30'
            }`}
          >
            {isOver ? (
              <span className="text-purple-200 text-sm font-medium">放置</span>
            ) : (
              <span className="text-gray-600 text-lg leading-none">＋</span>
            )}
          </span>
          <span className="mt-1 text-[10px] text-gray-500 whitespace-nowrap">{posLabel}</span>
        </>
      )}
    </button>
  )
}

/** Shuffle animation: a few card backs jittering, then settle into the arc. */
function ShuffleVisual() {
  const offsets = [-30, -15, 0, 15, 30]
  return (
    <div className="relative h-44 flex items-center justify-center">
      {offsets.map((off, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ x: off, y: 0, rotate: 0, opacity: 0 }}
          animate={{
            x: [off, off - 34, off + 34, off - 12, off],
            y: [0, 18, -18, 6, 0],
            rotate: [0, -26, 26, -10, 0],
            opacity: 1,
          }}
          transition={{ duration: 0.9, times: [0, 0.25, 0.5, 0.75, 1] }}
          style={{ width: 48 }}
        >
          <CardBack />
        </motion.div>
      ))}
      <p className="absolute bottom-0 text-xs text-purple-300">洗牌中…</p>
    </div>
  )
}

/**
 * Draw mode: shuffle the deck, lay cards out face-down along a scrollable arc,
 * then drag face-down cards onto the spread. Each card carries a random
 * orientation assigned at shuffle time, revealed only when placed. Swipe
 * (touch) / scroll (wheel) to browse the arc; the center card is highlighted.
 */
export default function DrawMode({ spread, onReadingStart, disabled }: Props) {
  const [deck, setDeck] = useState<DeckCard[]>([])
  const [slots, setSlots] = useState<(DeckCard | null)[]>(() =>
    Array(spread.cardCount).fill(null)
  )
  const [shuffling, setShuffling] = useState(false)
  const [shuffled, setShuffled] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [offset, setOffset] = useState(0)
  const lastXRef = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  )

  useEffect(() => {
    setDeck([])
    setSlots(Array(spread.cardCount).fill(null))
    setShuffled(false)
    setShuffling(false)
    setHoverIndex(null)
    setOffset(0)
  }, [spread.key, spread.cardCount])

  const placedIds = new Set(slots.filter(Boolean).map((c) => c!.card.id))
  const filled = slots.filter(Boolean).length
  const visible = deck.filter((d) => !placedIds.has(d.card.id))
  const activeItem =
    activeDragId && activeDragId.startsWith('draw-')
      ? deck.find((d) => `draw-${d.card.id}` === activeDragId) ?? null
      : null

  const centerIndex = Math.round(offset)
  const liftedIndex = hoverIndex ?? centerIndex

  const clampOffset = (v: number) => {
    const max = Math.max(0, visible.length - 1)
    return Math.min(max, Math.max(0, v))
  }

  const handleShuffle = () => {
    setShuffling(true)
    setSlots(Array(spread.cardCount).fill(null))
    setShuffled(false)
    setOffset(0)
    setTimeout(() => {
      const decked = allCards.map((card) => ({ card, reversed: Math.random() < 0.5 }))
      setDeck(shuffle(decked))
      setOffset((decked.length - 1) / 2)
      setShuffling(false)
      setShuffled(true)
    }, 900)
  }

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id))
    setHoverIndex(null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const overId = e.over ? String(e.over.id) : null
    const item = activeItem
    setActiveDragId(null)

    if (!item || !overId || !overId.startsWith('slot-')) return
    const idx = Number(overId.slice('slot-'.length))
    if (Number.isNaN(idx) || idx < 0 || idx >= spread.cardCount) return

    setSlots((prev) => {
      const next = [...prev]
      next[idx] = item
      return next
    })
  }

  const handleTapSlot = (i: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[i] = null
      return next
    })
  }

  const handleClear = () => setSlots(Array(spread.cardCount).fill(null))

  const handleSubmit = () => {
    if (filled !== spread.cardCount) return
    onReadingStart(slots.map((s) => makeParsedCard(s!.card, s!.reversed)))
  }

  // --- Arc browsing (touch swipe / mouse wheel) ---
  const handleTouchStart = (e: ReactTouchEvent) => {
    lastXRef.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: ReactTouchEvent) => {
    if (activeDragId) return
    const touch = e.touches[0]
    if (lastXRef.current == null) {
      lastXRef.current = touch.clientX
      return
    }
    const dx = touch.clientX - lastXRef.current
    lastXRef.current = touch.clientX
    if (dx !== 0) setOffset((prev) => clampOffset(prev - dx / PIXELS_PER_CARD))
  }
  const handleTouchEnd = () => {
    lastXRef.current = null
  }
  const handleWheel = (e: ReactWheelEvent) => {
    const delta = e.deltaX || e.deltaY
    if (delta !== 0) setOffset((prev) => clampOffset(prev + delta / PIXELS_PER_CARD))
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {/* Shuffle control */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleShuffle}
            disabled={shuffling}
            className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shuffled ? '🔀 重新洗牌' : '🔀 洗牌'}
          </button>
          {shuffled && !shuffling && (
            <span className="text-xs text-gray-500">
              左右滑动浏览，拖动 {spread.cardCount} 张到牌阵
            </span>
          )}
        </div>

        {/* Shuffle animation / arc carousel */}
        {shuffling ? (
          <ShuffleVisual />
        ) : shuffled ? (
          <div
            className="relative w-full h-[240px] overflow-visible select-none touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onWheel={handleWheel}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {visible.map((item, i) => {
              const phi = (i - offset) * STEP_DEG
              if (phi < -VISIBLE_ANGLE - STEP_DEG || phi > VISIBLE_ANGLE + STEP_DEG) return null
              const rad = phi * RAD
              const x = R * Math.sin(rad)
              const y = FAN_TOP + R * (1 - Math.cos(rad))
              const scale = 1 - (Math.abs(phi) / VISIBLE_ANGLE) * 0.3
              return (
                <FanCard
                  key={item.card.id}
                  item={item}
                  phi={phi}
                  x={x}
                  y={y}
                  scale={scale}
                  lifted={i === liftedIndex}
                  onHover={() => setHoverIndex(i)}
                  onLeave={() => setHoverIndex(null)}
                />
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <p className="text-sm">点击「洗牌」洗好牌后，从弧形卡背中抽出你的牌</p>
          </div>
        )}

        {/* Spread board (visible once shuffled) */}
        {shuffled && !shuffling && (
          <>
            <div
              className="relative w-full mx-auto rounded-2xl bg-gradient-to-b from-purple-950/40 to-gray-900/30 border border-purple-900/30 overflow-hidden"
              style={{ height: getLayout(spread.key).height, maxWidth: 360 }}
            >
              {spread.positions.map((_, i) => (
                <Slot key={i} index={i} spread={spread} item={slots[i] || null} onTap={handleTapSlot} />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition cursor-pointer"
              >
                清空
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={filled !== spread.cardCount || disabled}
                className={`flex-1 py-3 rounded-xl font-medium text-base transition-all ${
                  filled === spread.cardCount && !disabled
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 active:scale-[0.98]'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {disabled ? '解读中...' : `🔮 开始解读（${filled}/${spread.cardCount}）`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Floating face-down card while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-14 rounded-md overflow-hidden shadow-2xl shadow-black/70">
            <CardBack seed={hashSeed(activeItem.card.id)} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
