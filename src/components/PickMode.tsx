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
import type { SpreadDef } from '../lib/spreads'
import type { TarotCard } from '../lib/cards'
import {
  allCards,
  getCardsByCategory,
  getCardImage,
  cardCategories,
  type CardCategory,
} from '../lib/cards'
import { makeParsedCard, type ParsedCard } from '../lib/parser'
import { getLayout } from '../lib/layouts'

const CARD_W = 56 // px

interface PlacedCard {
  card: TarotCard
  reversed: boolean
}

interface Props {
  spread: SpreadDef
  onReadingStart: (cards: ParsedCard[]) => void
  disabled: boolean
}

/** A draggable card in the left column (mouse-drag / long-press-drag). */
function DraggableCard({
  card,
  selected,
  reversed,
  onTap,
}: {
  card: TarotCard
  selected: boolean
  reversed: boolean
  onTap: (card: TarotCard) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onTap(card)}
      className={`relative w-full rounded-md overflow-hidden border-2 transition cursor-grab active:cursor-grabbing ${
        selected
          ? 'border-purple-400 ring-2 ring-purple-400/40'
          : 'border-transparent hover:border-gray-600'
      } ${isDragging ? 'opacity-30' : ''}`}
    >
      <img
        src={getCardImage(card)}
        alt={card.name}
        draggable={false}
        className="block w-full h-auto select-none pointer-events-none"
      />
      {selected && (
        <span className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] px-1 rounded-bl">
          {reversed ? '逆' : '正'}
        </span>
      )}
    </button>
  )
}

