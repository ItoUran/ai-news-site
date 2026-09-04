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
  // CRON_SECRET が未設定の場合も含め、必ず一致した場合のみ許可する(フェイルクローズ)。
  // 以前は「未設定なら未認証扱いにしない(=誰でも叩ける)」実装になっており、
  // 万一環境変数の設定漏れがあった場合にAI呼び出し(課金・レート制限枠消費)を伴う
  // このエンドポイントが無認証で全世界に公開されてしまう問題があったため修正。
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
