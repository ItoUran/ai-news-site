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
