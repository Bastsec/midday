import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "../config";
import type { Database } from "../types/db";
import { createUnavailableSupabaseClient } from "./unavailable";

export const createClient = () => {
  if (!isSupabaseConfigured({ admin: true })) {
    return createUnavailableSupabaseClient();
  }

  return createSupabaseClient<Database>(
    getSupabaseUrl()!,
    getSupabaseServiceKey()!,
  );
};
