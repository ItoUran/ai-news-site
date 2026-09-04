-- 0006_ingestion_runs.sql
-- 収集バッチ(cron)の実行ログ。観測・デバッグ用。service-roleのみ操作。

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sources_processed integer not null default 0,
  articles_fetched integer not null default 0,
  articles_passed integer not null default 0,
  articles_failed integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

alter table ingestion_runs enable row level security;
-- ポリシーなし -> service-roleのみアクセス可能
