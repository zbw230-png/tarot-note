import { useState, type FormEvent } from 'react'
import type { SpreadDef } from '../lib/spreads'
import { parseCards, summarizeCards } from '../lib/parser'
import SpreadLayout from './SpreadLayout'

interface Props {
  spread: SpreadDef
  onReadingStart: (cards: ReturnType<typeof parseCards>) => void
  disabled: boolean
}

export default function CardInput({ spread, onReadingStart, disabled }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const parsed = parseCards(input)
  const cardCount = parsed.length
  const expectedCount = spread.cardCount

  const isValid = cardCount === expectedCount

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (cardCount === 0) {
      setError('请输入至少一张牌')
      return
    }
    if (cardCount !== expectedCount) {
      setError(`"${spread.name}"需要 ${expectedCount} 张牌，当前输入了 ${cardCount} 张`)
      return
    }

    onReadingStart(parsed)
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Spread info */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <p className="text-sm text-gray-400 mb-2">
          已选牌阵：<span className="text-purple-400 font-medium">{spread.name}</span>
          <span className="mx-2">·</span>
          {spread.cardCount} 张牌
        </p>
        <div className="flex flex-wrap gap-1.5">
          {spread.positions.map((pos, i) => (
            <span
              key={i}
              className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md"
            >
              {i + 1}.{pos.label}
            </span>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div>
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={`输入牌面，空格分隔\n如：0 四4 -三10 一1`}
          disabled={disabled}
          rows={3}
          className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-500
            focus:outline-none focus:ring-2 transition resize-none
            ${error
              ? 'border-red-500 focus:ring-red-500/30'
              : isValid && cardCount > 0
                ? 'border-green-500 focus:ring-green-500/30'
                : 'border-gray-700 focus:ring-purple-500/30'
            }`}
        />

        {/* Validation feedback */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <div>
            {error ? (
              <span className="text-red-400">{error}</span>
            ) : cardCount > 0 ? (
              <span className={isValid ? 'text-green-400' : 'text-yellow-400'}>
                已识别 {cardCount} 张牌{!isValid && `（需要 ${expectedCount} 张）`}
                {cardCount > 0 && `：${summarizeCards(parsed)}`}
              </span>
            ) : (
              <span className="text-gray-500">大牌用数字0-21，小牌用汉字+数字（如一1=权杖一）</span>
            )}
          </div>
          {cardCount > 0 && (
            <span className="text-gray-500">
              {cardCount}/{expectedCount}
            </span>
          )}
        </div>
      </div>

      {/* Live card preview — updates in real time as the user types */}
      {parsed.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            牌阵预览
            <span className={isValid ? ' text-green-400' : ' text-yellow-400'}>
              {cardCount}/{expectedCount}
            </span>
          </p>
          <SpreadLayout
            spread={spread}
            cards={parsed.slice(0, spread.cardCount)}
            animated={false}
          />
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!isValid || disabled}
        className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-200
          ${isValid && !disabled
            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 active:scale-[0.98]'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
      >
        {disabled ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-500 border-t-purple-400 rounded-full animate-spin" />
            解读中...
          </span>
        ) : (
          '🔮 开始解读'
        )}
      </button>
    </form>
  )
}
