-- 在 Supabase 后台 SQL Editor 里整段运行一次。

create extension if not exists vector;

-- 一条收藏
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('wechat', 'bilibili', 'web', 'text')),
  url text,
  title text,
  content text,
  summary text,
  tags text[] not null default '{}',
  note text, -- 用户写的“为什么存”，可为空
  status text not null default 'ok' check (status in ('ok', 'failed')),
  error text, -- 解析失败的原因，用来统计各来源的解析成功率
  created_at timestamptz not null default now()
);

create index if not exists items_created_at_idx on items (created_at desc);

-- 原文切块和向量，第 2-4 天做问答时用
create table if not exists chunks (
  id bigserial primary key,
  item_id uuid not null references items (id) on delete cascade,
  idx int not null,
  text text not null,
  embedding vector(1024)
);

create index if not exists chunks_item_id_idx on chunks (item_id);
