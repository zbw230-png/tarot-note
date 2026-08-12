import { ArrowLeft } from 'lucide-react'
import type { SavedReading } from '../lib/storage'

interface Props {
  reading: SavedReading
  onBack: () => void
}

export default function HistoryDetail({ reading, onBack }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="font-bold text-white">{reading.spreadName}</h2>
          <p className="text-xs text-gray-500">{formatFullDate(reading.date)}</p>
        </div>
      </div>

      {/* Cards summary */}
      <div className="flex flex-wrap gap-2">
        {reading.cards.map((c, i) => (
          <div
            key={i}
            className="bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/50"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                {c.position}
              </span>
              {c.reversed && (
                <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                  逆
                </span>
              )}
            </div>
            <p className="text-sm font-medium">{c.name}</p>
            <p className="text-[10px] text-gray-500">{c.nameEn}</p>
          </div>
        ))}
      </div>

      {/* Reading content */}
      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
        <div
          className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-gray-200 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(reading.reading) }}
        />
      </div>
    </div>
  )
}

function formatFullDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-purple-300 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-purple-200 mt-5 mb-2">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-300">$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 text-gray-300">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')

  html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/g, '<ul class="my-2 space-y-1">$1</ul>')

  return html
}
