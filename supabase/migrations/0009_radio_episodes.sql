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
