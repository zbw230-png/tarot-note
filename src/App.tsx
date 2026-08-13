import { useState, useCallback } from 'react'
import './App.css'
import SpreadSelector from './components/SpreadSelector'
import CardInput from './components/CardInput'
import PickMode from './components/PickMode'
import ReadingResult from './components/ReadingResult'
import HistoryList from './components/HistoryList'
import { spreads, type SpreadDef } from './lib/spreads'
import { type ParsedCard } from './lib/parser'
import { useStreamReading } from './hooks/useStreamReading'
import { BookOpen } from 'lucide-react'

function App() {
  const [view, setView] = useState<'reading' | 'history'>('reading')
  const [mode, setMode] = useState<'pick' | 'quick'>('quick')
  const [selectedSpread, setSelectedSpread] = useState<SpreadDef>(spreads[0])
  const { text, streaming, error, startReading } = useStreamReading()

  // Store the cards being read so we can show card info
  const [activeCards, setActiveCards] = useState<ParsedCard[]>([])
  const [hasReading, setHasReading] = useState(false)

  const handleReadingStart = useCallback(
    async (cards: ParsedCard[]) => {
      setActiveCards(cards)
      setHasReading(true)
      await startReading(selectedSpread, cards)
    },
    [selectedSpread, startReading]
  )

  const handleNewReading = () => {
    setHasReading(false)
    setActiveCards([])
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-12">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-purple-400">🃏 塔罗笔记</h1>
        <nav className="flex gap-2">
          <button
            onClick={() => { setView('reading'); setHasReading(false) }}
            className={`px-3 py-1.5 rounded-lg text-sm transition
              ${view === 'reading' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            解读
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1
              ${view === 'history' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            <BookOpen size={14} />
            历史
          </button>
        </nav>
      </header>

      {/* Reading View */}
      {view === 'reading' && (
        <div className="space-y-5">
          {/* Step 1: Select spread */}
          {!hasReading && (
            <>
              {/* Mode toggle */}
              <div className="flex bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setMode('pick')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    mode === 'pick' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  🃏 选牌模式
                </button>
                <button
                  onClick={() => setMode('quick')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    mode === 'quick' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  ⌨️ 快速输入
                </button>
              </div>

              <SpreadSelector
                selected={selectedSpread.key}
                onSelect={setSelectedSpread}
              />

              {mode === 'quick' ? (
                <CardInput
                  spread={selectedSpread}
                  onReadingStart={handleReadingStart}
                  disabled={streaming}
                />
              ) : (
                <PickMode
                  spread={selectedSpread}
                  onReadingStart={handleReadingStart}
                  disabled={streaming}
                />
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
              {error}
              <button
                onClick={handleNewReading}
                className="block mt-2 text-red-300 underline"
              >
                重新尝试
              </button>
            </div>
          )}

          {/* Reading in progress / result */}
          {hasReading && !error && (
            <>
              <ReadingResult
                spread={selectedSpread}
                cards={activeCards}
                text={text}
                streaming={streaming}
              />

              {/* Actions after reading complete */}
              {!streaming && text && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleNewReading}
                    className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium
                      hover:bg-purple-500 transition active:scale-[0.98]"
                  >
                    🔮 新的解读
                  </button>
                  <button
                    onClick={() => { setView('history'); setHasReading(false) }}
                    className="py-3 px-5 rounded-xl bg-gray-800 text-gray-300 font-medium
                      hover:bg-gray-700 transition"
                  >
                    📖 查看历史
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <HistoryList onBack={() => setView('reading')} />
      )}
    </div>
  )
}

export default App
