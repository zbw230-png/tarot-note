import { useState, useEffect } from 'react'
import type { SpreadDef } from '../lib/spreads'
import type { TarotCard } from '../lib/cards'
import {
  getCardsByCategory,
  getCardImage,
  cardCategories,
  type CardCategory,
} from '../lib/cards'
import { makeParsedCard, type ParsedCard } from '../lib/parser'
import SpreadBoard, { type PlacedCard } from './SpreadBoard'

interface Props {
  spread: SpreadDef
  onReadingStart: (cards: ParsedCard[]) => void
  disabled: boolean
}

/**
 * Pick mode: choose cards from a categorized column on the left, then tap a
 * spread slot to place each card. Tap a placed card to remove it.
 */
export default function PickMode({ spread, onReadingStart, disabled }: Props) {
  const [category, setCategory] = useState<CardCategory>('major')
  const [slots, setSlots] = useState<(PlacedCard | null)[]>(() =>
    Array(spread.cardCount).fill(null)
  )
  const [selected, setSelected] = useState<TarotCard | null>(null)
  const [selectedReversed, setSelectedReversed] = useState(false)

  // Reset the board when the spread changes
  useEffect(() => {
    setSlots(Array(spread.cardCount).fill(null))
    setSelected(null)
    setSelectedReversed(false)
  }, [spread.key, spread.cardCount])

  const cards = getCardsByCategory(category)
  const filled = slots.filter(Boolean).length

  // Tap a card in the column: select it; tapping the same card toggles reversed.
  const handlePick = (card: TarotCard) => {
    if (selected?.id === card.id) {
      setSelectedReversed((r) => !r)
    } else {
      setSelected(card)
      setSelectedReversed(false)
    }
  }

  const handlePlace = (i: number) => {
    if (!selected) return
    setSlots((prev) => {
      const next = [...prev]
      next[i] = { card: selected, reversed: selectedReversed }
      return next
    })
    setSelected(null)
    setSelectedReversed(false)
  }

  const handleRemove = (i: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[i] = null
      return next
    })
  }

  const handleClear = () => {
    setSlots(Array(spread.cardCount).fill(null))
    setSelected(null)
    setSelectedReversed(false)
  }

  const handleSubmit = () => {
    if (filled !== spread.cardCount) return
    const parsed = slots.map((s) => makeParsedCard(s!.card, s!.reversed))
    onReadingStart(parsed)
  }

  return (
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
            {cards.map((card) => {
              const isSel = selected?.id === card.id
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handlePick(card)}
                  className={`relative w-full rounded-md overflow-hidden border-2 transition cursor-pointer ${
                    isSel
                      ? 'border-purple-400 ring-2 ring-purple-400/40'
                      : 'border-transparent hover:border-gray-600'
                  }`}
                >
                  <img
                    src={getCardImage(card)}
                    alt={card.name}
                    draggable={false}
                    className="block w-full h-auto select-none"
                  />
                  {isSel && (
                    <span className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] px-1 rounded-bl">
                      {selectedReversed ? '逆' : '正'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: board + actions */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <SpreadBoard
            spread={spread}
            slots={slots}
            selected={selected}
            selectedReversed={selectedReversed}
            onPlace={handlePlace}
            onRemove={handleRemove}
          />

          {/* Hint */}
          {selected ? (
            <p className="text-xs text-purple-300 leading-relaxed">
              已选中「{selected.name}」（{selectedReversed ? '逆位' : '正位'}）
              —— 点空位放置，再点同一张可切换正逆
            </p>
          ) : (
            <p className="text-xs text-gray-500 leading-relaxed">
              左侧点选牌 → 点空位放置；点已放牌可移除
            </p>
          )}

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
              {disabled
                ? '解读中...'
                : `🔮 开始解读（${filled}/${spread.cardCount}）`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
