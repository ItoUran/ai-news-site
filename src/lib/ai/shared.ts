// 注: この modul は scripts/ingest-local.ts (Next.jsのビルドを介さないtsx実行)からも
// 読み込まれるため、あえて "server-only" は付けていない。秘密情報は扱っていない
// (APIキー等はollama.ts/gemini.ts側で保持)ため、クライアントバンドルに混入しても
// 実害は無いが、そもそもNode専用の依存を含む上位モジュール経由でしか使われない。
import type { ArticleCategory, FactCheckStatus } from "@/types/database";

export type ArticleAnalysisInput = {
  sourceName: string;
  sourceUrl: string;
  sourceLanguage: string;
  sourceDefaultCategory: ArticleCategory;
  title: string;
  /** Readabilityで抽出した本文(全文)。長すぎる場合は呼び出し側であらかじめ切り詰める。 */
  body: string;
  publishedAt: string | null;
};

export type ArticleAnalysisResult = {
  factCheckStatus: FactCheckStatus;
  factCheckScore: number;
  factCheckNotes: string;
  category: ArticleCategory;
  translatedTitle: string;
  translatedSummary: string;
  keywords: string[];
};

export const CATEGORY_VALUES: ArticleCategory[] = [
  "domestic",
  "domestic_politics",
  "international",
  "international_politics",
  "it",
  "entertainment",
  "other",
];

export const STATUS_VALUES: FactCheckStatus[] = ["pass", "fail", "needs_review"];

// AIへの構造化出力(JSON Schema)指定に使う共通スキーマ。
// Gemini(responseJsonSchema)・Ollama(format)のどちらもプレーンなJSON Schemaを
// そのまま受け付けるため、プロバイダ間で共有できる。
export const analysisJsonSchema = {
  type: "object",
  properties: {
    fact_check_status: {
      type: "string",
      enum: STATUS_VALUES,
      description:
        "pass: 事実関係に重大な問題なし。fail: 明確な誤情報・捏造・矛盾を検出。needs_review: 検証材料が不足し判断できない。",
    },
    fact_check_score: {
      type: "number",
      description: "0.0〜1.0の信頼度スコア(1.0が最も信頼できる)",
    },
    fact_check_notes: {
      type: "string",
      description: "判定理由の簡潔な説明(日本語、100字程度)",
    },
    category: {
      type: "string",
      enum: CATEGORY_VALUES,
      description: "記事内容に最も適したカテゴリ",
    },
    translated_title: {
      type: "string",
      description: "日本語に翻訳した記事タイトル(元が日本語ならそのまま整えて可)",
    },
    translated_summary: {
      type: "string",
      description: "日本語での要約(2〜4文、150〜250字程度)。本文の丸写しではなく要約すること。",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "レコメンド用のキーワード/タグを3〜8個(日本語の名詞句)",
    },
  },
  required: [
    "fact_check_status",
    "fact_check_score",
    "fact_check_notes",
    "category",
    "translated_title",
    "translated_summary",
    "keywords",
  ],
};

/** 記事本文を先頭N字に切り詰める(トークン量・処理時間を抑えるため) */
export function truncateBody(body: string, maxChars = 4000): string {
  return body.slice(0, maxChars);
}

export function normalizeResult(raw: Record<string, unknown>): ArticleAnalysisResult {
  const status = STATUS_VALUES.includes(raw.fact_check_status as FactCheckStatus)
    ? (raw.fact_check_status as FactCheckStatus)
    : "needs_review";
  const category = CATEGORY_VALUES.includes(raw.category as ArticleCategory)
    ? (raw.category as ArticleCategory)
    : "other";
  const score = typeof raw.fact_check_score === "number" ? raw.fact_check_score : 0.5;
  const keywords = Array.isArray(raw.keywords)
    ? (raw.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 8)
    : [];

  return {
    factCheckStatus: status,
    factCheckScore: Math.max(0, Math.min(1, score)),
    factCheckNotes: typeof raw.fact_check_notes === "string" ? raw.fact_check_notes : "",
    category,
    translatedTitle:
      typeof raw.translated_title === "string" && raw.translated_title.trim()
        ? raw.translated_title
        : "(タイトル翻訳に失敗)",
    translatedSummary:
      typeof raw.translated_summary === "string" ? raw.translated_summary : "",
    keywords,
  };
}

export function fallbackResult(
  input: ArticleAnalysisInput,
  reason: string,
  logPrefix = "pipeline",
): ArticleAnalysisResult {
  console.error(`[${logPrefix}] analyzeArticle fallback (${reason}) for: ${input.sourceUrl}`);
  return {
    factCheckStatus: "needs_review",
    factCheckScore: 0,
    factCheckNotes: `AI分析結果の取得に失敗したため保留としました(${reason})。`,
    category: input.sourceDefaultCategory,
    translatedTitle: input.title,
    translatedSummary: "",
    keywords: [],
  };
}
