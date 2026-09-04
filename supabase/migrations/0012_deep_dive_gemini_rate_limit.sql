-- 0012_deep_dive_gemini_rate_limit.sql
-- 「詳しく」ボタンのオンデマンド生成(/api/articles/[id]/deep-dive)は認証不要の
-- 公開エンドポイントであり、Ollamaが到達できない本番環境ではGeminiにフォールバックする。
-- 悪意ある連打・大量の記事IDへの一括アクセスで無料枠を消費し尽くさないよう、
-- 1日あたりのGemini呼び出し回数を記録・上限チェックするためのログテーブル。

create table if not exists deep_dive_gemini_calls (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

create index if not exists idx_deep_dive_gemini_calls_created_at
  on deep_dive_gemini_calls (created_at);

alter table deep_dive_gemini_calls enable row level security;
-- select/insertポリシーは作らない -> service-role(RLSバイパス)のみアクセス可能
