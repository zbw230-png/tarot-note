// 78 Tarot Cards — complete dataset

export interface TarotCard {
  id: string          // e.g. "major-00", "minor-wands-01"
  name: string        // Chinese name
  nameEn: string      // English name
  arcana: 'major' | 'minor'
  number: number      // 0-21 for major, 1-14 for minor
  suit?: string       // 权杖/圣杯/宝剑/星币
  suitEn?: string     // Wands/Cups/Swords/Pentacles
  keywords: string[]  // Core keywords for the card
}

// === Major Arcana ===
const majorNames: [string, string, string[]][] = [
  ['愚者', 'The Fool', ['新的开始', '冒险', '纯真', ' spontaneity ']],
  ['魔术师', 'The Magician', ['创造力', '技能', '意志力', '显化']],
  ['女祭司', 'The High Priestess', ['直觉', '潜意识', '神秘', '内在智慧']],
  ['女皇', 'The Empress', ['丰饶', '母性', '自然', '感官享受']],
  ['皇帝', 'The Emperor', ['权威', '结构', '稳定', '父亲形象']],
  ['教皇', 'The Hierophant', ['传统', '精神指引', '教育', '信仰']],
  ['恋人', 'The Lovers', ['爱情', '选择', '和谐', '价值观']],
  ['战车', 'The Chariot', ['胜利', '意志力', '掌控', '前进']],
  ['力量', 'Strength', ['勇气', '耐心', '内在力量', '温柔']],
  ['隐士', 'The Hermit', ['内省', '孤独', '智慧', '寻求真理']],
  ['命运之轮', 'Wheel of Fortune', ['命运', '转折', '周期', '幸运']],
  ['正义', 'Justice', ['公正', '真相', '因果', '平衡']],
  ['倒吊人', 'The Hanged Man', ['牺牲', '换个角度', '等待', '释怀']],
  ['死神', 'Death', ['结束', '转变', '重生', '放下']],
  ['节制', 'Temperance', ['平衡', '调和', '耐心', '中庸之道']],
  ['恶魔', 'The Devil', ['束缚', '欲望', '物质主义', '阴影']],
  ['高塔', 'The Tower', ['剧变', '崩塌', '觉醒', '颠覆']],
  ['星星', 'The Star', ['希望', '疗愈', '灵感', '宁静']],
  ['月亮', 'The Moon', ['恐惧', '幻象', '潜意识', '不确定']],
  ['太阳', 'The Sun', ['快乐', '成功', '活力', '清晰']],
  ['审判', 'Judgement', ['觉醒', '重生', '召唤', '清算']],
  ['世界', 'The World', ['完成', '圆满', '整合', '成就']],
]

// === Minor Arcana ===
const suits: { cn: string; en: string }[] = [
  { cn: '权杖', en: 'Wands' },
  { cn: '圣杯', en: 'Cups' },
  { cn: '宝剑', en: 'Swords' },
  { cn: '星币', en: 'Pentacles' },
]

const minorNumbers: [number, string, string][] = [
  [1, '一', 'Ace'],
  [2, '二', 'Two'],
  [3, '三', 'Three'],
  [4, '四', 'Four'],
  [5, '五', 'Five'],
  [6, '六', 'Six'],
  [7, '七', 'Seven'],
  [8, '八', 'Eight'],
  [9, '九', 'Nine'],
  [10, '十', 'Ten'],
  [11, '侍从', 'Page'],
  [12, '骑士', 'Knight'],
  [13, '王后', 'Queen'],
  [14, '国王', 'King'],
]

// Suit keywords
const suitThemes: Record<string, string[]> = {
  '权杖': ['行动', '热情', '创造力', '事业', '冒险'],
  '圣杯': ['情感', '关系', '直觉', '爱', '灵性'],
  '宝剑': ['思想', '冲突', '真理', '沟通', '决定'],
  '星币': ['物质', '工作', '金钱', '健康', '稳定'],
}

function mkMinorKeywords(suitCn: string, num: number): string[] {
  const themes = suitThemes[suitCn] || []
  const court = num > 10
  if (court) {
    const roles = ['学习', '行动', '滋养', '掌控']
    return [minorNumbers[num - 1][1], themes[0], themes[1], roles[num - 11]]
  }
  return [themes[Math.min(num - 1, 4)], suitCn]
}

// === Build the full card list ===
export const allCards: TarotCard[] = []

// Major Arcana
majorNames.forEach(([name, nameEn, keywords], i) => {
  allCards.push({
    id: `major-${String(i).padStart(2, '0')}`,
    name,
    nameEn,
    arcana: 'major',
    number: i,
    keywords,
  })
})

// Minor Arcana
suits.forEach((suit) => {
  minorNumbers.forEach(([num, numCn, numEn]) => {
    const id = `minor-${suit.en.toLowerCase()}-${String(num).padStart(2, '0')}`
    const name = `${suit.cn}${numCn}`
    const nameEn = `${numEn} of ${suit.en}`
    allCards.push({
      id,
      name,
      nameEn,
      arcana: 'minor',
      number: num,
      suit: suit.cn,
      suitEn: suit.en,
      keywords: mkMinorKeywords(suit.cn, num),
    })
  })
})

// === Lookup helpers ===
export function findCard(
  arcana: 'major' | 'minor',
  _reversed: boolean,
  number: number,
  suitChar?: string
): TarotCard | undefined {
  if (arcana === 'major') {
    return allCards.find((c) => c.id === `major-${String(number).padStart(2, '0')}`)
  }
  // minor: suitChar is one of 一二三四
  const suitMap: Record<string, string> = { '一': '权杖', '二': '圣杯', '三': '宝剑', '四': '星币' }
  const suitCn = suitChar ? suitMap[suitChar] : undefined
  return allCards.find(
    (c) => c.arcana === 'minor' && c.suit === suitCn && c.number === number
  )
}

/** Get card name by id */
export function getCardName(id: string): string {
  return allCards.find((c) => c.id === id)?.name || id
}
