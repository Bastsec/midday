import {
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@midday/supabase/config";
import type { Database } from "@midday/supabase/types";
import { createUnavailableSupabaseClient } from "@midday/supabase/unavailable";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient(accessToken?: string) {
  if (!isSupabaseConfigured({ admin: true })) {
    return createUnavailableSupabaseClient();
  }

  return createSupabaseClient<Database>(
    getSupabaseUrl()!,
    getSupabaseServiceKey()!,
    {
      accessToken() {
        return Promise.resolve(accessToken || "");
      },
    },
  );
}

export async function createAdminClient() {
  if (!isSupabaseConfigured({ admin: true })) {
    return createUnavailableSupabaseClient();
  }

  return createSupabaseClient<Database>(
    getSupabaseUrl()!,
    getSupabaseServiceKey()!,
  );
}
