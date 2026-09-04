import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

/** ログインユーザーの `profiles` の一部フィールド(天気エリア・テーマ)を更新する */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    preferred_area_code?: string;
    theme_preference?: "light" | "dark" | "system";
    display_name?: string;
  };

  const patch: Partial<ProfileRow> = {};
  if (body.preferred_area_code) patch.preferred_area_code = body.preferred_area_code;
  if (body.theme_preference) patch.theme_preference = body.theme_preference;
  if (body.display_name) patch.display_name = body.display_name;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
