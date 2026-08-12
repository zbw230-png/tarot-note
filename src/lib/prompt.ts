import type { ParsedCard } from './parser'
import type { SpreadDef } from './spreads'

/**
 * Build the full prompt sent to DeepSeek for a tarot reading.
 */
export function buildReadingPrompt(
  spread: SpreadDef,
  cards: ParsedCard[]
): { system: string; user: string } {
  const system = `你是一位经验丰富的专业塔罗解读师。你擅长结合牌阵位置、正逆位、牌面象征意义进行深度解读。
你的解读风格温暖、有洞察力，融合心理学视角与塔罗传统智慧。
请使用中文回复，语言流畅自然，避免生硬的模板感。
每张牌的解读控制在3-5句话，整体分析4-6句话，指引建议列出2-3条。
使用 markdown 格式输出。`

  const cardList = cards
    .map((c, i) => {
      const pos = spread.positions[i]
      const rev = c.reversed ? '逆位' : '正位'
      return `  - 位置"${pos.label}"（${pos.hint}）：${rev}${c.card.name}（${c.card.nameEn}）`
    })
    .join('\n')

  const user = `请为我解读以下塔罗牌阵：

**牌阵**：${spread.name}（${spread.cardCount} 张牌）

**抽到的牌**：
${cardList}

请按以下格式输出：

### 📜 逐张解读
对每一张牌，结合它在牌阵中的位置含义进行解读。标注牌名、正逆位，解释它在当前位置的核心信息。

### 🔮 整体牌阵分析
综合所有牌的位置、牌面含义和它们之间的关联，给出整体的牌阵解读。

### 💫 指引与建议
基于当前牌面信息，给出2-3条具体的未来行动建议或思考方向。`

  return { system, user }
}
