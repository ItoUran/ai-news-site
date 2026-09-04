// scripts/ingest-local.ts (tsx実行、Next.jsビルドを介さない)からも使うため
// "server-only" は付けない(shared.ts参照)。
import { getOllamaClient, OLLAMA_MODEL } from "./ollama";
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
   あなたはインターネット検索ができないため、本文内の論理的整合性・具体性・不自然な誇張や矛盾の有無だけで判断してください。
   - 明白な誤情報・陰謀論・矛盾・扇動的な誇張表現がある場合は fail としてください。
   - 単なる意見・論評・一次情報が乏しい場合で、内容に矛盾がなく常識的に見て問題がなければ pass としてよい(オピニオン記事であること自体は不合格理由にしない)。
   - 内容が具体的すぎる/曖昧すぎる、極端な主張がある等、判断に自信が持てない場合は needs_review としてください。
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
 * ローカルLLM(Ollama)版パイプライン。無料・レート制限無しで動作するが、
 * web検索によるファクトチェックはできないため本文の内部整合性のみで判定する
 * (pipeline.ts の ENABLE_WEB_SEARCH_FACTCHECK=false 相当の精度)。
 * scripts/ingest-local.ts から呼び出す想定(Vercel上では動かせない)。
 */
export async function analyzeArticle(
  input: ArticleAnalysisInput,
): Promise<ArticleAnalysisResult> {
  const client = getOllamaClient();

  let content: string | undefined;
  try {
    const response = await client.chat({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: buildPrompt(input) }],
      format: analysisJsonSchema,
      think: false, // 推論(thinking)は不要なタスクのため無効化し高速化
      stream: false,
    });
    content = response.message.content;
  } catch (err) {
    return fallbackResult(input, `Ollama呼び出しエラー: ${String(err)}`, "pipeline/ollama");
  }

  if (!content) {
    return fallbackResult(input, "空のレスポンス", "pipeline/ollama");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return fallbackResult(input, "JSONパース失敗", "pipeline/ollama");
  }

  return normalizeResult(parsed);
}
