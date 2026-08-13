import type { TarotCard } from '../lib/cards'
import { getCardImage } from '../lib/cards'
import type { SpreadDef } from '../lib/spreads'
import { getLayout } from '../lib/layouts'

/** A card placed into a spread slot (upright or reversed). */
export interface PlacedCard {
  card: TarotCard
  reversed: boolean
}

interface Props {
  spread: SpreadDef
  slots: (PlacedCard | null)[]
  selected: TarotCard | null
  selectedReversed: boolean
  onPlace: (index: number) => void
  onRemove: (index: number) => void
}

const CARD_W = 56 // px

/**
 * The spread shown in pick mode: every position is a tappable slot.
 * Empty slots show a dashed placeholder (and a faint preview of the selected
 * card); filled slots show the card image. Tap a filled slot to remove it.
 */
export default function SpreadBoard({
  spread,
  slots,
  selected,
  selectedReversed,
  onPlace,
  onRemove,
}: Props) {
  const layout = getLayout(spread.key)

  return (
    <div
      className="relative w-full mx-auto rounded-2xl bg-gradient-to-b from-purple-950/40 to-gray-900/30 border border-purple-900/30 overflow-hidden"
      style={{ height: layout.height, maxWidth: 360 }}
    >
      {spread.positions.map((pos, i) => {
        const spot = layout.spots[i] || { x: 50, y: 50 }
        const placed = slots[i] || null
        const rotation = (spot.rotate || 0) + (placed?.reversed ? 180 : 0)

        return (
          <button
            key={i}
            type="button"
            onClick={() => (placed ? onRemove(i) : selected ? onPlace(i) : undefined)}
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
                <span className="relative w-full rounded-md overflow-hidden shadow-lg shadow-black/60 border border-white/15 bg-black/40 block">
                  <img
                    src={getCardImage(placed.card)}
                    alt={placed.card.name}
                    draggable={false}
                    className="block w-full h-auto select-none"
                    style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
                  />
                </span>
                <span className="mt-1 flex flex-col items-center leading-tight">
                  <span className="text-[10px] text-purple-300 font-medium whitespace-nowrap">
                    {pos.label}
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
                    selected
                      ? 'border-purple-400/70 bg-purple-500/10'
                      : 'border-gray-600/50 bg-gray-800/30'
                  }`}
                >
                  {selected ? (
                    <img
                      src={getCardImage(selected)}
                      alt={selected.name}
                      draggable={false}
                      className="w-full h-full object-cover opacity-40 select-none"
                      style={selectedReversed ? { transform: 'rotate(180deg)' } : undefined}
                    />
                  ) : (
                    <span className="text-gray-600 text-lg leading-none">＋</span>
                  )}
                </span>
                <span className="mt-1 text-[10px] text-gray-500 whitespace-nowrap">
                  {pos.label}
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
