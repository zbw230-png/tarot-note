# 塔罗笔记 (Tarot Note)

> 面向实体塔罗牌用户的 AI 解读工具 — 用简洁符号输入牌面，DeepSeek 即时解读。
>
> 最后更新：2026-08-12

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
│   │   ├── cards.ts            # 78张牌完整数据
│   │   ├── parser.ts           # 输入符号解析器
│   │   ├── spreads.ts          # 8种牌阵定义
│   │   ├── storage.ts          # localStorage 封装
│   │   └── prompt.ts           # AI prompt 模板
│   ├── components/
│   │   ├── SpreadSelector.tsx  # 牌阵选择器
│   │   ├── CardInput.tsx       # 牌面输入框
│   │   ├── ReadingCard.tsx     # 单张牌解读卡片
│   │   ├── ReadingResult.tsx   # 完整解读结果
│   │   ├── HistoryList.tsx     # 历史列表
│   │   └── HistoryDetail.tsx   # 历史详情
│   └── hooks/
│       └── useStreamReading.ts # 流式读取 hook
└── public/
    └── manifest.json           # PWA 配置
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

### Vercel 环境变量

```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 部署流程

1. 代码推送到 GitHub 仓库
2. Vercel 连接仓库，自动识别 Vite 项目
3. 设置环境变量
4. 自动部署，获得 `https://xxx.vercel.app` 域名
5. 微信中直接打开链接即可使用

---

## 11. 待用户准备

| 事项 | 状态 |
|---|---|
| DeepSeek API Key | ✅ 已有 |
| GitHub 账号 | ❓ 待确认 |
| Vercel 账号 | ❓ 待确认 |

---

## 12. 更新日志

| 日期 | 更新内容 |
|---|---|
| 2026-08-12 | 初始文档，完成需求分析与技术方案设计 |
| 2026-08-12 | **代码完成**：项目初始化、数据层（卡牌/解析器/牌阵/存储/Prompt）、6个 UI 组件、流式 API + Hook、App 主页面串联。TypeScript 编译 + Vite 生产构建通过。 |
