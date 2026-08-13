# 塔罗笔记 (Tarot Note)

> 面向实体塔罗牌用户的 AI 解读工具 — 用简洁符号输入牌面，DeepSeek 即时解读。
>
> 最后更新：2026-08-13

---

## 1. 项目概述

**一句话描述**：用户在现实中用实体塔罗牌抽牌后，通过微信浏览器打开本应用，用简短文字符号输入牌面，AI 快速给出各牌解读 + 整体牌阵含义 + 未来指引。

**核心区别（vs 原站 Sea Angel Tarot Diary）**：
| 维度 | 原站 | 本项目 |
|---|---|---|
| 使用场景 | 虚拟抽牌 | 实体牌用户，抽完牌来解读 |
| 输入方式 | 点选卡牌 | 简洁文字符号输入 |
| AI 引擎 | Gemini | DeepSeek |
| 部署平台 | Google Cloud Run | Vercel（免费） |
| 用户系统 | Firebase Auth | 无需登录（localStorage） |
| 数据库 | Firestore | localStorage |

---

## 2. 技术栈

| 层 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 框架 | React | 19 | 生态成熟，与 Vite 配合好 |
| 构建 | Vite | 6.x | 打包快、产物小、移动端加载友好 |
| 样式 | Tailwind CSS | v4 | 原子化 CSS，产物体积小 |
| 动画 | Framer Motion | 11.x | 解读结果渐入动画 |
| 图标 | Lucide React | 最新 | 轻量、tree-shaking |
| AI 接口 | DeepSeek API | `/chat/completions` | 中文能力强，性价比高 |
| 后端代理 | Vercel Serverless Functions | — | 保护 API Key，处理流式响应 |
| 存储 | localStorage | — | MVP 无需数据库 |
| 部署 | Vercel | — | 免费 HTTPS，微信可访问 |

---

## 3. 牌面输入规范

### 3.1 大阿尔卡纳（22 张）

```
正位：0 ~ 21
逆位：-0 ~ -21

映射：0=愚者  1=魔术师  2=女祭司  3=女皇  4=皇帝  5=教皇
      6=恋人  7=战车  8=力量  9=隐士  10=命运之轮
      11=正义  12=倒吊人  13=死神  14=节制  15=恶魔
      16=高塔  17=星星  18=月亮  19=太阳  20=审判  21=世界
```

### 3.2 小阿尔卡纳（56 张）

```
花色：一 = 权杖(Wands)    二 = 圣杯(Cups)
      三 = 宝剑(Swords)    四 = 星币(Pentacles)

数字：1~10  = 点数牌
      11    = 侍从(Page)
      12    = 骑士(Knight)
      13    = 王后(Queen)
      14    = 国王(King)

正位格式：{花色}{数字}    示例：四4  = 正位星币四
逆位格式：{数字}{花色}    示例：4四  = 逆位星币四
```

### 3.3 完整示例

```
输入：0 四4 -三10 一1
解析：
  牌1 → 正位愚者 (The Fool)
  牌2 → 正位星币四 (Four of Pentacles)
  牌3 → 逆位宝剑十 (Ten of Swords, reversed)
  牌4 → 正位权杖一 (Ace of Wands)
```

---

## 4. 支持的牌阵

| 牌阵 | 牌数 | 各位置含义 |
|---|---|---|
| **单张单牌阵** | 1 | 当日指引 |
| **无牌阵三张** | 3 | 自由解读 |
| **时间之流** | 3 | 过去 → 现在 → 未来 |
| **圣三角** | 3 | 基础 → 过程 → 结果 |
| **二择一** | 5 | 现状、A 路径、B 路径、A 结果、B 结果 |
| **爱情十字** | 5 | 你、对方、关系、过去、未来 |
| **凯尔特十字** | 10 | 现状、阻碍、基础、过去、目标、未来、自我、环境、希望、结果 |
| **六芒星** | 6 | 过去、现在、未来、原因、环境、结果 |

---

## 5. 页面结构

### 5.1 首页 — 抽牌解读

```
┌─────────────────────────────┐
│     🃏 塔罗笔记              │
├─────────────────────────────┤
│ [牌阵选择器: 横滑 tabs]      │
│ 单张 │ 无牌阵 │ 时间之流 │...│
├─────────────────────────────┤
│ 所选牌阵: 时间之流 (3张)     │
│ 位置: 过去 / 现在 / 未来     │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 输入牌面...             │ │
│ │ 例: 0 四4 -三10         │ │
│ └─────────────────────────┘ │
│          [ 开始解读 ]        │
├─────────────────────────────┤
│  解读结果区                  │
│  ┌─────────────────────────┐ │
│  │ 🃏 愚者 (正位)          │ │
│  │ 新的开始、冒险、纯真...  │ │
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │ 整体牌阵含义...         │ │
│  └─────────────────────────┘ │
│          [ 保存到历史 ]      │
└─────────────────────────────┘
```

