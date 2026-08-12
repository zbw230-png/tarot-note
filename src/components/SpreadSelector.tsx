import { spreads, type SpreadDef } from '../lib/spreads'

interface Props {
  selected: string
  onSelect: (spread: SpreadDef) => void
}

export default function SpreadSelector({ selected, onSelect }: Props) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-2 pb-2 min-w-max">
        {spreads.map((s) => {
          const active = selected === s.key
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${active
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              <span>{s.name}</span>
              <span className={`ml-1 text-xs ${active ? 'text-purple-200' : 'text-gray-500'}`}>
                ({s.cardCount})
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
