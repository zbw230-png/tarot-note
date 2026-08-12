// Cloudflare Pages Function — proxies requests to DeepSeek API with streaming

interface Env {
  DEEPSEEK_API_KEY: string
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context

  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: { spread?: string; cards?: unknown[] }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { spread, cards } = body
  if (!spread || !cards || !Array.isArray(cards)) {
    return json({ error: 'Missing spread or cards' }, 400)
  }

  const apiKey = env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return json({ error: 'API Key not configured' }, 500)
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(spread, cards as CardData[])

  const deepseekResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: 2048,
    }),
  })

  if (!deepseekResp.ok) {
    const errText = await deepseekResp.text()
    return json({ error: `DeepSeek API error: ${errText}` }, deepseekResp.status)
  }

  // Stream the response
  return new Response(deepseekResp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// === Helpers ===

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

interface CardData {
  name: string
  nameEn: string
  reversed: boolean
  position: string
}

function buildSystemPrompt(): string {
  return `你是一位经验丰富的专业塔罗解读师。你擅长结合牌阵位置、正逆位、牌面象征意义进行深度解读。
你的解读风格温暖、有洞察力，融合心理学视角与塔罗传统智慧。
请使用中文回复，语言流畅自然，避免生硬的模板感。
每张牌的解读控制在3-5句话，整体分析4-6句话，指引建议列出2-3条。
使用 markdown 格式输出。`
}

function buildUserPrompt(spreadKey: string, cards: CardData[]): string {
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
