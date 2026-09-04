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