### 5.2 历史记录

- 时间倒序列表
- 每条显示：日期、牌阵名、牌面摘要
- 点击展开完整解读
- 长按/左滑删除

### 5.3 牌面图片展示（牌阵摆放）

**实时预览**：在输入框边打字，下方会实时按牌阵形状显示已输入牌的图片——增删字符即时刷新（`CardInput.tsx` 复用 `parseCards()` 结果，喂给 `SpreadLayout`，`animated=false` 关闭入场动画以免卡顿），牌数超过牌阵上限时截断显示。

用户点击「开始解读」后，结果区顶部会立即渲染所抽牌的 **Rider-Waite 牌面图片**，并按所选牌阵的经典形状摆放：

- 单张 / 无牌阵三张 / 时间之流 → 一排
- 圣三角 → 三角（顶点在上）
- 二择一 → 岔路（现状在上，两分支在下）
- 爱情十字 → 十字（你/对方左右，关系居中，过去上、未来下）
- 凯尔特十字 → 十字 + 右侧竖列（第 2 张「阻碍」横置压在第 1 张「现状」上）
- 六芒星 → 六边形排布

**实现要点**：
- 图片位置由 `src/lib/layouts.ts` 里的百分比坐标定义（每张牌的 `{x, y}` 中心点 + 可选 `rotate`），`SpreadLayout.tsx` 用绝对定位 + `translate(-50%,-50%)` 居中摆放。
- **逆位牌**：图片旋转 180°（倒置显示）。
- 图片路径映射在 `cards.ts` 的 `getCardImage()`：大牌 `m00~m21`，小牌 `w/c/s/p + 01~14`。

