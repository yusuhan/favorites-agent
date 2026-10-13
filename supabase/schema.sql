-- 在 Supabase 后台 SQL Editor 里整段运行一次。
-- 所有表都开了行级权限（RLS）：每个用户只能读写自己的数据。

create extension if not exists vector;

-- 一条收藏，以及由它生成的行动卡
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('wechat', 'bilibili', 'web', 'text', 'image')),
  url text,
  title text,
  content text,
  summary text,
  tags text[] not null default '{}',
  note text, -- 用户写的“为什么存”，可为空
  category text check (category in ('穿搭', '美食', '教程', '认知', '其他')),
  card_point text, -- 行动卡：一句话要点
  card_action text, -- 行动卡：15 分钟内能做的小动作，没有合适的就为空
  card_feedback text check (card_feedback in ('done', 'later', 'dismissed')),
  card_feedback_at timestamptz,
  embedding vector(1024), -- 标题 + 要点 + 摘要的向量，用来找相关旧收藏
  status text not null default 'ok' check (status in ('ok', 'failed')),
  error text, -- 解析失败的原因，用来统计各来源的解析成功率
  created_at timestamptz not null default now()
);

create index if not exists items_user_created_idx on items (user_id, created_at desc);

-- 原文切块和向量，问答时检索用
create table if not exists chunks (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  idx int not null,
  text text not null,
  embedding vector(1024) not null
);

create index if not exists chunks_item_id_idx on chunks (item_id);

-- 存时提醒：存 new_item 时翻出了 old_item。记下来算点开率和打扰率
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  new_item_id uuid not null references items (id) on delete cascade,
  old_item_id uuid not null references items (id) on delete cascade,
  similarity real not null,
  opened_at timestamptz,
  feedback text check (feedback in ('done', 'later', 'dismissed')),
  created_at timestamptz not null default now()
);

-- 每次提问都记下来：评测集的素材，也用来算拒答率
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question text not null,
  answer text, -- 为空表示回答“不知道”
  source_item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table items enable row level security;
alter table chunks enable row level security;
alter table reminders enable row level security;
alter table questions enable row level security;

drop policy if exists "own items" on items;
create policy "own items" on items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own chunks" on chunks;
create policy "own chunks" on chunks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own reminders" on reminders;
create policy "own reminders" on reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own questions" on questions;
create policy "own questions" on questions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 问答检索：在当前用户的原文切块里找最相近的
create or replace function match_chunks(query_embedding vector(1024), match_count int)
returns table (item_id uuid, text text, similarity float)
language sql stable security invoker
as $$
  select c.item_id, c.text, 1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.user_id = auth.uid()
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 存时提醒：找和新收藏最相近的旧收藏（比它早存的，且没被标“不感兴趣”）
create or replace function match_items(query_embedding vector(1024), exclude_id uuid, match_count int)
returns table (id uuid, similarity float)
language sql stable security invoker
as $$
  select i.id, 1 - (i.embedding <=> query_embedding) as similarity
  from items i
  where i.user_id = auth.uid()
    and i.id <> exclude_id
    and i.status = 'ok'
    and i.embedding is not null
    and coalesce(i.card_feedback, '') <> 'dismissed'
  order by i.embedding <=> query_embedding
  limit match_count;
$$;

-- 每周回顾邮件选中了哪些行动卡，避免连续几周推同一张，也用来算回顾带来的“做了”
create table if not exists weekly_picks (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists weekly_picks_user_sent_idx on weekly_picks (user_id, sent_at desc);

alter table weekly_picks enable row level security;
drop policy if exists "own weekly picks" on weekly_picks;
create policy "own weekly picks" on weekly_picks for select using (user_id = auth.uid());
