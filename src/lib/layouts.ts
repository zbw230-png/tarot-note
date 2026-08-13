/**
 * Visual layout coordinates for each spread.
 *
 * Each spot is a card's CENTER position, expressed as percentages of the
 * container (0–100). Cards are absolutely positioned and centered on that
 * point, so they can be arranged into the classic spread shapes:
 * a line, a triangle, a fork, a cross, the Celtic Cross, a hexagram, etc.
 *
 * `rotate` rotates the card image (used for the "crossing" card in the
 * Celtic Cross, which sits horizontal over the first card).
 */

export interface LayoutSpot {
  x: number        // center x, 0–100
  y: number        // center y, 0–100
  rotate?: number  // degrees to rotate the card image (0 = upright)
}

export interface SpreadLayoutDef {
  spots: LayoutSpot[]  // one per card, in input order
  height: number       // container height in px (mobile-tuned)
}

export const spreadLayouts: Record<string, SpreadLayoutDef> = {
  // 1 card, centered
  single: {
    height: 220,
    spots: [{ x: 50, y: 50 }],
  },

  // 3 cards in a row
  'free-three': {
    height: 180,
    spots: [
      { x: 20, y: 50 },
      { x: 50, y: 50 },
      { x: 80, y: 50 },
    ],
  },

  // 3 cards in a row (past → present → future)
  'time-flow': {
    height: 180,
    spots: [
      { x: 18, y: 50 },
      { x: 50, y: 50 },
      { x: 82, y: 50 },
    ],
  },

  // Triangle: 基础 on top, 过程 / 结果 below
  'sacred-triangle': {
    height: 320,
    spots: [
      { x: 50, y: 20 },
      { x: 22, y: 75 },
      { x: 78, y: 75 },
    ],
  },

  // Fork: 现状 on top, two choices in the middle, two outcomes at the bottom
  'two-choices': {
    height: 340,
    spots: [
      { x: 50, y: 17 },
      { x: 24, y: 49 },
      { x: 76, y: 49 },
      { x: 24, y: 82 },
      { x: 76, y: 82 },
    ],
  },

  // Cross: 你 / 对方 left & right, 关系 center, 过去 top, 未来 bottom
  'love-cross': {
    height: 300,
    spots: [
      { x: 24, y: 50 },
      { x: 76, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 18 },
      { x: 50, y: 82 },
    ],
  },

  // Celtic Cross: the classic 6-card cross + 4-card staff on the right.
  // Card 2 (阻碍) is rotated 90° and lies across card 1 (现状).
  'celtic-cross': {
    height: 400,
    spots: [
      { x: 36, y: 38 },               // 现状 (cross center)
      { x: 36, y: 38, rotate: 90 },   // 阻碍 (crossing card)
      { x: 36, y: 60 },               // 基础 (below)
      { x: 12, y: 38 },               // 过去 (left)
      { x: 36, y: 15 },               // 目标 (above)
      { x: 60, y: 38 },               // 未来 (right)
      { x: 86, y: 18 },               // 自我 (staff)
      { x: 86, y: 38 },               // 环境
      { x: 86, y: 58 },               // 希望
      { x: 86, y: 78 },               // 结果
    ],
  },

  // Hexagram: 6 points around a circle
  hexagram: {
    height: 320,
    spots: [
      { x: 50, y: 16 },   // 过去 (top)
      { x: 76, y: 30 },   // 现在 (top-right)
      { x: 76, y: 64 },   // 未来 (bottom-right)
      { x: 50, y: 80 },   // 原因 (bottom)
      { x: 24, y: 64 },   // 环境 (bottom-left)
      { x: 24, y: 30 },   // 结果 (top-left)
    ],
  },
}

/** Get the layout for a spread key (falls back to a single centered spot). */
export function getLayout(key: string): SpreadLayoutDef {
  return (
    spreadLayouts[key] || { height: 200, spots: [{ x: 50, y: 50 }] }
  )
}
