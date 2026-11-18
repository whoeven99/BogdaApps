export function isClaimEligible(args) {
  const { status, heartbeatAt, now, staleMs } = args;
  if (status === "QUEUED") return true;
  if (status !== "RUNNING") return false;
  if (heartbeatAt == null || heartbeatAt === "") return true;
  const hb = Date.parse(String(heartbeatAt));
  if (!Number.isFinite(hb)) return true;
  return hb < now - staleMs;
}
