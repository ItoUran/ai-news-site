-- 0013_bookmarks.sql
-- ブックマーク機能(ログインユーザー限定)。既存の user_article_interactions
-- (いいね/よくないね/閲覧数と同じテーブル)にカラムを追加する形で実装する。

alter table user_article_interactions
  add column if not exists bookmarked boolean not null default false;

-- 「自分のブックマーク一覧」取得を高速化する部分インデックス
create index if not exists idx_interactions_bookmarked
  on user_article_interactions (user_id, updated_at desc)
  where bookmarked;
