-- 0002_sources.sql
-- ニュース収集元(RSSフィード等)の管理テーブル。service-roleのみが読み書きする。

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  homepage_url text,
  language text not null default 'ja', -- 'ja' | 'en'
  default_category article_category not null default 'other',
  is_active boolean not null default true,
  trust_weight numeric not null default 1.0,
  created_at timestamptz not null default now()
);

alter table sources enable row level security;
-- ポリシーを敢えて何も作らない -> anon/authenticatedからは一切アクセス不可(service-roleのみ操作可能)
