/**
 * Spread definitions.
 * Each spread has a key, display name, number of cards, and position meanings.
 */

export interface SpreadPosition {
  label: string    // e.g. "过去"
  hint: string     // e.g. "影响当前状况的过去因素"
}

export interface SpreadDef {
  key: string
  name: string
  cardCount: number
  positions: SpreadPosition[]
}

export const spreads: SpreadDef[] = [
  {
    key: 'single',
    name: '单张单牌阵',
    cardCount: 1,
    positions: [
      { label: '核心指引', hint: '当前状况的核心信息或建议' },
    ],
  },
  {
    key: 'free-three',
    name: '无牌阵三张',
    cardCount: 3,
    positions: [
      { label: '牌一', hint: '第一张牌的综合含义' },
      { label: '牌二', hint: '第二张牌的综合含义' },
      { label: '牌三', hint: '第三张牌的综合含义' },
    ],
  },
  {
    key: 'time-flow',
    name: '时间之流',
    cardCount: 3,
    positions: [
      { label: '过去', hint: '影响当前状况的过去因素' },
      { label: '现在', hint: '当前所处的状态与核心问题' },
      { label: '未来', hint: '发展趋势与可能的结果' },
    ],
  },
  {
    key: 'sacred-triangle',
    name: '圣三角',
    cardCount: 3,
    positions: [
      { label: '基础', hint: '事情的根基与背景' },
      { label: '过程', hint: '事情的发展过程与变化' },
      { label: '结果', hint: '最终可能的结果' },
    ],
  },
  {
    key: 'two-choices',
    name: '二择一',
    cardCount: 5,
    positions: [
      { label: '现状', hint: '你当前所处的状况' },
      { label: '选择A', hint: '第一个选项的发展路径' },
      { label: '选择B', hint: '第二个选项的发展路径' },
      { label: 'A的结果', hint: '选择第一个选项可能带来的结果' },
      { label: 'B的结果', hint: '选择第二个选项可能带来的结果' },
    ],
  },
  {
    key: 'love-cross',
    name: '爱情十字',
    cardCount: 5,
    positions: [
      { label: '你', hint: '你在这段关系中的状态与感受' },
      { label: '对方', hint: '对方在这段关系中的状态与感受' },
      { label: '关系', hint: '你们之间关系的本质与现状' },
      { label: '过去', hint: '影响这段关系的过去因素' },
      { label: '未来', hint: '这段关系的未来发展趋势' },
    ],
  },
  {
    key: 'celtic-cross',
    name: '凯尔特十字',
    cardCount: 10,
    positions: [
      { label: '现状', hint: '当前状况的核心' },
      { label: '阻碍', hint: '面临的挑战或阻碍' },
      { label: '基础', hint: '问题的根源与基础' },
      { label: '过去', hint: '过去的经历与影响' },
      { label: '目标', hint: '期望的目标与方向' },
      { label: '未来', hint: '近期的发展趋势' },
      { label: '自我', hint: '你当前的态度与状态' },
      { label: '环境', hint: '周围环境与他人的影响' },
      { label: '希望', hint: '内心的希望与恐惧' },
      { label: '结果', hint: '最终的可能结果' },
    ],
  },
  {
    key: 'hexagram',
    name: '六芒星',
    cardCount: 6,
    positions: [
      { label: '过去', hint: '问题的过去成因' },
      { label: '现在', hint: '当前的状态' },
      { label: '未来', hint: '未来的发展' },
      { label: '原因', hint: '问题的深层原因' },
      { label: '环境', hint: '周围环境的影响' },
      { label: '结果', hint: '最终的可能性' },
    ],
  },
]

/** Get a spread definition by key */
export function getSpread(key: string): SpreadDef | undefined {
  return spreads.find((s) => s.key === key)
}

/** Get position labels for a spread (used for display before input) */
export function getPositionLabels(key: string): string[] {
  const spread = getSpread(key)
  return spread ? spread.positions.map((p) => p.label) : []
}
