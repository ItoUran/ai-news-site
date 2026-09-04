import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserArticleInteractionRow } from "@/types/database";

type InteractionAction = "like" | "unlike" | "dislike" | "undislike" | "view";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const body = (await request.json()) as { articleId?: string; action?: InteractionAction };
  const { articleId, action } = body;

  if (!articleId || !action) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_article_interactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("article_id", articleId)
    .maybeSingle();

  const now = new Date().toISOString();
  const patch: Partial<UserArticleInteractionRow> = { user_id: user.id, article_id: articleId };

  switch (action) {
    case "like":
      patch.liked = true;
      patch.disliked = false;
      break;
    case "unlike":
      patch.liked = false;
      break;
    case "dislike":
      patch.disliked = true;
      patch.liked = false;
      break;
    case "undislike":
      patch.disliked = false;
      break;
    case "view":
      patch.view_count = (existing?.view_count ?? 0) + 1;
      patch.first_viewed_at = existing?.first_viewed_at ?? now;
      patch.last_viewed_at = now;
      break;
    default:
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_article_interactions")
    .upsert(patch, { onConflict: "user_id,article_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interaction: data });
}
