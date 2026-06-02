export const getSupabaseUrl = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

export const getSupabaseAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabaseServiceKey = () => process.env.SUPABASE_SERVICE_KEY;

export const isSupabaseConfigured = (options?: { admin?: boolean }) => {
  const url = getSupabaseUrl();
  const key = options?.admin ? getSupabaseServiceKey() : getSupabaseAnonKey();

  if (!url || !key) {
    return false;
  }

  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  if (
    cleanUrl === "" ||
    cleanKey === "" ||
    cleanUrl === "undefined" ||
    cleanKey === "undefined" ||
    cleanUrl === "null" ||
    cleanKey === "null"
  ) {
    return false;
  }

  // Supabase URL must be a valid HTTP or HTTPS URL
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    return false;
  }

  return true;
};
