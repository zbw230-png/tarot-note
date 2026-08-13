import { useState, useEffect, useRef } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
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

// --- Fan layout constants ---
const FAN_W = 48 // px, card width in the fan
const TOTAL_ANGLE = 132 // degrees, total fan spread (-half .. +half)
const HOVER_LIFT = 24 // px, radial lift when hovered
const SLOT_W = 56 // px, spread slot width

/** Angle (degrees) of the i-th card out of n, centered around 0. */
function angleOf(i: number, n: number): number {
  if (n <= 1) return 0
  return -TOTAL_ANGLE / 2 + (i / (n - 1)) * TOTAL_ANGLE
}

/** Fisher–Yates shuffle (browser Math.random is fine here). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The face-down card back (CSS-drawn, no asset needed). */
function CardBack({ lifted = false }: { lifted?: boolean }) {
  return (
    <div
      className={`relative w-full aspect-[7/12] rounded-md overflow-hidden border shadow-md transition-colors ${
        lifted
          ? 'border-purple-300/80 shadow-lg shadow-purple-500/40 ring-2 ring-purple-400/50'
          : 'border-purple-400/40'
      }`}
      style={{ background: 'radial-gradient(circle at 50% 38%, #44397d 0%, #2a2450 55%, #18143a 100%)' }}
    >
      <div className="absolute inset-[6%] rounded-[4px] border border-purple-300/25" />
      <div className="absolute inset-[12%] rounded-[4px] border border-purple-300/15" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-purple-200/60 text-xl leading-none select-none">✦</span>
      </div>
    </div>
  )
}

/** A draggable card in the fan (rotated around the bottom-center origin). */
function FanCard({
  item,
  angle,
  hovered,
  onHover,
  onLeave,
}: {
  item: DeckCard
  angle: number
  hovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draw-${item.card.id}`,
  })
  const lift = hovered ? HOVER_LIFT : 0

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
        left: `calc(50% - ${FAN_W / 2}px)`,
        bottom: 0,
        width: FAN_W,
        transformOrigin: 'bottom center',
        transform: `translateY(${-lift}px) rotate(${angle}deg)`,
        zIndex: hovered ? 200 : Math.round(100 - Math.abs(angle)),
        transition: 'transform 0.16s ease',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(item.card.number * 0.006, 0.4), duration: 0.25 }}
      >
        <CardBack lifted={hovered} />
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

/** Shuffle animation: a few card backs jittering, then settle into the fan. */
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
 * Draw mode: shuffle the deck, fan the cards out face-down like an opened fan,
 * then drag face-down cards onto the spread. Each card carries a random
 * orientation assigned at shuffle time, revealed only when placed. Hovering
 * (mouse) or swiping across (touch) lifts the card under the cursor/finger.
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
  const fanRef = useRef<HTMLDivElement>(null)

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
  }, [spread.key, spread.cardCount])

  const placedIds = new Set(slots.filter(Boolean).map((c) => c!.card.id))
  const filled = slots.filter(Boolean).length
  const visible = deck.filter((d) => !placedIds.has(d.card.id))
  const activeItem =
    activeDragId && activeDragId.startsWith('draw-')
      ? deck.find((d) => `draw-${d.card.id}` === activeDragId) ?? null
      : null

  const handleShuffle = () => {
    setShuffling(true)
    setSlots(Array(spread.cardCount).fill(null))
    setShuffled(false)
    setTimeout(() => {
      const decked = allCards.map((card) => ({ card, reversed: Math.random() < 0.5 }))
      setDeck(shuffle(decked))
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

  // Map a touch point to the nearest card in the fan (for the swipe-lift effect).
  const handleTouchMove = (e: ReactTouchEvent) => {
    if (activeDragId || !fanRef.current) return
    const n = visible.length
    if (n === 0) return
    const touch = e.touches[0]
    const rect = fanRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.bottom
    const dx = touch.clientX - cx
    const dy = cy - touch.clientY
    if (Math.hypot(dx, dy) < 1) return

    const half = TOTAL_ANGLE / 2
    let angle = (Math.atan2(dx, dy) * 180) / Math.PI
    angle = Math.max(-half, Math.min(half, angle))
    const idx = n <= 1 ? 0 : Math.round(((angle + half) / TOTAL_ANGLE) * (n - 1))
    setHoverIndex(idx)
  }

  const clearHover = () => setHoverIndex(null)

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
              划选 / 拖动 {spread.cardCount} 张卡到牌阵
            </span>
          )}
        </div>

        {/* Shuffle animation / fan */}
        {shuffling ? (
          <ShuffleVisual />
        ) : shuffled ? (
          <div
            ref={fanRef}
            className="relative w-full h-[140px] overflow-visible"
            onTouchMove={handleTouchMove}
            onTouchEnd={clearHover}
            onTouchCancel={clearHover}
            onMouseLeave={clearHover}
          >
            {visible.map((item, i) => (
              <FanCard
                key={item.card.id}
                item={item}
                angle={angleOf(i, visible.length)}
                hovered={hoverIndex === i}
                onHover={() => setHoverIndex(i)}
                onLeave={clearHover}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <p className="text-sm">点击「洗牌」洗好牌后，从扇形卡背中抽出你的牌</p>
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
            <CardBack />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
