-- 0010_add_entertainment_category.sql
-- ビデオゲーム・アニメ・カードゲーム・漫画などのエンタメニュース向けカテゴリを追加する。

alter type article_category add value if not exists 'entertainment';
