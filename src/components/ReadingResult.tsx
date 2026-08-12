import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ParsedCard } from '../lib/parser'
import type { SpreadDef } from '../lib/spreads'
import ReadingCard from './ReadingCard'

interface Props {
  spread: SpreadDef
  cards: ParsedCard[]
  text: string      // accumulated stream text
  streaming: boolean
}

export default function ReadingResult({ spread, cards, text, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll as text streams in
  useEffect(() => {
    if (streaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [text, streaming])

  if (!text && streaming) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">AI 正在解读...</p>
      </div>
    )
  }

  if (!text) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Card summary row */}
      <div className="space-y-2">
        {cards.map((c, i) => (
          <ReadingCard
            key={i}
            name={c.card.name}
            nameEn={c.card.nameEn}
            reversed={c.reversed}
            position={spread.positions[i]?.label || `牌${i + 1}`}
            index={i}
          />
        ))}
      </div>

      {/* AI reading content — render markdown-like text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 prose prose-invert prose-sm max-w-none"
      >
        <div
          className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
        {streaming && <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse" />}
      </motion.div>

      <div ref={bottomRef} />
    </motion.div>
  )
}

/** Simple markdown→HTML renderer for the AI output */
function renderMarkdown(text: string): string {
  let html = text
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-purple-300 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-purple-200 mt-5 mb-2">$1</h2>')
    // list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-300">$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 text-gray-300">$1</li>')
    // newlines
    .replace(/\n\n/g, '<br/><br/>')

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/g, '<ul class="my-2 space-y-1">$1</ul>')

  return html
}
