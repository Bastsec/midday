import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseAnonKey,
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "../config";
import type { Database } from "../types";
import { createUnavailableSupabaseClient } from "./unavailable";

const conWarn = console.warn;
const conLog = console.log;

const IGNORE_WARNINGS = [
  "Using the user object as returned from supabase.auth.getSession()",
];

console.warn = (...args) => {
  const match = args.find((arg) =>
    typeof arg === "string"
      ? IGNORE_WARNINGS.find((warning) => arg.includes(warning))
      : false,
  );
  if (!match) {
    conWarn(...args);
  }
};

console.log = (...args) => {
  const match = args.find((arg) =>
    typeof arg === "string"
      ? IGNORE_WARNINGS.find((warning) => arg.includes(warning))
      : false,
  );
  if (!match) {
    conLog(...args);
  }
};

type CreateClientOptions = {
  admin?: boolean;
  schema?: "public" | "storage";
};

export async function createClient(options?: CreateClientOptions) {
  const { admin = false, ...rest } = options ?? {};
  const cookieStore = await cookies();

  if (!isSupabaseConfigured({ admin })) {
    return createUnavailableSupabaseClient();
  }

  const key = admin ? getSupabaseServiceKey()! : getSupabaseAnonKey()!;

  const auth = admin
    ? {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    : {};

  return createServerClient<Database>(getSupabaseUrl()!, key, {
    ...rest,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    auth,
  });
}
