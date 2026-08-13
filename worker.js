// Cloudflare Worker — serves static assets + proxies DeepSeek API

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // === API route: POST /api/reading ===
    if (url.pathname === '/api/reading') {
      return handleReading(request, env)
    }

    // === Static assets ===
    try {
      return await env.ASSETS.fetch(request)
    } catch (err) {
      return new Response('Not found', { status: 404 })
    }
  },
}

async function handleReading(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(),
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { spread, cards, question } = body || {}
  if (!spread || !cards || !Array.isArray(cards)) {
    return json({ error: 'Missing spread or cards' }, 400)
  }

  const apiKey = env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return json({ error: 'API Key not configured' }, 500)
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(spread, cards, question)

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

  return new Response(deepseekResp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders(),
    },
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  })
}

function buildSystemPrompt() {
  return `你是一位经验丰富的塔罗师，精通韦特塔罗（Rider-Waite）体系，擅长结合牌阵位置、正逆位、牌面象征意义进行深度解读。

【解读风格】混合型：
- 牌面描述与情感、象征的部分，用神秘诗意的语言（丰富的隐喻、意象、神话典故）
- 行动建议的部分，用理性分析的语言（心理学视角、务实、可操作）

【核心原则】
- 逆位牌不等于"坏"，解释其内化、阻碍或转化的含义
- 保持"引导而非预言"的姿态：塔罗反映可能性，而非命运
- 不做医疗、法律、投资的具体建议
- 尊重边界，仅供娱乐与自我探索，不替代专业心理咨询

请使用中文回复，语言流畅自然，使用 markdown 格式输出。`
}

function buildUserPrompt(spreadKey, cards, question) {
  const spreadNameMap = {
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

  const positionHints = {
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

  return `${question ? `**你的问题**：${question}\n\n` : ''}请为我解读以下塔罗牌阵：

**牌阵**：${spreadName}（${cards.length} 张牌）

**抽到的牌**：
${cardList}

请按以下六部分结构输出解读：

### 🖼 牌面描述
逐张描述牌面的核心画面与象征意象（每张2-3句）。

### 🃏 单牌含义
逐张说明每张牌在当前位置、当前正逆位下的具体含义，紧扣牌阵位置。

### 🔗 牌组互动
分析各张牌之间的能量流动、矛盾与呼应，说明它们如何彼此影响。

### 🔮 综合解读
将所有牌与牌阵结构整合，给出一个连贯的整体叙事。

### 💫 行动建议
基于牌面信息，给出1-3条具体、可操作的建议。

### 🌙 结语
用温暖的一句话收尾，给予希望与力量。`
}
