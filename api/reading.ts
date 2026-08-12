import type { VercelRequest, VercelResponse } from '@vercel/node'

// DeepSeek API configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_MODEL = 'deepseek-chat'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { spread, cards } = req.body || {}

  if (!spread || !cards || !Array.isArray(cards)) {
    return res.status(400).json({ error: 'Missing spread or cards' })
  }

  // Build the prompt (server-side duplicate of prompt.ts logic for independence)
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(spread, cards)

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'API Key not configured' })
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('DeepSeek API error:', err)
      return res.status(response.status).json({ error: `DeepSeek API error: ${err}` })
    }

    // Stream the response back to the client
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body?.getReader()
    if (!reader) {
      return res.status(500).json({ error: 'No response body from DeepSeek' })
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n')
          continue
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`)
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// === Prompt builders (mirrors src/lib/prompt.ts) ===

function buildSystemPrompt(): string {
  return `你是一位经验丰富的专业塔罗解读师。你擅长结合牌阵位置、正逆位、牌面象征意义进行深度解读。
你的解读风格温暖、有洞察力，融合心理学视角与塔罗传统智慧。
请使用中文回复，语言流畅自然，避免生硬的模板感。
每张牌的解读控制在3-5句话，整体分析4-6句话，指引建议列出2-3条。
使用 markdown 格式输出。`
}

function buildUserPrompt(spreadKey: string, cards: Array<{ name: string; nameEn: string; reversed: boolean; position: string }>): string {
  const spreadNameMap: Record<string, string> = {
    'single': '单张单牌阵',
    'free-three': '无牌阵三张',
    'time-flow': '时间之流',
    'sacred-triangle': '圣三角',
    'two-choices': '二择一',
    'love-cross': '爱情十字',
    'celtic-cross': '凯尔特十字',
    'hexagram': '六芒星',
  }

  const spreadName = spreadNameMap[spreadKey] || spreadKey
  const positionHints: Record<string, Record<string, string>> = {
    'single': { '核心指引': '当前状况的核心信息或建议' },
    'free-three': { '牌一': '第一张牌的综合含义', '牌二': '第二张牌的综合含义', '牌三': '第三张牌的综合含义' },
    'time-flow': { '过去': '影响当前状况的过去因素', '现在': '当前所处的状态与核心问题', '未来': '发展趋势与可能的结果' },
    'sacred-triangle': { '基础': '事情的根基与背景', '过程': '事情的发展过程与变化', '结果': '最终可能的结果' },
    'two-choices': {
      '现状': '你当前所处的状况', '选择A': '第一个选项的发展路径', '选择B': '第二个选项的发展路径',
      'A的结果': '选择第一个选项可能带来的结果', 'B的结果': '选择第二个选项可能带来的结果',
    },
    'love-cross': {
      '你': '你在这段关系中的状态与感受', '对方': '对方在这段关系中的状态与感受',
      '关系': '你们之间关系的本质与现状', '过去': '影响这段关系的过去因素', '未来': '这段关系的未来发展趋势',
    },
    'celtic-cross': {
      '现状': '当前状况的核心', '阻碍': '面临的挑战或阻碍', '基础': '问题的根源与基础',
      '过去': '过去的经历与影响', '目标': '期望的目标与方向', '未来': '近期的发展趋势',
      '自我': '你当前的态度与状态', '环境': '周围环境与他人的影响', '希望': '内心的希望与恐惧', '结果': '最终的可能结果',
    },
    'hexagram': {
      '过去': '问题的过去成因', '现在': '当前的状态', '未来': '未来的发展',
      '原因': '问题的深层原因', '环境': '周围环境的影响', '结果': '最终的可能性',
    },
  }

  const hints = positionHints[spreadKey] || {}

  const cardList = cards
    .map((c) => {
      const rev = c.reversed ? '逆位' : '正位'
      const hint = hints[c.position] || c.position
      return `  - 位置"${c.position}"（${hint}）：${rev}${c.name}（${c.nameEn}）`
    })
    .join('\n')

  return `请为我解读以下塔罗牌阵：

**牌阵**：${spreadName}（${cards.length} 张牌）

**抽到的牌**：
${cardList}

请按以下格式输出：

### 📜 逐张解读
对每一张牌，结合它在牌阵中的位置含义进行解读。标注牌名、正逆位，解释它在当前位置的核心信息。

### 🔮 整体牌阵分析
综合所有牌的位置、牌面含义和它们之间的关联，给出整体的牌阵解读。

### 💫 指引与建议
基于当前牌面信息，给出2-3条具体的未来行动建议或思考方向。`
}
