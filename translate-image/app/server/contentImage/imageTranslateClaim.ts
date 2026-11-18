export function isClaimEligible(args: {
  status: string;
  heartbeatAt: string | Date | null | undefined;
  now: number;
  staleMs: number;
}): boolean {
  const { status, heartbeatAt, now, staleMs } = args;
  if (status === "QUEUED") return true;
  if (status !== "RUNNING") return false;
  if (heartbeatAt == null || heartbeatAt === "") return true;
  const raw = heartbeatAt instanceof Date ? heartbeatAt.toISOString() : String(heartbeatAt);
  const hb = Date.parse(raw);
  if (!Number.isFinite(hb)) return true;
  return hb < now - staleMs;
}
