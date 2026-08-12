import { motion } from 'framer-motion'

interface Props {
  name: string
  nameEn: string
  reversed: boolean
  position: string
  index: number
}

export default function ReadingCard({ name, nameEn, reversed, position, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      className="bg-gray-800/60 rounded-xl p-4 border border-gray-700"
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
          {position}
        </span>
        {reversed && (
          <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
            逆位
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold mt-1">{name}</h3>
      <p className="text-xs text-gray-500">{nameEn}{reversed ? ' (Reversed)' : ''}</p>
    </motion.div>
  )
}
