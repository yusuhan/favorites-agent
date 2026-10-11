# 收藏夹 Agent

把散落在微信、小红书、B 站、抖音里的收藏变成“现在就能做的一小步”：每条收藏生成一张行动卡，存新内容时翻出相关的旧收藏，还能只用你自己的收藏回答问题。

- 方案：[收藏夹 Agent MVP 方案](https://claude.ai/code/artifact/14e6b5fd-1e7e-46af-8edc-7fae1930b475)
- PRD：[收藏夹 Agent PRD](https://claude.ai/code/artifact/fb53faba-e06f-4284-925b-761839dbeea2)

## 现在能做什么

- 邮箱验证码登录，每个人只看得到自己的收藏
- 粘贴公众号、B 站、网页链接，或小红书、抖音的分享文案，生成行动卡：一句话要点 + 15 分钟内能做的小动作，按穿搭、美食、教程、认知、其他分类
- 一次粘贴多条链接，批量搬老收藏
- 存新内容时，如果有足够相关的旧收藏，提示“你 X 周前也存过……”
- 问答：只用自己的收藏回答并标出处，找不到就说不知道
- 行动卡反馈（做了 / 以后再说 / 不感兴趣）、删除收藏
- 提醒的点开和反馈、每次提问都记在数据库里，用来算指标和做评测

还没做：截图识别、每周回顾邮件、B 站字幕、注销账号。

## 第一次配置

1. 装 Node.js 20 以上
2. 在 [Supabase](https://supabase.com) 建项目，到 SQL Editor 里整段运行 `supabase/schema.sql`
3. Supabase 后台 Authentication → Email Templates → Magic Link，把正文改成包含验证码，例如：`你的登录验证码是 {{ .Token }}`。不改的话邮件里只有链接，没有验证码
4. Supabase 自带的发信每小时只能发几封，拉真实用户前要在 Authentication → SMTP Settings 接自己的发信服务（如 Resend）
5. 复制 `.env.example` 为 `.env.local`，填上 Supabase、DeepSeek、阿里云百炼的 key
6. 运行：

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm test` | 跑单元测试 |
| `npm run lint` | 代码检查 |
| `npm run build` | 生产构建 |

## 目录

| 路径 | 作用 |
| --- | --- |
| `src/app/page.tsx` | 主页面 |
| `src/components/` | 登录、收藏入口、行动卡、问答 |
| `src/app/api/items/` | 收藏的新增、列表、反馈、删除 |
| `src/app/api/ask/route.ts` | 问答 |
| `src/app/api/reminders/` | 记录提醒的点开和反馈 |
| `src/lib/ingest.ts` | 收一条的完整流程：解析 → 行动卡 → 向量 → 找相关旧收藏 |
| `src/lib/parse.ts` | 各来源的链接解析 |
| `src/lib/llm.ts` | 行动卡和问答的提示词（DeepSeek） |
| `src/lib/embed.ts` | 向量（通义 text-embedding-v3） |
| `src/lib/chunk.ts` | 原文切块、批量链接拆分 |
| `supabase/schema.sql` | 数据表、行级权限、检索函数 |

## 可调的参数

- `src/lib/ingest.ts` 的 `REMIND_MIN_SIMILARITY`：相似度多高才提醒，现在是 0.55，要用评测集调
- `src/app/api/ask/route.ts` 的 `TOP_K`：问答时取几段原文
