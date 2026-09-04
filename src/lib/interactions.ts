import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UserArticleInteractionRow } from "@/types/database";

/** ログイン中ユーザーの直近のインタラクション(最大500件)を取得する */
export async function getMyInteractions(userId: string): Promise<UserArticleInteractionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_article_interactions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[interactions] getMyInteractions failed:", error);
    return [];
  }
  return data ?? [];
}
