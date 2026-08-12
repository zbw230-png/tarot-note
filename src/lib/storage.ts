import type { ParsedCard } from './parser'
import type { SpreadDef } from './spreads'

export interface SavedReading {
  id: string
  date: string           // ISO 8601
  spreadKey: string
  spreadName: string
  cards: {
    name: string
    nameEn: string
    reversed: boolean
    position: string     // position label from the spread
  }[]
  reading: string        // full AI reading markdown
}

const STORAGE_KEY = 'tarot-note-readings'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Load all saved readings from localStorage */
export function loadReadings(): SavedReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedReading[]
  } catch {
    return []
  }
}

/** Save readings back to localStorage */
function saveReadings(readings: SavedReading[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readings))
}

/** Add a new reading */
export function addReading(
  spread: SpreadDef,
  cards: ParsedCard[],
  readingText: string
): SavedReading {
  const reading: SavedReading = {
    id: generateId(),
    date: new Date().toISOString(),
    spreadKey: spread.key,
    spreadName: spread.name,
    cards: cards.map((c, i) => ({
      name: c.card.name,
      nameEn: c.card.nameEn,
      reversed: c.reversed,
      position: spread.positions[i]?.label || `牌${i + 1}`,
    })),
    reading: readingText,
  }

  const readings = loadReadings()
  readings.unshift(reading)
  saveReadings(readings)
  return reading
}

/** Delete a reading by id */
export function deleteReading(id: string): void {
  const readings = loadReadings()
  saveReadings(readings.filter((r) => r.id !== id))
}

/** Get a single reading by id */
export function getReading(id: string): SavedReading | undefined {
  return loadReadings().find((r) => r.id === id)
}
