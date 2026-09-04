/**
 * AIニュースラジオの生成スクリプト。
 * 直近収集されたニュース記事をもとに、ローカルLLM(Ollama)で台本を作り、
 * ローカルのVOICEVOXで音声合成し、Supabase Storageにアップロードして
 * radio_episodes テーブルに登録する。
 *
 * サイト本体(閲覧)はVercelにホスティングしたままでよい。ニュース収集(GitHub Actions,
 * 1日3回)と同様、この処理はローカルPC上でOllama・VOICEVOXが起動している時にだけ実行できる。
 *
 * 事前準備:
 *   1. Ollamaを起動し、モデルを取得済みであること(README参照)
 *   2. VOICEVOXをインストールし、エンジンを起動しておく(通常 http://127.0.0.1:50021)
 *   3. .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定
 *
 * 実行: npm run radio:generate
 * (Windowsタスクスケジューラで1日3回・6時/12時/18時の定期実行を推奨。README参照)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database, ArticleRow } from "../src/types/database";
import { generateRadioScript } from "../src/lib/radio/generateScript";
import { synthesizeScript, isVoicevoxRunning } from "../src/lib/tts/voicevox";

// 1日3回(6時/12時/18時)更新になったため、既定の対象期間も前回更新分からの
// 差分に近い8時間に短縮(24時間のままだと3回とも似た内容になってしまうため)。
const HOURS_LOOKBACK = Number(process.env.RADIO_HOURS_LOOKBACK ?? 8);
const MAX_ARTICLES = Number(process.env.RADIO_MAX_ARTICLES ?? 15);

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
    process.exit(1);
  }

  if (!(await isVoicevoxRunning())) {
    console.error(
      "VOICEVOXエンジンに接続できません。VOICEVOXを起動してから再実行してください" +
        `(確認先: ${process.env.VOICEVOX_HOST || "http://127.0.0.1:50021"})`,
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const since = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000).toISOString();
  const { data: articles, error: fetchError } = await supabase
    .from("articles")
    .select("*")
    .eq("fact_check_status", "pass")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(MAX_ARTICLES);

  if (fetchError) {
    console.error("記事の取得に失敗しました:", fetchError);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log(
      `直近${HOURS_LOOKBACK}時間以内の合格記事が見つかりませんでした。ラジオ生成をスキップします。`,
    );
    return;
  }

  const now = new Date();

  console.log(`台本を生成中...(対象記事: ${articles.length}件)`);
  const { title, script } = await generateRadioScript(articles as ArticleRow[], now);
  console.log(`台本生成完了: 「${title}」(${script.length}字)`);

  console.log("音声合成中...(数分かかる場合があります)");
  const audioBuffer = await synthesizeScript(script);
  console.log(`音声合成完了(${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

  const fileName = `${now.toISOString().slice(0, 10)}-${now.getTime()}.wav`;
  const { error: uploadError } = await supabase.storage
    .from("radio-audio")
    .upload(fileName, audioBuffer, { contentType: "audio/wav", upsert: false });

  if (uploadError) {
    console.error("音声ファイルのアップロードに失敗しました:", uploadError);
    process.exit(1);
  }

  const { data: publicUrlData } = supabase.storage.from("radio-audio").getPublicUrl(fileName);

  const { error: insertError } = await supabase.from("radio_episodes").insert({
    title,
    script,
    audio_url: publicUrlData.publicUrl,
    article_ids: articles.map((a) => a.id),
    published_at: now.toISOString(),
  });

  if (insertError) {
    console.error("エピソードの登録に失敗しました:", insertError);
    process.exit(1);
  }

  console.log(`完了: 「${title}」を公開しました。`);
  console.log(`音声URL: ${publicUrlData.publicUrl}`);
}

main();
