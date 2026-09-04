-- 0003_articles.sql
-- 記事テーブル。ファクトチェックに合格した記事のみRLSで一般公開される。

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  category article_category not null default 'other',

  -- 原文(AIパイプラインの入力・監査用。UIには本文全体を表示しない=著作権配慮)
  original_title text not null,
  original_body text,
  original_url text not null,
  url_hash text not null unique, -- sha256(original_url) 重複排除キー
  original_language text not null default 'ja',

  -- 日本語表示用(AI生成)
  translated_title text not null,
  translated_summary text not null,
  image_url text,
  keywords text[] not null default '{}',

  published_at timestamptz,
  fetched_at timestamptz not null default now(),

  -- ファクトチェック結果
  fact_check_status fact_check_status not null default 'pending',
  fact_check_score numeric, -- 0.0 - 1.0
  fact_check_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_articles_listing
  on articles (category, fact_check_status, published_at desc);

create index if not exists idx_articles_source
  on articles (source_id);

create index if not exists idx_articles_keywords
  on articles using gin (keywords);

create index if not exists idx_articles_status_recent
  on articles (fact_check_status, published_at desc);

-- updated_at 自動更新トリガー
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articles_updated_at on articles;
create trigger trg_articles_updated_at
  before update on articles
  for each row
  execute function set_updated_at();

alter table articles enable row level security;

-- 一般公開: ファクトチェック合格記事のみ閲覧可能(anon/authenticated共通)
create policy "public can read passed articles"
  on articles for select
  to anon, authenticated
  using (fact_check_status = 'pass');

-- insert/update/delete ポリシーは作らない -> service-role(RLSバイパス)のみ書込可能
