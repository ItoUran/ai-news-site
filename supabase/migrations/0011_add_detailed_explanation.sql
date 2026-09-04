-- 0011_add_detailed_explanation.sql
-- 記事詳細ページの「詳しく」ボタン用。オンデマンドでAIが生成する深掘り解説を
-- キャッシュするカラム(一度生成したら再利用し、クリックの度に再生成しない)。

alter table articles
  add column if not exists detailed_explanation text,
  add column if not exists detailed_explanation_generated_at timestamptz;
