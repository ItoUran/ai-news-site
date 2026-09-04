import "server-only";
import type { ArticleCategory } from "@/types/database";
import type { ArticleWithSource, UserArticleInteractionRow } from "@/types/database";
import { FIXED_CATEGORY_ORDER } from "@/types/article";

const LIKE_WEIGHT = 3;
const DISLIKE_WEIGHT = -3;
const VIEW_WEIGHT = 1;

type UserSignals = {
  categoryAffinity: Record<ArticleCategory, number>; // 0-1 正規化済み
  keywordWeights: Map<string, number>; // 正規化前の頻度スコア
  dislikedSourceIds: Set<string>;
};

/** interactions から、記事本文(category/keywords)を突き合わせてユーザーの嗜好シグナルを集計する */
export function buildUserSignals(
  interactions: UserArticleInteractionRow[],
  interactionArticles: Map<string, ArticleWithSource>,
): UserSignals {
  const categoryScoreRaw: Record<string, number> = {};
  const keywordWeights = new Map<string, number>();
  const sourceDislikeCounts = new Map<string, number>();

  for (const interaction of interactions) {
    const article = interactionArticles.get(interaction.article_id);
    if (!article) continue;

    let weight = interaction.view_count * VIEW_WEIGHT;
    if (interaction.liked) weight += LIKE_WEIGHT;
    if (interaction.disliked) weight += DISLIKE_WEIGHT;

    categoryScoreRaw[article.category] = (categoryScoreRaw[article.category] ?? 0) + weight;

    if (weight > 0) {
      for (const kw of article.keywords) {
        keywordWeights.set(kw, (keywordWeights.get(kw) ?? 0) + weight);
      }
    }

    if (interaction.disliked && article.source_id) {
      sourceDislikeCounts.set(
        article.source_id,
        (sourceDislikeCounts.get(article.source_id) ?? 0) + 1,
      );
    }
  }

  const maxScore = Math.max(1, ...Object.values(categoryScoreRaw).map((v) => Math.max(v, 0)));
  const categoryAffinity = Object.fromEntries(
    FIXED_CATEGORY_ORDER.map((c) => [c, Math.max(0, categoryScoreRaw[c] ?? 0) / maxScore]),
  ) as Record<ArticleCategory, number>;

  const dislikedSourceIds = new Set(
    [...sourceDislikeCounts.entries()].filter(([, n]) => n >= 3).map(([id]) => id),
  );

  return { categoryAffinity, keywordWeights, dislikedSourceIds };
}

function keywordOverlapScore(article: ArticleWithSource, signals: UserSignals): number {
  if (signals.keywordWeights.size === 0) return 0;
  const maxWeight = Math.max(...signals.keywordWeights.values());
  if (maxWeight <= 0) return 0;

  let sum = 0;
  for (const kw of article.keywords) {
    sum += signals.keywordWeights.get(kw) ?? 0;
  }
  return Math.min(1, sum / (maxWeight * 3)); // 3個一致で頭打ちに近づく程度の緩やかな正規化
}

function recencyScore(publishedAt: string | null): number {
  if (!publishedAt) return 0;
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, 1 - ageHours / (24 * 14)); // 14日で0に近づく線形減衰
}

/** 日替わりの安定した疑似乱数(0-1)。userId + dateSeed + articleId から決定的に生成。 */
function dailyPseudoRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 1000) / 1000;
}

export function filterCandidatePool(
  articles: ArticleWithSource[],
  interactedArticleIds: Set<string>,
  signals: UserSignals,
): ArticleWithSource[] {
  return articles.filter(
    (a) =>
      !interactedArticleIds.has(a.id) &&
      !(a.source_id && signals.dislikedSourceIds.has(a.source_id)),
  );
}

export type ScoredArticle = { article: ArticleWithSource; score: number };

/** おすすめタブ: カテゴリ親和度 + キーワード一致 + 新しさ + ソース多様性 */
export function scoreForRecommended(
  articles: ArticleWithSource[],
  signals: UserSignals,
): ScoredArticle[] {
  return articles
    .map((article) => {
      const categoryScore = signals.categoryAffinity[article.category] ?? 0;
      const keywordScore = keywordOverlapScore(article, signals);
      const recency = recencyScore(article.published_at);
      const score = 0.4 * categoryScore + 0.35 * keywordScore + 0.15 * recency + 0.1 * 1;
      return { article, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** 探索タブ: カテゴリ親和度を反転させ、普段見ないジャンルを優先しつつ日替わりの新鮮さを混ぜる */
export function scoreForExplore(
  articles: ArticleWithSource[],
  signals: UserSignals,
  userId: string,
  dateSeed: string,
): ScoredArticle[] {
  return articles
    .map((article) => {
      const categoryScore = signals.categoryAffinity[article.category] ?? 0;
      const recency = recencyScore(article.published_at);
      const rand = dailyPseudoRandom(`${userId}:${dateSeed}:${article.id}`);
      const score = 0.5 * (1 - categoryScore) + 0.3 * recency + 0.2 * rand;
      return { article, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** 同一ソース/カテゴリが連続しないよう後段でリランキングする */
export function diversify(scored: ScoredArticle[], maxConsecutive = 2): ArticleWithSource[] {
  const result: ArticleWithSource[] = [];
  const remaining = [...scored];
  let lastSourceId: string | null = null;
  let lastCategory: string | null = null;
  let consecutiveCount = 0;

  while (remaining.length > 0) {
    let pickIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      const { article } = remaining[i];
      const sameAsLast = article.source_id === lastSourceId && article.category === lastCategory;
      if (!(sameAsLast && consecutiveCount >= maxConsecutive)) {
        pickIndex = i;
        break;
      }
    }

    const [picked] = remaining.splice(pickIndex, 1);
    result.push(picked.article);

    if (picked.article.source_id === lastSourceId && picked.article.category === lastCategory) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastSourceId = picked.article.source_id;
      lastCategory = picked.article.category;
    }
  }

  return result;
}

/** 未ログイン/新規ユーザー向け: 全カテゴリ均等ローテーション */
export function roundRobinByCategory(articles: ArticleWithSource[]): ArticleWithSource[] {
  const byCategory = new Map<string, ArticleWithSource[]>();
  for (const a of articles) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }

  const result: ArticleWithSource[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const category of FIXED_CATEGORY_ORDER) {
      const bucket = byCategory.get(category);
      if (bucket && bucket.length > 0) {
        result.push(bucket.shift()!);
        added = true;
      }
    }
  }
  return result;
}
