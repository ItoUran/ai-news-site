import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ArticleCategory } from "@/types/database";
import type { ArticleWithSource } from "@/types/database";

const ARTICLE_SELECT = "*, source:sources(id, name, homepage_url)";

/**
 * 一覧系クエリは、DB接続が一時的に不調でも記事一覧タブ全体をクラッシュさせず
 * 空状態(ArticleGridのemptyMessage)で表示できるよう、失敗時は例外を投げず
 * ログのみ出して空配列を返す。
 */
function logAndEmpty(context: string, error: unknown): [] {
  console.error(`[articles] ${context} failed:`, error);
  return [];
}

export const ARTICLES_PER_PAGE = 10;

export type PagedArticles = {
  articles: ArticleWithSource[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/** カテゴリタブ用: 指定カテゴリのファクトチェック合格記事をページ単位(新着順)で取得 */
export async function getArticlesByCategory(
  category: ArticleCategory,
  page = 1,
  pageSize = ARTICLES_PER_PAGE,
): Promise<PagedArticles> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" })
    .eq("category", category)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[articles] getArticlesByCategory failed:", error);
    return { articles: [], page, pageSize, totalCount: 0, totalPages: 0 };
  }

  const totalCount = count ?? 0;
  return {
    articles: (data ?? []) as unknown as ArticleWithSource[],
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

/** ID配列から記事をまとめて取得(おすすめ/探索スコアリングでのinteraction突き合わせ用) */
export async function getArticlesByIds(ids: string[]): Promise<ArticleWithSource[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select(ARTICLE_SELECT).in("id", ids);

  if (error) return logAndEmpty("getArticlesByIds", error);
  return (data ?? []) as unknown as ArticleWithSource[];
}

/** 記事詳細(取得失敗時は notFound 相当として null を返す) */
export async function getArticleById(id: string): Promise<ArticleWithSource | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[articles] getArticleById failed:", error);
    return null;
  }
  return (data as unknown as ArticleWithSource) ?? null;
}

/** 直近N日以内の全カテゴリ記事(スコアリングの候補プール用) */
export async function getRecentArticles(days = 14, limit = 500): Promise<ArticleWithSource[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return logAndEmpty("getRecentArticles", error);
  return (data ?? []) as unknown as ArticleWithSource[];
}

/** 直近7日の全体人気記事(未ログインユーザーのおすすめフォールバック用) */
export async function getTrendingArticles(limit = 20): Promise<ArticleWithSource[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 未ログイン向けの簡易フォールバックのため、いいね数の厳密な集計はせず新着順で代替する。
  // (RLS上anon roleはinteractionsを読めないため、articles単体の新着で代用)
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return logAndEmpty("getTrendingArticles", error);
  return (data ?? []) as unknown as ArticleWithSource[];
}
