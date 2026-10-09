# 收藏夹 Agent

把散落在微信、小红书、B 站、抖音里的收藏变成一个能问答、会整理、在合适时机提醒你的个人知识库。

方案文档：[收藏夹 Agent MVP 方案](https://claude.ai/code/artifact/14e6b5fd-1e7e-46af-8edc-7fae1930b475)

## 现在能做什么

- 粘贴公众号文章、B 站视频或任意网页的链接，读出标题和正文
- 粘贴小红书、抖音的分享文案，原样存下（这两个平台的页面抓不稳，第一版不抓）
- 配了 DeepSeek key 时，自动生成摘要和标签
- 解析失败也会记一条，方便统计各来源的解析成功率

还没做：问答、提醒、截图识别、登录（现在所有人共用一个收藏库，公开上线前要加）。

## 本地跑起来

1. 装 Node.js 20 以上
2. 在 [Supabase](https://supabase.com) 建一个项目，到 SQL Editor 里运行 `supabase/schema.sql`
3. 复制 `.env.example` 为 `.env.local`，填上 Supabase 和 DeepSeek 的 key
4. 运行：

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 目录

| 路径 | 作用 |
| --- | --- |
| `src/app/page.tsx` | 收藏页面 |
| `src/app/api/items/route.ts` | 收藏的读取和新增接口 |
| `src/lib/parse.ts` | 各来源的链接解析 |
| `src/lib/llm.ts` | 调模型生成摘要和标签 |
| `supabase/schema.sql` | 数据表 |
