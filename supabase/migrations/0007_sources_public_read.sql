-- 0007_sources_public_read.sql
-- articles と sources の結合(source:sources(...))で配信元名を表示するために、
-- sources テーブルの読み取りを一般公開する。feed_url等も機密情報ではないため問題ない。

create policy "public can read sources"
  on sources for select
  to anon, authenticated
  using (true);
