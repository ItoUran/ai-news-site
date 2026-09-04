import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6 py-6">
      <h2 className="font-heading text-2xl font-bold">設定</h2>
      <SettingsForm
        email={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        preferredAreaCode={profile?.preferred_area_code ?? "130000"}
      />
    </div>
  );
}
