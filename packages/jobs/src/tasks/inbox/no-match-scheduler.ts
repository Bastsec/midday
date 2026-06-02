import { getDb } from "@jobs/init";
import { inbox } from "@midday/db/schema";
import { logger, schedules } from "@trigger.dev/sdk";
import { subDays } from "date-fns";
import { and, eq, lt, sql } from "drizzle-orm";

type DbPreflightRow = {
  currentDatabase: string;
  searchPath: string;
  inboxTable: string | null;
  hasNoMatchStatus: boolean;
};

const nonRetryableSchemaErrorCodes = new Set([
  "22P02", // invalid_text_representation, e.g. enum value missing
  "42P01", // undefined_table
  "42703", // undefined_column
]);

const getRows = <TRow>(result: unknown): TRow[] => {
  if (Array.isArray(result)) {
    return result as TRow[];
  }

  return (result as { rows?: TRow[] }).rows ?? [];
};

const getDatabaseErrorCode = (error: unknown): string | undefined => {
  let current = error;

  while (current && typeof current === "object") {
    const code = (current as { code?: unknown }).code;

    if (typeof code === "string") {
      return code;
    }

    current = (current as { cause?: unknown }).cause;
  }
};

/**
 * Scheduled task that runs daily to update inbox items to "no_match" status
 * after they have been pending for 90 days without finding a matching transaction.
 *
 * This provides closure to users and keeps the system clean by marking items
 * that are unlikely to ever find matches due to the age of the data.
 */
export const noMatchScheduler = schedules.task({
  id: "no-match-scheduler",
  // Run daily at 2 AM UTC to avoid peak hours
  cron: "0 2 * * *",
  maxDuration: 300, // 5 minutes should be enough
  run: async () => {
    // Only run in production (Set in Trigger.dev)
    if (process.env.TRIGGER_ENVIRONMENT !== "production") return;

    const db = getDb();

    try {
      const [preflight] = getRows<DbPreflightRow>(
        await db.execute(sql`
          SELECT
            current_database() AS "currentDatabase",
            current_setting('search_path') AS "searchPath",
            to_regclass('public.inbox')::text AS "inboxTable",
            EXISTS (
              SELECT 1
              FROM pg_type t
              JOIN pg_enum e ON e.enumtypid = t.oid
              JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE n.nspname = 'public'
                AND t.typname = 'inbox_status'
                AND e.enumlabel = 'no_match'
            ) AS "hasNoMatchStatus"
        `),
      );

      if (!preflight?.inboxTable || !preflight.hasNoMatchStatus) {
        logger.error("No-match scheduler database preflight failed", {
          currentDatabase: preflight?.currentDatabase,
          searchPath: preflight?.searchPath,
          inboxTable: preflight?.inboxTable,
          hasNoMatchStatus: preflight?.hasNoMatchStatus,
          expectedTable: "public.inbox",
          expectedEnumValue: "public.inbox_status.no_match",
        });

        return;
      }

      // Calculate the date 90 days ago using date-fns
      const ninetyDaysAgo = subDays(new Date(), 90);

      logger.info("Starting no-match scheduler", {
        cutoffDate: ninetyDaysAgo.toISOString(),
      });

      // Find inbox items that are:
      // 1. In "pending" status (waiting for matches)
      // 2. Created more than 90 days ago
      // 3. Not already matched to a transaction
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL search_path = public, extensions`);

        return tx
          .update(inbox)
          .set({
            status: "no_match",
          })
          .where(
            and(
              eq(inbox.status, "pending"),
              lt(inbox.createdAt, ninetyDaysAgo.toISOString()),
              // Make sure they're not already matched
              sql`${inbox.transactionId} IS NULL`,
            ),
          )
          .returning({
            id: inbox.id,
            teamId: inbox.teamId,
            displayName: inbox.displayName,
            createdAt: inbox.createdAt,
          });
      });

      logger.info("No-match scheduler completed", {
        updatedCount: result.length,
        cutoffDate: ninetyDaysAgo.toISOString(),
        sampleUpdatedItems: result.slice(0, 5).map((item) => ({
          id: item.id,
          teamId: item.teamId,
          displayName: item.displayName,
          createdAt: item.createdAt,
        })),
      });

      // Log some statistics for monitoring
      if (result.length > 0) {
        const teamCounts = result.reduce(
          (acc, item) => {
            if (item.teamId) {
              acc[item.teamId] = (acc[item.teamId] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        );

        logger.info("No-match scheduler team breakdown", {
          teamCounts,
          totalTeams: Object.keys(teamCounts).length,
        });
      }
    } catch (error) {
      const code = getDatabaseErrorCode(error);

      if (code && nonRetryableSchemaErrorCodes.has(code)) {
        logger.error(
          "Skipping no-match scheduler because schema is not ready",
          {
            code,
            error: error instanceof Error ? error.message : "Unknown error",
            expectedTable: "public.inbox",
            expectedEnumValue: "public.inbox_status.no_match",
          },
        );

        return;
      }

      logger.error("Failed to run no-match scheduler", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  },
});
