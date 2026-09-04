/**
 * ローカルLLM(Ollama)を使ったニュース収集スクリプト。
 * Vercel(クラウド)からはローカルPC上のOllamaを呼び出せないため、
 * このスクリプトは手動実行 or Windowsタスクスケジューラ等でPC上から直接実行する想定。
 * サイト本体(閲覧・ログイン等)はこれまで通りVercelにホスティングしたままでよい
 * (Supabaseに直接書き込むため、書き込み先は共通)。
 *
 * 合格した記事については、記事詳細ページの「詳しく」ボタン用の深掘り解説も
 * この場でOllamaを使って事前生成し、DBにキャッシュしておく(無料)。これにより、
 * 本番サイトでユーザーがボタンを押した際は基本的にこのキャッシュがそのまま
 * 表示され、Gemini呼び出し(フォールバック)は発生しない。
 *
 * 事前準備:
 *   1. Ollamaをインストールし起動しておく(`ollama serve` または常駐アプリ)
 *   2. `ollama pull qwen3:8b` 等でモデルを取得
 *   3. .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定
 *
 * 実行: npm run ingest:local
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { analyzeArticle, generateDeepDiveOllama } from "../src/lib/ai/pipeline-ollama";
import { runIngestion } from "../src/lib/ingestion/runIngestion";
import type { Database } from "../src/types/database";

const MAX_SOURCES_PER_RUN = Number(process.env.MAX_SOURCES_PER_RUN ?? 15);
const MAX_ARTICLES_PER_RUN = Number(process.env.MAX_ARTICLES_PER_RUN ?? 10);

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
    process.exit(1);
  }

  console.log(
    `ローカルLLM(Ollama, ${process.env.OLLAMA_MODEL || "qwen3:8b"})で収集を開始します...`,
  );

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const result = await runIngestion(supabase, analyzeArticle, {
      maxSourcesPerRun: MAX_SOURCES_PER_RUN,
      maxArticlesPerRun: MAX_ARTICLES_PER_RUN,
      // 合格した記事について、「詳しく」ボタン用の深掘り解説をこの場でOllamaで
      // 事前生成しておく(無料・レート制限無し)。生成済みならAPI呼び出し時に
      // 即表示され、本番Vercel環境でのGeminiフォールバックが発生しなくなる。
      onArticleInserted: async (article) => {
        const text = await generateDeepDiveOllama({
          title: article.title,
          translatedSummary: article.translatedSummary,
          originalBody: article.originalBody,
          category: article.category,
        });
        if (!text) throw new Error("Ollamaからの生成結果が空でした");

        const { error } = await supabase
          .from("articles")
          .update({
            detailed_explanation: text,
            detailed_explanation_generated_at: new Date().toISOString(),
          })
          .eq("id", article.id);
        if (error) throw error;
      },
    });

    console.log("完了:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("収集処理でエラーが発生しました:", err);
    process.exit(1);
  }
}

main();
