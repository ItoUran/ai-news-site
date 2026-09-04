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
