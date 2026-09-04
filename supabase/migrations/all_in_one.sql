-- ============================================================
-- AIニュースサイト: 全マイグレーションまとめ実行用ファイル
-- ============================================================

-- ---- 0001_extensions_enums.sql ----
-- 0001_extensions_enums.sql
-- 拡張機能とEnum型の定義

create extension if not exists "pgcrypto"; -- gen_random_uuid() のため

do $$ begin
  create type article_category as enum (
    'domestic',                -- 国内(事件・社会)
    'domestic_politics',       -- 国内政治
    'international_politics',  -- 国際政治
    'it',                      -- IT
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type fact_check_status as enum (
    'pending',
    'pass',
    'fail',
    'needs_review'
  );
exception
  when duplicate_object then null;
end $$;

-- ---- 0002_sources.sql ----
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

-- ---- 0003_articles.sql ----
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

-- ---- 0004_profiles_trigger.sql ----
-- 0004_profiles_trigger.sql
-- auth.users と1:1のプロフィールテーブル。サインアップ時にトリガーで自動作成する。

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  theme_preference text not null default 'system', -- 'light' | 'dark' | 'system'
  preferred_area_code text not null default '130000', -- 気象庁エリアコード(デフォルト:東京)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

alter table profiles enable row level security;

create policy "user can read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "user can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- auth.users への insert 時にプロフィール行を自動作成
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ---- 0005_interactions.sql ----
-- 0005_interactions.sql
-- ユーザーごとの記事への反応(閲覧・いいね・よくないね)。おすすめ/探索スコアリングの入力。

create table if not exists user_article_interactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  liked boolean not null default false,
  disliked boolean not null default false,
  view_count integer not null default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists idx_interactions_user
  on user_article_interactions (user_id, updated_at desc);

create index if not exists idx_interactions_article
  on user_article_interactions (article_id);

drop trigger if exists trg_interactions_updated_at on user_article_interactions;
create trigger trg_interactions_updated_at
  before update on user_article_interactions
  for each row
  execute function set_updated_at();

alter table user_article_interactions enable row level security;

create policy "user can manage own interactions"
  on user_article_interactions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 0006_ingestion_runs.sql ----
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

-- ---- 0007_sources_public_read.sql ----
-- 0007_sources_public_read.sql
-- articles と sources の結合(source:sources(...))で配信元名を表示するために、
-- sources テーブルの読み取りを一般公開する。feed_url等も機密情報ではないため問題ない。

create policy "public can read sources"
  on sources for select
  to anon, authenticated
  using (true);

-- ---- 0008_add_international_category.sql ----
-- 0008_add_international_category.sql
-- 「国際政治」とは別に、世界の事件・事故などを扱う「国際ニュース」カテゴリを追加する。

alter type article_category add value if not exists 'international';

-- ---- 0009_radio_episodes.sql ----
-- 0009_radio_episodes.sql
-- AIラジオ機能: 台本(script)と音声ファイルURL(Supabase Storage)を保持するテーブル。
-- 生成はローカルPC(Ollama + VOICEVOX)から scripts/generate-radio.ts で行う想定。

create table if not exists radio_episodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  script text not null,
  audio_url text not null,
  duration_seconds numeric,
  article_ids uuid[] not null default '{}', -- 台本のもとにした記事(参考情報、任意)
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_radio_episodes_published
  on radio_episodes (published_at desc);

alter table radio_episodes enable row level security;

create policy "public can read radio episodes"
  on radio_episodes for select
  to anon, authenticated
  using (true);

-- 音声ファイル保存用のStorageバケット(公開読み取り可、書き込みはservice-roleのみ)
insert into storage.buckets (id, name, public)
values ('radio-audio', 'radio-audio', true)
on conflict (id) do nothing;

create policy "public can read radio audio files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'radio-audio');

