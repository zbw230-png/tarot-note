import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { loadReadings, deleteReading, type SavedReading } from '../lib/storage'
import HistoryDetail from './HistoryDetail'

interface Props {
  onBack: () => void
}

export default function HistoryList({ onBack }: Props) {
  const [readings, setReadings] = useState<SavedReading[]>(loadReadings())
  const [selected, setSelected] = useState<SavedReading | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteReading(id)
      setReadings(loadReadings())
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      // Auto-cancel after 3s
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  if (selected) {
    return <HistoryDetail reading={selected} onBack={() => setSelected(null)} />
  }

  if (readings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <span className="text-4xl">📖</span>
        <p className="text-gray-400">还没有解读记录</p>
        <button
          onClick={onBack}
          className="text-purple-400 text-sm hover:text-purple-300 transition"
        >
          去抽牌 →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-400 mb-3">
        共 {readings.length} 条记录
      </h2>

      <AnimatePresence>
        {readings.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer active:bg-gray-700/50 transition"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">
                      {r.spreadName}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatDate(r.date)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {r.cards.map((c) => `${c.reversed ? '逆' : ''}${c.name}`).join(' · ')}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-600 shrink-0 ml-2" />
              </div>
            </div>

            {/* Delete button */}
            <div className="border-t border-gray-700/30">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(r.id)
                }}
                className={`w-full py-2 text-xs transition ${
                  confirmDelete === r.id
                    ? 'bg-red-600/20 text-red-400'
                    : 'text-gray-500 hover:text-red-400'
                }`}
              >
                {confirmDelete === r.id ? '确认删除？点击确认' : '删除'}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}
