"use server";

import {
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@midday/supabase/config";
import { createServerClient } from "@supabase/ssr";

export async function fetchStats() {
  if (!isSupabaseConfigured({ admin: true })) {
    return {
      users: 0,
      transactions: 0,
      bankAccounts: 0,
      trackerEntries: 0,
      inboxItems: 0,
      bankConnections: 0,
      trackerProjects: 0,
      reports: 0,
      vaultObjects: 0,
      transactionEnrichments: 0,
      invoices: 0,
      invoiceCustomers: 0,
    };
  }

  const supabaseUrl = getSupabaseUrl()!;
  const serviceKey = getSupabaseServiceKey()!;

  const supabase = createServerClient<any>(supabaseUrl, serviceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        return;
      },
    },
  });

  const supabaseStorage = createServerClient<any>(supabaseUrl, serviceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        return;
      },
    },
    db: { schema: "storage" },
  } as any);

  const [
    { count: users },
    { count: transactions },
    { count: bankAccounts },
    { count: trackerEntries },
    { count: inboxItems },
    { count: bankConnections },
    { count: trackerProjects },
    { count: reports },
    { count: vaultObjects },
    { count: transactionEnrichments },
    { count: invoices },
    { count: invoiceCustomers },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("bank_accounts")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("tracker_entries")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("inbox")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("bank_connections")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("tracker_projects")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabaseStorage
      .from("objects")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("transaction_enrichments")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .limit(1),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .limit(1),
  ]);

  return {
    users,
    transactions,
    bankAccounts,
    trackerEntries,
    inboxItems,
    bankConnections,
    trackerProjects,
    reports,
    vaultObjects,
    transactionEnrichments,
    invoices,
    invoiceCustomers,
  };
}
