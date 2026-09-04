import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeArticle } from "@/lib/ai/pipeline";
import { runIngestion } from "@/lib/ingestion/runIngestion";

export const maxDuration = 60;

// デフォルトはVercel Hobbyのサーバーレス実行時間上限を意識して控えめに設定。
// 収集量を増やしたい場合は .env.local で上書きしてください。
const MAX_SOURCES_PER_RUN = Number(process.env.MAX_SOURCES_PER_RUN ?? 15);
const MAX_ARTICLES_PER_RUN = Number(process.env.MAX_ARTICLES_PER_RUN ?? 10);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const result = await runIngestion(supabase, analyzeArticle, {
      maxSourcesPerRun: MAX_SOURCES_PER_RUN,
      maxArticlesPerRun: MAX_ARTICLES_PER_RUN,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
