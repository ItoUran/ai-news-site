import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * service_role キーを使う管理用クライアント。RLSを完全にバイパスするため、
 * 収集パイプライン(cronルート)など、信頼できるサーバーサイド処理からのみ使用すること。
 * クライアントコンポーネントやAPIレスポンスに絶対に露出させないこと。
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
