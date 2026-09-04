/**
 * Supabase テーブルの手書き型定義。
 *
 * 本来は `supabase gen types typescript --project-id <ref> > src/types/database.ts`
 * (要 Supabase CLI ログイン)で自動生成するのが望ましいが、それはユーザー側の
 * 手動セットアップ手順に含まれるため、ここでは supabase/migrations/*.sql と
 * 一致する形で手動定義しておく。CLIでの生成後はこのファイルを置き換えてよい。
 */

export type ArticleCategory =
  | "domestic"
  | "domestic_politics"
  | "international"
  | "international_politics"
  | "it"
  | "entertainment"
  | "other";

export type FactCheckStatus = "pending" | "pass" | "fail" | "needs_review";

export type SourceRow = {
  id: string;
  name: string;
  feed_url: string;
  homepage_url: string | null;
  language: string;
  default_category: ArticleCategory;
  is_active: boolean;
  trust_weight: number;
  created_at: string;
};

export type ArticleRow = {
  id: string;
  source_id: string | null;
  category: ArticleCategory;
  original_title: string;
  original_body: string | null;
  original_url: string;
  url_hash: string;
  original_language: string;
  translated_title: string;
  translated_summary: string;
  image_url: string | null;
  keywords: string[];
  published_at: string | null;
  fetched_at: string;
  fact_check_status: FactCheckStatus;
  fact_check_score: number | null;
  fact_check_notes: string | null;
  detailed_explanation: string | null;
  detailed_explanation_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

/** 記事一覧・詳細表示に使う、articles と sources を結合したビュー用の型 */
export type ArticleWithSource = ArticleRow & {
  source: Pick<SourceRow, "id" | "name" | "homepage_url"> | null;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  theme_preference: "light" | "dark" | "system";
  preferred_area_code: string;
  created_at: string;
  updated_at: string;
};

export type UserArticleInteractionRow = {
  user_id: string;
  article_id: string;
  liked: boolean;
  disliked: boolean;
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  updated_at: string;
};

export type IngestionRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  sources_processed: number;
  articles_fetched: number;
  articles_passed: number;
  articles_failed: number;
  errors: unknown[];
};

export type RadioEpisodeRow = {
  id: string;
  title: string;
  script: string;
  audio_url: string;
  duration_seconds: number | null;
  article_ids: string[];
  published_at: string;
  created_at: string;
};

/** /api/articles/[id]/deep-dive のGeminiフォールバック呼び出し回数の記録(1日あたりの上限チェック用) */
export type DeepDiveGeminiCallRow = {
  id: number;
  created_at: string;
};

/** Supabase JSクライアントの Database ジェネリクスに渡す最小限の型 */
export type Database = {
  public: {
    Tables: {
      sources: {
        Row: SourceRow;
        Insert: Partial<SourceRow>;
        Update: Partial<SourceRow>;
        Relationships: [];
      };
      articles: {
        Row: ArticleRow;
        Insert: Partial<ArticleRow>;
        Update: Partial<ArticleRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      user_article_interactions: {
        Row: UserArticleInteractionRow;
        Insert: Partial<UserArticleInteractionRow>;
        Update: Partial<UserArticleInteractionRow>;
        Relationships: [];
      };
      ingestion_runs: {
        Row: IngestionRunRow;
        Insert: Partial<IngestionRunRow>;
        Update: Partial<IngestionRunRow>;
        Relationships: [];
      };
      radio_episodes: {
        Row: RadioEpisodeRow;
        Insert: Partial<RadioEpisodeRow>;
        Update: Partial<RadioEpisodeRow>;
        Relationships: [];
      };
      deep_dive_gemini_calls: {
        Row: DeepDiveGeminiCallRow;
        Insert: Partial<DeepDiveGeminiCallRow>;
        Update: Partial<DeepDiveGeminiCallRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
