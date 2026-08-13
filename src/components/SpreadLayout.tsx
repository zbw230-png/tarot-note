import { motion } from 'framer-motion'
import type { ParsedCard } from '../lib/parser'
import type { SpreadDef } from '../lib/spreads'
import { getCardImage } from '../lib/cards'
import { getLayout, type LayoutSpot } from '../lib/layouts'

interface Props {
  spread: SpreadDef
  cards: ParsedCard[]
}

const CARD_W = 56 // px

/**
 * Renders the drawn cards as Rider-Waite images, positioned according to the
 * selected spread's shape (line / triangle / fork / cross / Celtic Cross ...).
 */
export default function SpreadLayout({ spread, cards }: Props) {
  const layout = getLayout(spread.key)

  return (
    <div
      className="relative w-full mx-auto rounded-2xl bg-gradient-to-b from-purple-950/40 to-gray-900/30 border border-purple-900/30 overflow-hidden"
      style={{ height: layout.height, maxWidth: 360 }}
    >
      {cards.map((c, i) => {
        const spot: LayoutSpot = layout.spots[i] || { x: 50, y: 50 }
        const posLabel = spread.positions[i]?.label || `牌${i + 1}`

        // Reversed cards flip upside-down; crossing card (Celtic Cross) rotates 90°.
        const rotation = (spot.rotate || 0) + (c.reversed ? 180 : 0)

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              transform: 'translate(-50%, -50%)',
              width: CARD_W,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className="relative w-full rounded-md overflow-hidden shadow-lg shadow-black/60 border border-white/15 bg-black/40"
            >
              <img
                src={getCardImage(c.card)}
                alt={c.card.name}
                loading="lazy"
                draggable={false}
                className="block w-full h-auto select-none"
                style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
              />
            </motion.div>

            <div className="mt-1 flex flex-col items-center leading-tight">
              <span className="text-[10px] text-purple-300 font-medium whitespace-nowrap">
                {posLabel}
              </span>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                {c.card.name}
                {c.reversed ? <span className="text-orange-400"> 逆</span> : ''}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