**图片来源与授权**：Rider-Waite-Smith 牌面扫描，来自 [metabismuth/tarot-json](https://github.com/metabismuth/tarot-json) 的 `cards/` 目录（350×600px，共 78 张，约 7.6MB）。该牌面在美国属公有领域（出版于 1909 年），仓库 MIT 协议。**已本地打包到 `public/cards/`**（不依赖 `raw.githubusercontent.com`，国内可稳定加载）。

---

## 6. 项目结构

```
tarot-note/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── api/
│   └── reading.ts              # Vercel Serverless (DeepSeek 代理)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css                 # Tailwind + 自定义样式
│   ├── lib/
│   │   ├── cards.ts            # 78张牌完整数据 + 图片路径映射
│   │   ├── parser.ts           # 输入符号解析器
│   │   ├── spreads.ts          # 8种牌阵定义
│   │   ├── layouts.ts          # 8种牌阵的视觉布局坐标（图片摆放位置）
│   │   ├── storage.ts          # localStorage 封装
│   │   └── prompt.ts           # AI prompt 模板
│   ├── components/
│   │   ├── SpreadSelector.tsx  # 牌阵选择器
│   │   ├── CardInput.tsx       # 牌面输入框
│   │   ├── SpreadLayout.tsx    # 牌图按牌阵形状摆放
│   │   ├── ReadingCard.tsx     # 单张牌解读卡片（已由 SpreadLayout 取代）
│   │   ├── ReadingResult.tsx   # 完整解读结果
│   │   ├── HistoryList.tsx     # 历史列表
│   │   └── HistoryDetail.tsx   # 历史详情
│   └── hooks/
│       └── useStreamReading.ts # 流式读取 hook
└── public/
    ├── manifest.json           # PWA 配置
    └── cards/                  # 78张 Rider-Waite 牌面图片（本地打包）
```

---

## 7. AI Prompt 设计

```markdown
System: 你是一位经验丰富的专业塔罗解读师，擅长结合牌阵位置含义进行深度解读。
请用温暖、有洞察力的语言风格，结合心理学和象征意义进行解读。

User:
牌阵：{spread_name}
各位置含义：{position_meanings}
抽到的牌：
  - 位置1「{pos_name}」：{card_name} ({reversed_status})
  - 位置2「{pos_name}」：{card_name} ({reversed_status})
  ...

请按以下格式输出：
### 逐张解读
每张牌：牌名 + 在当前位置的核心含义 (2-3句)

### 整体牌阵分析
结合所有牌和牌阵结构，给出整体解读 (3-5句)

### 指引与建议
基于牌面信息，给出未来行动方向 (2-3条)
```

---

## 8. localStorage 数据结构

```typescript
interface SavedReading {
  id: string;           // crypto.randomUUID()
  date: string;         // ISO 8601
  spread: string;       // 牌阵名称
  spreadKey: string;    // 牌阵 key (如 'time-flow')
  cards: ParsedCard[];  // 解析后的牌数组
  reading: string;      // AI 解读 markdown 全文
}

interface ParsedCard {
  input: string;        // 原始输入
  name: string;         // 中文名
  nameEn: string;       // 英文名
  reversed: boolean;    // 是否逆位
  arcana: 'major' | 'minor';
  number: number;       // 牌面数字
  suit?: string;        // 花色 (小牌)
  position?: string;    // 在牌阵中的位置名
}
```

---

## 9. API 接口

### `POST /api/reading`

请求：
```json
{
  "spread": "time-flow",
  "cards": [
    { "name": "愚者", "nameEn": "The Fool", "reversed": false, "position": "过去" },
    { "name": "星币四", "nameEn": "Four of Pentacles", "reversed": false, "position": "现在" },
    { "name": "宝剑十", "nameEn": "Ten of Swords", "reversed": true, "position": "未来" }
  ]
}
```

响应：SSE 流式 (`text/event-stream`) 或 JSON

---

## 10. 部署配置

### 部署平台：Cloudflare Workers

> Vercel 的 `*.vercel.app` 域名在国内被墙，改用 Cloudflare Workers（`*.workers.dev` 可访问）。

**线上地址**：https://tarot-note2.zbw230.workers.dev/

### 环境变量

在 Cloudflare Dashboard → Settings → Variables and Secrets 设置：

| 名称 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（需设置在生产环境 Production） |

### 构建配置

| 字段 | 值 |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |

### 项目结构（Workers 版本）

```
tarot-note/
├── worker.js              # Workers 入口：API 代理 + 静态资源
├── wrangler.toml          # Workers 配置（assets 指向 ./dist）
├── src/                   # 前端源码（Vite + React）
└── dist/                  # 构建产物（由 npm run build 生成）
```

---

## 11. 完成状态

| 事项 | 状态 |
|---|---|
| DeepSeek API Key | ✅ 已配置 |
| GitHub 仓库 | ✅ zbw230-png/tarot-note |
| Cloudflare 部署 | ✅ tarot-note2.zbw230.workers.dev |
| AI 解读接口 | ✅ 已打通（流式返回） |
| 牌面识别 + 正逆位 + 位置名 | ✅ 已验证正常 |
| 端到端微信实测 | ✅ **已可用** |

---

## 12. 更新日志

| 日期 | 更新内容 |
|---|---|
| 2026-08-12 | 初始文档，完成需求分析与技术方案设计 |
| 2026-08-12 | **代码完成**：项目初始化、数据层、UI 组件、流式 API、App 串联。构建通过。 |
| 2026-08-12 | **部署**：迁移到 Cloudflare Workers（Vercel 被墙）。新增 `worker.js` + `wrangler.toml`。 |
| 2026-08-12 | **修复**：SSE 流式解析改为 DeepSeek OpenAI 兼容格式（`choices[0].delta.content`）。API 实测返回正常中文解读。 |
| 2026-08-12 | **修复**：前端发送给 API 的牌数据由嵌套 `card.name` 改为扁平 `{name, nameEn, reversed, position}`，解决解读显示 "undefined" 的问题。 |
| 2026-08-12 | **完成**：端到端微信实测通过，应用正式可用。总结 7 个踩坑记录 + 复刻模板。 |
| 2026-08-13 | **功能**：采纳 tarot.skill 的解读风格（混合型）+ 六段式输出结构（牌面描述/单牌含义/牌组互动/综合解读/行动建议/结语），并加入伦理边界（逆位≠坏、引导而非预言）。 |
| 2026-08-13 | **功能**：用户输入牌后显示 Rider-Waite 牌面图片，并按牌阵形状摆放（逆位旋转 180°、凯尔特十字第 2 张横置）。新增 `public/cards/`（78 张本地打包）、`layouts.ts`、`SpreadLayout.tsx`。 |
| 2026-08-13 | **功能**：输入框下方增加实时牌阵预览——边打字边按牌阵形状显示牌图，增删即时刷新（`SpreadLayout` 加 `animated` 开关，预览态关闭动画）。 |

---

## 13. 踩坑记录（务必阅读，避免重蹈覆辙）

本次部署踩了 7 个坑，耗时最长的是坑 #4。以后做"国内手机可访问的 AI Web 应用"务必按此避坑。

### 坑 #1：Vercel 域名国内被墙 ❌

**现象**：部署成功后 `*.vercel.app` 打开显示"无法访问"。

**原因**：Vercel 默认域名被 GFW 屏蔽。

**解决**：改用 **Cloudflare Workers**（`*.workers.dev` 域名国内可访问），同样免费、支持 Git 自动部署 + Serverless 函数。

**教训**：面向国内用户的应用，部署平台首选 Cloudflare（Workers/Pages），不要用 Vercel。

### 坑 #2：Cloudflare Pages 和 Workers 的目录结构不同 ⚠️

**现象**：用 Pages 的 `functions/` 目录格式部署到 Workers，API 返回 405。

**原因**：
- **Pages** 用 `functions/api/xxx.js` 目录约定（`onRequest` 导出）
- **Workers** 用 `worker.js` 入口 + `wrangler.toml` 配置

**解决**：写 `worker.js`（`export default { fetch() }`）+ `wrangler.toml`（`[assets]` 指向 `./dist`）。

**教训**：先搞清楚项目是 Pages 还是 Workers 类型（看 URL 后缀 `.pages.dev` vs `.workers.dev`），再决定代码结构。

### 坑 #3：构建产物目录填错字段 ❌

**现象**：构建日志报 `dist: not found`。

**原因**：把 `dist`（输出目录）填进了 "Deploy command" 字段，Cloudflare 当成 shell 命令执行。

**解决**：Workers 的正确构建配置是：
```
Build command:   npm run build
Deploy command:  npx wrangler deploy   ← 不是 dist！
```
输出目录 `dist` 由 `wrangler.toml` 的 `[assets] directory` 声明，不需要单独填。

### 坑 #4：环境变量作用域（本次最耗时）⏱️

**现象**：API 一直返回 `"API Key not configured"`，排查了很久。

**原因**：`DEEPSEEK_API_KEY` 加在了 Cloudflare 的 **Preview** 环境，而 `.workers.dev` 生产域名只读 **Production** 环境的变量。

**解决**：在 Settings → Variables and Secrets 里把变量的环境改成 **Production**，然后重新部署。

**教训**：Cloudflare 的 Variables/Secrets 分 Preview 和 Production 两个作用域，**改完变量必须重新部署才生效**。排查"环境变量读不到"时，第一件事就是确认作用域。

### 坑 #5：DeepSeek 流式响应格式 ⚠️

**现象**：后端能拿到流式数据，但前端白屏/不显示文字。

**原因**：前端把 SSE 内容解析成 `parsed.content`，但 DeepSeek（OpenAI 兼容格式）实际返回：
```json
{"choices":[{"delta":{"content":"..."}}]}
```
内容在 `choices[0].delta.content`，不是顶层 `content`。

**解决**：前端解析改成 `parsed.choices?.[0]?.delta?.content`。

**教训**：接入 LLM 流式接口前，先用 curl 看一次真实返回格式，别凭记忆写解析逻辑。

### 坑 #6：GitHub 用户名大小写 ⚠️

**现象**：`git push` 报 "Repository not found"。

**原因**：remote URL 里用户名写成了大写 `ZBW-230-PNG`，实际是小写 `zbw230-png`。

**解决**：`git remote set-url origin` 改成正确大小写。

**教训**：GitHub 用户名区分大小写，拿不准就从浏览器地址栏复制完整 URL。

### 坑 #7：前后端数据字段结构不一致 ⚠️

**现象**：AI 返回的解读里所有牌名、正逆位、位置名都显示 "undefined"。

**原因**：前端发送的是嵌套结构 `{ card: { name, nameEn }, reversed }`，后端 `worker.js` 读的是扁平字段 `{ name, nameEn, reversed, position }`。字段名对不上，全部变成 undefined。

**解决**：前端发送前把数据拍平：
```js
cards.map((c, i) => ({
  name: c.card.name,       // 从嵌套对象取出
  nameEn: c.card.nameEn,
  reversed: c.reversed,
  position: spread.positions[i]?.label,  // 从牌阵定义补上位置名
}))
```

**教训**：前后端共用数据契约时，发送前先确认字段形状完全一致。尤其注意：`position`（牌在牌阵中的位置名）这类字段前端原始数据里根本没有，需要从牌阵定义现算出来。

---

## 14. 复刻模板：国内可访问的 AI Web 应用速查

下次做类似项目，直接按这个清单走：

1. **技术栈**：React + Vite + Tailwind + 国内大模型 API（DeepSeek/通义等）
2. **部署**：Cloudflare Workers（`wrangler.toml` + `worker.js`），GitHub 自动部署
3. **AI 代理**：Worker 里 `fetch` 转发到 LLM API，SSE 直接透传
4. **密钥**：Cloudflare Dashboard → Variables and Secrets → 设 Production 作用域 → 重新部署
5. **流式解析**：先 curl 看真实返回格式，OpenAI 兼容格式取 `choices[0].delta.content`
6. **验证**：curl 测 API 是否 200 + 是否有 `data:` 流，再让用户微信实测
