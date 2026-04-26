import {
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@midday/supabase/config";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";

const currency = "USD";

export async function Ticker() {
  let totalSum = 0;
  let businessCount = 0;
  let transactionCount = 0;

  if (isSupabaseConfigured({ admin: true })) {
    const client = createServerClient<any>(
      getSupabaseUrl()!,
      getSupabaseServiceKey()!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            return;
          },
        },
      },
    );

    const [totalSumResult, businessCountResult, transactionCountResult] =
      await Promise.all([
        client.rpc("calculate_total_sum", {
          target_currency: currency,
        }),
        client
          .from("teams")
          .select("id", { count: "exact", head: true })
          .limit(1),
        client
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .limit(1),
      ]);

    totalSum = totalSumResult.data ?? 0;
    businessCount = businessCountResult.count ?? 0;
    transactionCount = transactionCountResult.count ?? 0;
  }

  return (
    <div className="text-center flex flex-col mt-[120px] md:mt-[280px] mb-[120px] md:mb-[250px] space-y-4 md:space-y-10">
      <span className="font-medium text-center text-[40px] md:text-[80px] lg:text-[100px] xl:text-[130px] 2xl:text-[160px] md:mb-2 text-stroke leading-none">
        {Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
          maximumFractionDigits: 0,
        }).format(totalSum ?? 0)}
      </span>
      <span className="text-[#878787]">
        Through our system{" "}
        <Link href="/open-startup" className="underline">
          {Intl.NumberFormat("en-US", {
            maximumFractionDigits: 0,
          }).format(transactionCount ?? 0)}
        </Link>{" "}
        transactions across{" "}
        <Link href="/open-startup" className="underline">
          {Intl.NumberFormat("en-US", {
            maximumFractionDigits: 0,
          }).format(businessCount ?? 0)}
        </Link>{" "}
        businesses.
      </span>
    </div>
  );
}
