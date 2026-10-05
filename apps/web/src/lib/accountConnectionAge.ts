export function connectionAge(connectedAt: number | undefined, now = Date.now()): string {
  if (connectedAt === undefined || !Number.isFinite(connectedAt)) return "Connected";
  const hours = Math.max(0, Math.floor((now - connectedAt) / 3_600_000));
  if (hours < 24) return `Connected ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `Connected ${days} ${days === 1 ? "day" : "days"} ago`;
}
