import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "../config";
import type { Database } from "../types";
import { createUnavailableSupabaseClient } from "./unavailable";

export const createClient = () => {
  if (!isSupabaseConfigured()) {
    return createUnavailableSupabaseClient();
  }

  return createBrowserClient<Database>(
    getSupabaseUrl()!,
    getSupabaseAnonKey()!,
  );
};
