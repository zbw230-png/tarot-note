import { useState, useEffect } from 'react'
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

const TABLEAU_W = 44 // px, face-down card width in the 3-row tableau
const SLOT_W = 56 // px, spread slot width

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
function CardBack() {
  return (
    <div
      className="relative w-full aspect-[7/12] rounded-md overflow-hidden border border-purple-400/40 shadow-md"
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

/** A draggable face-down card in the tableau. */
function FaceDownCard({ card, index }: { card: TarotCard; index: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draw-${card.id}`,
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      style={{ width: TABLEAU_W }}
      className={`shrink-0 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: Math.min(index * 0.012, 0.35), duration: 0.3 }}
      >
        <CardBack />
      </motion.div>
    </button>
  )
}

/** A spread slot that accepts a dropped face-down card (reveals its face). */
function Slot({
  index,
  spread,
  card,
  onTap,
}: {
  index: number
  spread: SpreadDef
  card: TarotCard | null
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
      {card ? (
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
              src={getCardImage(card)}
              alt={card.name}
              draggable={false}
              className="block w-full h-auto select-none pointer-events-none"
            />
          </motion.span>
          <span className="mt-1 flex flex-col items-center leading-tight">
            <span className="text-[10px] text-purple-300 font-medium whitespace-nowrap">
              {posLabel}
            </span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">{card.name}</span>
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

/** Shuffle animation: a few card backs jittering, then settle into the tableau. */
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
 * Draw mode: shuffle the deck, lay it out face-down in three rows, then drag
 * face-down cards onto the spread (the card is revealed on placement).
 */
export default function DrawMode({ spread, onReadingStart, disabled }: Props) {
  const [deck, setDeck] = useState<TarotCard[]>([])
  const [slots, setSlots] = useState<(TarotCard | null)[]>(() =>
    Array(spread.cardCount).fill(null)
  )
  const [shuffling, setShuffling] = useState(false)
  const [shuffled, setShuffled] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  )

  useEffect(() => {
    setDeck([])
    setSlots(Array(spread.cardCount).fill(null))
    setShuffled(false)
    setShuffling(false)
  }, [spread.key, spread.cardCount])

  const placedIds = new Set(slots.filter(Boolean).map((c) => c!.id))
  const filled = slots.filter(Boolean).length
  const rows = [deck.slice(0, 26), deck.slice(26, 52), deck.slice(52, 78)]
  const activeCard =
    activeDragId && activeDragId.startsWith('draw-')
      ? allCards.find((c) => `draw-${c.id}` === activeDragId) ?? null
      : null

  const handleShuffle = () => {
    setShuffling(true)
    setSlots(Array(spread.cardCount).fill(null))
    setShuffled(false)
    setTimeout(() => {
      setDeck(shuffle(allCards))
      setShuffling(false)
      setShuffled(true)
    }, 900)
  }

  const handleDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    const overId = e.over ? String(e.over.id) : null
    const card = activeCard
    setActiveDragId(null)

    if (!card || !overId || !overId.startsWith('slot-')) return
    const idx = Number(overId.slice('slot-'.length))
    if (Number.isNaN(idx) || idx < 0 || idx >= spread.cardCount) return

    setSlots((prev) => {
      const next = [...prev]
      next[idx] = card
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
    onReadingStart(slots.map((c) => makeParsedCard(c!, false)))
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
              拖动 {spread.cardCount} 张卡背到牌阵
            </span>
          )}
        </div>

        {/* Shuffle animation / three-row tableau */}
        {shuffling ? (
          <ShuffleVisual />
        ) : shuffled ? (
          <div className="space-y-2">
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-1 overflow-x-auto pb-1">
                {row.map((card, j) =>
                  placedIds.has(card.id) ? (
                    <div
                      key={card.id}
                      style={{ width: TABLEAU_W }}
                      className="shrink-0 aspect-[7/12] invisible"
                    />
                  ) : (
                    <FaceDownCard key={card.id} card={card} index={ri * 26 + j} />
                  )
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <p className="text-sm">点击「洗牌」洗好牌后，从三层卡背中抽出你的牌</p>
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
                <Slot key={i} index={i} spread={spread} card={slots[i] || null} onTap={handleTapSlot} />
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
        {activeCard ? (
          <div className="w-14 rounded-md overflow-hidden shadow-2xl shadow-black/70">
            <CardBack />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
