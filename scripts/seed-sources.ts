/**
 * seedSources (src/config/sources.ts) を Supabase の `sources` テーブルへ upsert する。
 * 実行: npx tsx scripts/seed-sources.ts
 * (要 .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { seedSources } from "../src/config/sources";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  for (const s of seedSources) {
    const { error } = await supabase.from("sources").upsert(
      {
        name: s.name,
        feed_url: s.feedUrl,
        homepage_url: s.homepageUrl,
        language: s.language,
        default_category: s.defaultCategory,
        trust_weight: s.trustWeight ?? 1.0,
        is_active: true,
      },
      { onConflict: "feed_url" },
    );

    if (error) {
      console.error(`✗ ${s.name}: ${error.message}`);
    } else {
      console.log(`✓ ${s.name}`);
    }
  }

  console.log(`完了: ${seedSources.length}件のソースをupsertしました。`);
}

main();
