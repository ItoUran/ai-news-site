import "server-only";
import { getGeminiClient, GEMINI_MODEL } from "./gemini";
import {
  analysisJsonSchema,
  truncateBody,
  normalizeResult,
  fallbackResult,
  type ArticleAnalysisInput,
  type ArticleAnalysisResult,
} from "./shared";

export type { ArticleAnalysisInput, ArticleAnalysisResult } from "./shared";

function buildPrompt(input: ArticleAnalysisInput): string {
  // 入力トークン(≒コスト)を抑えるため本文は先頭4000字程度に切り詰める
  // (ファクトチェック・要約に必要な情報は通常記事冒頭に集約されているため)
  const truncatedBody = truncateBody(input.body);
  return `あなたはニュース編集部のファクトチェック担当兼翻訳者です。以下の記事について分析してください。

# 記事情報
- 配信元: ${input.sourceName} (${input.sourceUrl})
- 元言語: ${input.sourceLanguage}
- 想定カテゴリ(参考、再分類してよい): ${input.sourceDefaultCategory}
- 公開日時: ${input.publishedAt ?? "不明"}
- タイトル: ${input.title}

# 本文抜粋
${truncatedBody}

# 指示
1. **ファクトチェック**: 記事内容が事実として妥当か検証してください。個人ブログ等、信頼度が不明なソースの場合は特に注意深く検証すること。
   - 可能であれば google_search ツールを使って他の報道機関の報道と照合し、裏付けを取ってください。
   - 明白な誤情報・陰謀論・捏造・重大な事実誤認がある場合は fail としてください。
   - 単なる意見・論評・一次情報が乏しい場合で、内容に矛盾がなく検証可能な範囲で問題がなければ needs_review ではなく pass としてよい(オピニオン記事であること自体は不合格理由にしない)。
   - 裏付けが取れず、かつ内容に疑わしい点がある場合のみ needs_review または fail としてください。
2. **カテゴリ分類**: 以下の5分類のいずれかに分類し、どれにも当てはまらなければ other としてください。
   - domestic(国内ニュース): 日本国内の事件・事故・社会ニュース(政治は除く)
   - domestic_politics(国内政治): 日本の政治・行政・国会に関するニュース
   - international(国際ニュース): 海外の事件・事故・災害・社会ニュース(政治は除く)
   - international_politics(国際政治): 海外の政治・外交・国際関係に関するニュース
   - it(IT): テクノロジー・IT業界のニュース
3. **日本語訳と要約**: タイトルと2〜4文の要約を日本語で作成(英語記事も日本語に翻訳すること)。本文全体を訳す必要はない。
4. **キーワード抽出**: レコメンドに使う日本語のキーワードを3〜8個。

指定されたJSON形式で結果を出力してください。`;
}

/**
 * 1記事を Gemini に渡し、ファクトチェック・翻訳・要約・カテゴリ分類・キーワード抽出を
 * 1回の呼び出し(必要ならサーバー側 googleSearch ツールを併用)で行う。
 * responseJsonSchema による構造化出力を使うため、JSON確定のためのtool呼び出し強制は不要。
 *
 * 注: 新しい Interactions API (client.interactions.create) は実機検証時に無料枠で
 * 即座に429 RateLimitErrorとなったため、実績のある従来API (client.models.generateContent)
 * を使用している。
 */
export async function analyzeArticle(
  input: ArticleAnalysisInput,
): Promise<ArticleAnalysisResult> {
  const enableSearch = process.env.ENABLE_WEB_SEARCH_FACTCHECK !== "false";
  const client = getGeminiClient();

  let outputText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt(input),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: analysisJsonSchema,
        ...(enableSearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });
    outputText = response.text;
  } catch (err) {
    return fallbackResult(input, `API呼び出しエラー: ${String(err)}`, "pipeline/gemini");
  }

  if (!outputText) {
    return fallbackResult(input, "空のレスポンス", "pipeline/gemini");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(outputText) as Record<string, unknown>;
  } catch {
    return fallbackResult(input, "JSONパース失敗", "pipeline/gemini");
  }

  return normalizeResult(parsed);
}