/** A single spread position, acting as a drop target and tappable slot. */
function Slot({
  index,
  spread,
  placed,
  selected,
  reversed,
  onTap,
}: {
  index: number
  spread: SpreadDef
  placed: PlacedCard | null
  selected: TarotCard | null
  reversed: boolean
  onTap: (index: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` })
  const layout = getLayout(spread.key)
  const spot = layout.spots[index] || { x: 50, y: 50 }
  const rotation = (spot.rotate || 0) + (placed?.reversed ? 180 : 0)
  const posLabel = spread.positions[index]?.label || `牌${index + 1}`

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onTap(index)}
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        transform: 'translate(-50%, -50%)',
        width: CARD_W,
      }}
    >
      {placed ? (
        <>
          <span
            className={`relative w-full rounded-md overflow-hidden shadow-lg shadow-black/60 border bg-black/40 block ${
              isOver ? 'border-purple-400 ring-2 ring-purple-400/60' : 'border-white/15'
            }`}
          >
            <img
              src={getCardImage(placed.card)}
              alt={placed.card.name}
              draggable={false}
              className="block w-full h-auto select-none pointer-events-none"
              style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
            />
          </span>
          <span className="mt-1 flex flex-col items-center leading-tight">
            <span className="text-[10px] text-purple-300 font-medium whitespace-nowrap">
              {posLabel}
            </span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {placed.card.name}
              {placed.reversed ? <span className="text-orange-400"> 逆</span> : ''}
            </span>
          </span>
        </>
      ) : (
        <>
          <span
            className={`w-full aspect-[7/12] rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden transition ${
              isOver
                ? 'border-purple-400 bg-purple-500/20'
                : selected
                  ? 'border-purple-400/70 bg-purple-500/10'
                  : 'border-gray-600/50 bg-gray-800/30'
            }`}
          >
            {isOver ? (
              <span className="text-purple-200 text-sm font-medium">放置</span>
            ) : selected ? (
              <img
                src={getCardImage(selected)}
                alt=""
                draggable={false}
                className="w-full h-full object-cover opacity-40 select-none pointer-events-none"
                style={reversed ? { transform: 'rotate(180deg)' } : undefined}
              />
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

/**
 * Pick mode: choose cards from a categorized column on the left, then drag them
 * onto a spread slot (long-press on touch, mouse drag on desktop), or tap to
 * select + tap a slot to place. Tap a placed card to remove it.
 */
export default function PickMode({ spread, onReadingStart, disabled }: Props) {
  const [category, setCategory] = useState<CardCategory>('major')
  const [slots, setSlots] = useState<(PlacedCard | null)[]>(() =>
    Array(spread.cardCount).fill(null)
  )
  const [selected, setSelected] = useState<TarotCard | null>(null)
  const [reversed, setReversed] = useState(false) // orientation for the next placed card
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  )

  // Reset the board when the spread changes
  useEffect(() => {
    setSlots(Array(spread.cardCount).fill(null))
    setSelected(null)
    setReversed(false)
  }, [spread.key, spread.cardCount])

  const cards = getCardsByCategory(category)
  const filled = slots.filter(Boolean).length
  const activeDragCard = activeDragId ? allCards.find((c) => c.id === activeDragId) ?? null : null

  const handleTapCard = (card: TarotCard) => {
    setSelected((prev) => (prev?.id === card.id ? null : card))
  }

  const handleTapSlot = (i: number) => {
    if (slots[i]) {
      setSlots((prev) => {
        const next = [...prev]
        next[i] = null
        return next
      })
    } else if (selected) {
      setSlots((prev) => {
        const next = [...prev]
        next[i] = { card: selected, reversed }
        return next
      })
    }
  }

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id))
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const overId = e.over ? String(e.over.id) : null
    const card = activeDragCard
    setActiveDragId(null)

    if (!card || !overId || !overId.startsWith('slot-')) return
    const idx = Number(overId.slice('slot-'.length))
    if (Number.isNaN(idx) || idx < 0 || idx >= spread.cardCount) return

    setSlots((prev) => {
      const next = [...prev]
      next[idx] = { card, reversed }
      return next
    })
  }

  const handleClear = () => {
    setSlots(Array(spread.cardCount).fill(null))
    setSelected(null)
  }

  const handleSubmit = () => {
    if (filled !== spread.cardCount) return
    const parsed = slots.map((s) => makeParsedCard(s!.card, s!.reversed))
    onReadingStart(parsed)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {cardCategories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                category === c.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Two columns: card library (left) + spread board (right) */}
        <div className="flex gap-3">
          {/* Left: scrollable card library */}
          <div className="w-24 shrink-0">
            <div className="max-h-[480px] overflow-y-auto rounded-xl bg-gray-900/40 border border-gray-800 p-1.5 space-y-1.5">
              {cards.map((card) => (
                <DraggableCard
                  key={card.id}
                  card={card}
                  selected={selected?.id === card.id}
                  reversed={reversed}
                  onTap={handleTapCard}
                />
              ))}
            </div>
          </div>

          {/* Right: orientation toggle + board + actions */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Orientation toggle */}
            <div className="flex bg-gray-800 rounded-lg p-0.5 self-start">
              <button
                type="button"
                onClick={() => setReversed(false)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  !reversed ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                正位
              </button>
              <button
                type="button"
                onClick={() => setReversed(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  reversed ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                逆位
              </button>
            </div>

            {/* Board */}
            <div
              className="relative w-full mx-auto rounded-2xl bg-gradient-to-b from-purple-950/40 to-gray-900/30 border border-purple-900/30 overflow-hidden"
              style={{ height: getLayout(spread.key).height, maxWidth: 360 }}
            >
              {spread.positions.map((_, i) => (
                <Slot
                  key={i}
                  index={i}
                  spread={spread}
                  placed={slots[i] || null}
                  selected={selected}
                  reversed={reversed}
                  onTap={handleTapSlot}
                />
              ))}
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-500 leading-relaxed">
              {selected ? (
                <>
                  已选「{selected.name}」（{reversed ? '逆位' : '正位'}）—— 点空位放置
                </>
              ) : (
                <>长按/拖动牌到空位，或点选牌再点空位；点已放牌可移除</>
              )}
            </p>

            {/* Actions */}
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
          </div>
        </div>
      </div>

      {/* Floating card that follows the pointer while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeDragCard ? (
          <div className="w-16 rounded-md overflow-hidden shadow-2xl shadow-black/70 border border-white/30">
            <img
              src={getCardImage(activeDragCard)}
              alt={activeDragCard.name}
              draggable={false}
              className="block w-full h-auto select-none"
              style={reversed ? { transform: 'rotate(180deg)' } : undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
