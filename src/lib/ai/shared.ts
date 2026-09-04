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

export type DeepDiveInput = {
  title: string;
  translatedSummary: string;
  /** original_body(原文全文、無い場合は要約のみで解説する) */
  originalBody: string | null;
  category: ArticleCategory;
};

/**
 * 記事詳細ページの「詳しく」ボタン用プロンプト。Ollama/Gemini共通で使う
 * (JSON Schemaではなくプレーンテキストで返させる、要約より踏み込んだ解説)。
 */
export function buildDeepDivePrompt(input: DeepDiveInput): string {
  const body = input.originalBody ? truncateBody(input.originalBody, 6000) : null;

  return `あなたはニュース解説者です。以下のニュースについて、要約よりも踏み込んだ「詳しい解説」を
日本語で書いてください。

# タイトル
${input.title}

# 現在表示されている要約
${input.translatedSummary}

${body ? `# 原文本文\n${body}` : "(原文本文は取得できなかったため、上記の要約のみを情報源として解説してください)"}

# 執筆方針
- 500〜800字程度。読みやすい日本語の文章で、箇条書きは使わず段落で書くこと。
- 単なる要約の言い換えではなく、背景・経緯・関係者にとっての意味・今後想定される展開など、
  一歩踏み込んだ解説にすること。
- 本文に書かれていない事実を断定的に捏造しないこと。世間の反応や今後の見通しなど推測を含める
  場合は「〜と見られます」「〜という声もありそうです」のように、推測であることが分かる書き方にすること。
- 見出しや前置き(「以下解説します」等)は不要。本文のみを出力すること。`;
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
