import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDeepDiveOllama } from "@/lib/ai/pipeline-ollama";
import { generateDeepDiveGemini } from "@/lib/ai/pipeline";

// Ollama呼び出し(タイムアウト付き)+ 失敗時のGemini呼び出しを合わせても
// Vercel Hobbyの上限内に収まるよう余裕を持たせる。
export const maxDuration = 45;

// このエンドポイントは未ログインでも叩ける公開APIのため、記事IDを大量に叩かれたり
// 連打されたりしても無料枠を消費し尽くさないよう、Geminiフォールバックの呼び出し回数に
// 1日あたりの上限を設ける(Ollama側の試行はカウントしない=失敗しても実質無料のため)。
const DEEP_DIVE_GEMINI_DAILY_LIMIT = Number(process.env.DEEP_DIVE_GEMINI_DAILY_LIMIT ?? 50);

/**
 * 記事詳細ページの「詳しく」ボタン用。
 * - 既に生成済みならDBのキャッシュをそのまま返す(再生成しない = 追加コスト無し)。
 * - 未生成の場合、まずローカルOllamaを試す(本番Vercelからは到達できず必ず失敗するが、
 *   `npm run dev` 等 OLLAMA_HOST 到達可能な環境からのアクセスでは無料で生成される)。
 * - Ollamaが使えない場合のみ、1日あたりの上限内でGemini無料枠にフォールバック生成する。
 * - 生成結果はDBに保存し、以降は同じ記事に対して再度AI呼び出しをしない。
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select(
      "id, translated_title, translated_summary, original_body, category, fact_check_status, detailed_explanation",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !article) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // adminクライアントはRLSをバイパスするため、非公開記事(fail/needs_review/pending)の
  // 内容がこのAPI経由で漏れないよう明示的にチェックする。
  if (article.fact_check_status !== "pass") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (article.detailed_explanation) {
    return NextResponse.json({ detailedExplanation: article.detailed_explanation, cached: true });
  }

  const deepDiveInput = {
    title: article.translated_title,
    translatedSummary: article.translated_summary,
    originalBody: article.original_body,
    category: article.category,
  };

  let text = await generateDeepDiveOllama(deepDiveInput);
  let provider = "ollama";

  if (!text) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("deep_dive_gemini_calls")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());

    if ((count ?? 0) >= DEEP_DIVE_GEMINI_DAILY_LIMIT) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    // 呼び出し前に記録する(Gemini呼び出し自体が失敗してもカウントは消費する。
    // 失敗する記事への連打で無限に再試行され続けることを防ぐため)。
    await supabase.from("deep_dive_gemini_calls").insert({});

    text = await generateDeepDiveGemini(deepDiveInput);
    provider = "gemini";
  }

  if (!text) {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("articles")
    .update({
      detailed_explanation: text,
      detailed_explanation_generated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[api/deep-dive] failed to cache result:", updateError.message);
    // 保存に失敗しても、生成済みのテキスト自体はユーザーに返す(次回また生成されるだけ)
  }

  return NextResponse.json({ detailedExplanation: text, cached: false, provider });
}
