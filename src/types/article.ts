import type { ArticleCategory } from "./database";

/** カテゴリのタブ表示用メタ情報(ラベル・URLスラッグ・バッジ色) */
export const CATEGORY_META: Record<
  ArticleCategory,
  { label: string; slug: string; badgeClass: string }
> = {
  domestic: {
    label: "国内ニュース",
    slug: "domestic",
    badgeClass: "bg-blue-600 text-white dark:bg-blue-500",
  },
  domestic_politics: {
    label: "国内政治",
    slug: "domestic-politics",
    badgeClass: "bg-rose-800 text-white dark:bg-rose-700",
  },
  international: {
    label: "国際ニュース",
    slug: "international",
    badgeClass: "bg-cyan-700 text-white dark:bg-cyan-500",
  },
  international_politics: {
    label: "国際政治",
    slug: "international-politics",
    badgeClass: "bg-indigo-700 text-white dark:bg-indigo-500",
  },
  it: {
    label: "IT",
    slug: "it",
    badgeClass: "bg-emerald-700 text-white dark:bg-emerald-500",
  },
  other: {
    label: "その他",
    slug: "other",
    badgeClass: "bg-neutral-600 text-white dark:bg-neutral-500",
  },
};

/** 固定カテゴリタブ(探索・おすすめ・天気を除く記事カテゴリタブ) */
export const FIXED_CATEGORY_ORDER: ArticleCategory[] = [
  "domestic",
  "domestic_politics",
  "international",
  "international_politics",
  "it",
];

export type FeedTabKey = "explore" | "recommended" | ArticleCategory;
