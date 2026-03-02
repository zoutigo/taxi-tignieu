import { prisma } from "@/lib/prisma";
import { recomputeFeaturedTripById } from "@/lib/featured-trip-recompute";

type RawPrisma = {
  $executeRawUnsafe?: (query: string, ...values: unknown[]) => Promise<unknown>;
  $queryRawUnsafe?: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

type JobRow = {
  id: string;
  status: "PENDING" | "RUNNING" | "DONE" | "PARTIAL" | "FAILED";
  totalItems: number;
  doneItems: number;
  failedItems: number;
  errorSummary: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type ItemRow = {
  id: string;
  jobId: string;
  tripId: string;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED" | "RETRY";
  attempts: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_TOTAL_ATTEMPTS = 3; // 1 tentative initiale + 2 retries max

const getRaw = (): RawPrisma => prisma as unknown as RawPrisma;

async function ensureQueueTables() {
  const raw = getRaw();
  if (!raw.$executeRawUnsafe) return false;

  await raw.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tariff_recompute_jobs (
      id VARCHAR(36) PRIMARY KEY,
      status VARCHAR(16) NOT NULL,
      totalItems INT NOT NULL DEFAULT 0,
      doneItems INT NOT NULL DEFAULT 0,
      failedItems INT NOT NULL DEFAULT 0,
      errorSummary TEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      startedAt DATETIME NULL,
      finishedAt DATETIME NULL
    )
  `);

  await raw.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tariff_recompute_items (
      id VARCHAR(36) PRIMARY KEY,
      jobId VARCHAR(36) NOT NULL,
      tripId VARCHAR(191) NOT NULL,
      status VARCHAR(16) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      nextAttemptAt DATETIME NULL,
      lastError TEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_job_status_next (jobId, status, nextAttemptAt),
      KEY idx_trip (tripId)
    )
  `);

  return true;
}

export async function enqueueTariffRecomputeJob(): Promise<{ jobId: string } | null> {
  const raw = getRaw();
  if (!raw.$executeRawUnsafe || !raw.$queryRawUnsafe) return null;
  const tablesReady = await ensureQueueTables();
  if (!tablesReady) return null;

  const trips = await prisma.featuredTrip.findMany({ select: { id: true } });
  const jobId = crypto.randomUUID();
  const now = new Date();
  await raw.$executeRawUnsafe(
    `INSERT INTO tariff_recompute_jobs (id, status, totalItems, doneItems, failedItems, createdAt) VALUES (?, 'PENDING', ?, 0, 0, ?)`,
    jobId,
    trips.length,
    now
  );

  for (const trip of trips) {
    await raw.$executeRawUnsafe(
      `INSERT INTO tariff_recompute_items (id, jobId, tripId, status, attempts, createdAt, updatedAt) VALUES (?, ?, ?, 'PENDING', 0, ?, ?)`,
      crypto.randomUUID(),
      jobId,
      trip.id,
      now,
      now
    );
  }

  return { jobId };
}

export async function getLatestTariffRecomputeJob(): Promise<JobRow | null> {
  const raw = getRaw();
  if (!raw.$queryRawUnsafe) return null;
  const tablesReady = await ensureQueueTables();
  if (!tablesReady) return null;
  const rows = await raw.$queryRawUnsafe<JobRow[]>(
    `SELECT id, status, totalItems, doneItems, failedItems, errorSummary, createdAt, startedAt, finishedAt
     FROM tariff_recompute_jobs
     ORDER BY createdAt DESC
     LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function getTariffRecomputeJobIssues(
  jobId: string,
  limit = 10
): Promise<
  Array<{
    itemId: string;
    tripId: string;
    pickupLabel: string | null;
    dropoffLabel: string | null;
    status: "RETRY" | "FAILED";
    attempts: number;
    nextAttemptAt: Date | null;
    lastError: string | null;
  }>
> {
  const raw = getRaw();
  if (!raw.$queryRawUnsafe) return [];
  const tablesReady = await ensureQueueTables();
  if (!tablesReady) return [];
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const rows = await raw.$queryRawUnsafe<
    Array<{
      itemId: string;
      tripId: string;
      pickupLabel: string | null;
      dropoffLabel: string | null;
      status: "RETRY" | "FAILED";
      attempts: number;
      nextAttemptAt: Date | null;
      lastError: string | null;
    }>
  >(
    `SELECT
      i.id as itemId,
      i.tripId as tripId,
      t.pickupLabel as pickupLabel,
      t.dropoffLabel as dropoffLabel,
      i.status as status,
      i.attempts as attempts,
      i.nextAttemptAt as nextAttemptAt,
      i.lastError as lastError
     FROM tariff_recompute_items i
     LEFT JOIN FeaturedTrip t ON BINARY t.id = BINARY i.tripId
     WHERE BINARY i.jobId = BINARY ?
       AND i.status IN ('RETRY','FAILED')
     ORDER BY i.updatedAt DESC
     LIMIT ?`,
    jobId,
    safeLimit
  );
  return rows;
}

export async function processTariffRecomputeBatch(limit = 5) {
  const raw = getRaw();
  if (!raw.$executeRawUnsafe || !raw.$queryRawUnsafe) {
    return { ok: false, reason: "raw_sql_unavailable" as const };
  }
  const tablesReady = await ensureQueueTables();
  if (!tablesReady) return { ok: false, reason: "queue_unavailable" as const };

  const running = await raw.$queryRawUnsafe<JobRow[]>(
    `SELECT * FROM tariff_recompute_jobs WHERE status='RUNNING' ORDER BY createdAt ASC LIMIT 1`
  );
  let job = running[0] ?? null;
  if (!job) {
    const pending = await raw.$queryRawUnsafe<JobRow[]>(
      `SELECT * FROM tariff_recompute_jobs WHERE status='PENDING' ORDER BY createdAt ASC LIMIT 1`
    );
    job = pending[0] ?? null;
    if (!job) return { ok: true, processed: 0, jobId: null };
    await raw.$executeRawUnsafe(
      `UPDATE tariff_recompute_jobs SET status='RUNNING', startedAt=COALESCE(startedAt, ?) WHERE id=?`,
      new Date(),
      job.id
    );
  }

  const items = await raw.$queryRawUnsafe<ItemRow[]>(
    `SELECT id, jobId, tripId, status, attempts
     FROM tariff_recompute_items
     WHERE jobId=?
       AND status IN ('PENDING','RETRY')
       AND (nextAttemptAt IS NULL OR nextAttemptAt <= ?)
     ORDER BY createdAt ASC
     LIMIT ?`,
    job.id,
    new Date(),
    limit
  );

  let processed = 0;
  for (const item of items) {
    processed += 1;
    const tripContext = await prisma.featuredTrip.findUnique({
      where: { id: item.tripId },
      select: { pickupLabel: true, dropoffLabel: true },
    });
    const routeLabel = `${tripContext?.pickupLabel ?? "Départ inconnu"} -> ${
      tripContext?.dropoffLabel ?? "Arrivée inconnue"
    }`;
    const nextAttempts = item.attempts + 1;
    await raw.$executeRawUnsafe(
      `UPDATE tariff_recompute_items SET status='RUNNING', attempts=?, updatedAt=? WHERE id=?`,
      nextAttempts,
      new Date(),
      item.id
    );
    try {
      await recomputeFeaturedTripById(item.tripId);
      await raw.$executeRawUnsafe(
        `UPDATE tariff_recompute_items
         SET status='DONE', nextAttemptAt=NULL, lastError=NULL, updatedAt=?
         WHERE id=?`,
        new Date(),
        item.id
      );
    } catch (error) {
      const message = `[${routeLabel}] ${String(error)}`;
      const rateLimited = /429|rate limit/i.test(message);
      if (nextAttempts < MAX_TOTAL_ATTEMPTS) {
        const baseBackoff = rateLimited ? 10 : 5;
        const backoffSeconds = Math.min(90, baseBackoff * 2 ** (nextAttempts - 1));
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
        await raw.$executeRawUnsafe(
          `UPDATE tariff_recompute_items
           SET status='RETRY', nextAttemptAt=?, lastError=?, updatedAt=?
           WHERE id=?`,
          nextAttemptAt,
          message.slice(0, 2000),
          new Date(),
          item.id
        );
      } else {
        await raw.$executeRawUnsafe(
          `UPDATE tariff_recompute_items
           SET status='FAILED', nextAttemptAt=NULL, lastError=?, updatedAt=?
           WHERE id=?`,
          message.slice(0, 2000),
          new Date(),
          item.id
        );
      }
    }
    // ~36 req/min max to stay below ORS 40/min limit on free plan.
    await sleep(1700);
  }

  const counts = await raw.$queryRawUnsafe<
    Array<{ total: number; doneCount: number; failedCount: number; pendingCount: number }>
  >(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='DONE' THEN 1 ELSE 0 END) as doneCount,
      SUM(CASE WHEN status='FAILED' THEN 1 ELSE 0 END) as failedCount,
      SUM(CASE WHEN status IN ('PENDING','RUNNING','RETRY') THEN 1 ELSE 0 END) as pendingCount
     FROM tariff_recompute_items
     WHERE jobId=?`,
    job.id
  );
  const rawCounts = counts[0] ?? { total: 0, doneCount: 0, failedCount: 0, pendingCount: 0 };
  const toInt = (v: unknown) => {
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "string") return Number.parseInt(v, 10);
    return 0;
  };
  const c = {
    total: toInt(rawCounts.total),
    doneCount: toInt(rawCounts.doneCount),
    failedCount: toInt(rawCounts.failedCount),
    pendingCount: toInt(rawCounts.pendingCount),
  };

  let status: JobRow["status"] = "RUNNING";
  let finishedAt: Date | null = null;
  if (c.pendingCount === 0) {
    finishedAt = new Date();
    if (c.failedCount === 0) status = "DONE";
    else if (c.doneCount > 0) status = "PARTIAL";
    else status = "FAILED";
  }
  await raw.$executeRawUnsafe(
    `UPDATE tariff_recompute_jobs
     SET status=?, doneItems=?, failedItems=?, finishedAt=?
     WHERE id=?`,
    status,
    c.doneCount,
    c.failedCount,
    finishedAt,
    job.id
  );

  return { ok: true, processed, jobId: job.id, status };
}
