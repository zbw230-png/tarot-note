import { useState, useCallback } from 'react'
import type { ParsedCard } from '../lib/parser'
import type { SpreadDef } from '../lib/spreads'
import { addReading } from '../lib/storage'

interface UseStreamReadingReturn {
  text: string
  streaming: boolean
  error: string | null
  startReading: (spread: SpreadDef, cards: ParsedCard[]) => Promise<void>
  savedId: string | null
}

export function useStreamReading(): UseStreamReadingReturn {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const startReading = useCallback(async (spread: SpreadDef, cards: ParsedCard[]) => {
    setText('')
    setError(null)
    setStreaming(true)
    setSavedId(null)

    try {
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spread: spread.key, cards }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      // Read the stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Handle SSE format
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullText += parsed.content
                setText(fullText)
              }
            } catch {
              // Plain text chunk (non-JSON)
              fullText += data
              setText(fullText)
            }
          }
        }
      }

      // Save to history
      const saved = addReading(spread, cards, fullText)
      setSavedId(saved.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setStreaming(false)
    }
  }, [])

  return { text, streaming, error, startReading, savedId }
}
