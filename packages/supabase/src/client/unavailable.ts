import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/db";

const createSupabaseUnavailableError = (operation: string) =>
  new Error(
    `Supabase is not configured; cannot ${operation}. Configure Supabase env vars or route this code path through the OSS Postgres/MinIO adapter.`,
  );

const fail = (operation: string): never => {
  throw createSupabaseUnavailableError(operation);
};

const failAsync = async (operation: string): Promise<never> => {
  throw createSupabaseUnavailableError(operation);
};

export const createUnavailableSupabaseClient = () => {
  const channel = {
    on() {
      return channel;
    },
    subscribe() {
      return channel;
    },
    unsubscribe: async () => "ok",
  };

  return {
    auth: {
      admin: {
        deleteUser: () => failAsync("delete a user"),
      },
      exchangeCodeForSession: () => failAsync("exchange an auth code"),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      mfa: {
        challenge: () => failAsync("challenge an MFA factor"),
        enroll: () => failAsync("enroll an MFA factor"),
        getAuthenticatorAssuranceLevel: async () => ({
          data: {
            currentAuthenticationMethods: [],
            currentLevel: "aal1",
            nextLevel: "aal1",
          },
          error: null,
        }),
        listFactors: async () => ({
          data: { all: [], phone: [], totp: [] },
          error: null,
        }),
        unenroll: () => failAsync("unenroll an MFA factor"),
        verify: () => failAsync("verify an MFA challenge"),
      },
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signInWithOAuth: () => failAsync("start OAuth sign in"),
      signInWithOtp: () => failAsync("start OTP sign in"),
      signOut: async () => ({ error: null }),
      verifyOtp: () => failAsync("verify OTP"),
    },
    channel: () => channel,
    from: () => fail("query Supabase PostgREST"),
    removeChannel: async () => "ok",
    rpc: () => fail("call a Supabase RPC"),
    storage: {
      from: () => fail("access Supabase Storage"),
    },
  } as unknown as SupabaseClient<Database>;
};
