import { findCard, type TarotCard } from './cards'

/**
 * Parsed result for one card from user input.
 */
export interface ParsedCard {
  input: string          // original input token
  arcana: 'major' | 'minor'
  reversed: boolean
  number: number         // 0-21 for major, 1-14 for minor
  suit?: string          // minor only: 一/二/三/四 → 权杖/圣杯/宝剑/星币
  card: TarotCard         // resolved card data
}

/**
 * Suit characters: 一=Wands, 二=Cups, 三=Swords, 四=Pentacles
 */
const SUIT_CHARS = ['一', '二', '三', '四']
const SUIT_MAP: Record<string, string> = { '一': '权杖', '二': '圣杯', '三': '宝剑', '四': '星币' }

/**
 * Parse a user input string like "0 四4 -三10 -0 8二"
 * into an array of ParsedCard objects.
 */
export function parseCards(input: string): ParsedCard[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const results: ParsedCard[] = []

  for (const token of tokens) {
    const parsed = parseToken(token)
    if (parsed) results.push(parsed)
  }

  return results
}

/**
 * Parse a single token.
 *
 * Rules:
 * - If token is a pure integer or -integer (e.g. 0, -5, 21, -21): Major Arcana
 * - If token starts with a suit char (一二三四): Minor upright, e.g. 四4
 * - If token starts with a digit and contains a suit char: Minor reversed, e.g. 4四
 * - Tokens prefixed with '-' and then minor pattern: reversed minor
 *   (handled by the digit-first = reversed convention)
 */
function parseToken(token: string): ParsedCard | null {
  if (!token) return null

  // === Major Arcana ===
  // Pure integer or -integer, no suit chars
  const hasSuitChar = SUIT_CHARS.some((ch) => token.includes(ch))
  if (!hasSuitChar) {
    const num = parseInt(token, 10)
    if (isNaN(num)) return null
    const absNum = Math.abs(num)
    if (absNum > 21) return null

    const reversed = token.startsWith('-')
    const card = findCard('major', reversed, absNum)
    if (!card) return null

    return { input: token, arcana: 'major', reversed, number: absNum, card }
  }

  // === Minor Arcana ===
  // Find the suit char and number in the token
  const suitChar = SUIT_CHARS.find((ch) => token.includes(ch))!
  const numPart = token.replace(suitChar, '').replace('-', '')
  const num = parseInt(numPart, 10)
  if (isNaN(num) || num < 1 || num > 14) return null

  // Determine if reversed:
  // If suit char comes first → upright (四4)
  // If digit comes first → reversed (4四)
  // Also handle -四4 (explicit reversed marker) — but this conflicts with
  // our convention. We'll say: -prefix also means reversed, and the order
  // of suit/digit further clarifies.
  const suitFirst = token.indexOf(suitChar) < token.replace('-', '').search(/\d/)
  const hasMinus = token.startsWith('-')

  // Reversed if: minus prefix OR digit-before-suit pattern
  const reversed = hasMinus || !suitFirst

  const suitCn = SUIT_MAP[suitChar]
  const card = findCard('minor', reversed, num, suitChar)
  if (!card) return null

  return { input: token, arcana: 'minor', reversed, number: num, suit: suitCn, card }
}

/**
 * Build a human-readable summary of parsed cards.
 */
export function summarizeCards(cards: ParsedCard[]): string {
  return cards
    .map((c) => {
      const rev = c.reversed ? ' (逆位)' : ''
      return `${c.card.name}${rev}`
    })
    .join('、')
}
