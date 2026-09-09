import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RadioEpisodeRow } from "@/types/database";

/** ラジオエピソード一覧を新しい順に取得 */
export async function getRadioEpisodes(limit = 30): Promise<RadioEpisodeRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("radio_episodes")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[radio] getRadioEpisodes failed:", error);
    return [];
  }
  return data ?? [];
}
