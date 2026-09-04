-- 0008_add_international_category.sql
-- 「国際政治」とは別に、世界の事件・事故などを扱う「国際ニュース」カテゴリを追加する。

alter type article_category add value if not exists 'international';
