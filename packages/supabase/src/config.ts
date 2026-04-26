export const getSupabaseUrl = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

export const getSupabaseAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabaseServiceKey = () => process.env.SUPABASE_SERVICE_KEY;

export const isSupabaseConfigured = (options?: { admin?: boolean }) => {
  const key = options?.admin ? getSupabaseServiceKey() : getSupabaseAnonKey();

  return Boolean(getSupabaseUrl() && key);
};
