export interface NetworkConfig {
  prefetch?: boolean;
  concurrency?: number;
  minDelayMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  retryStatuses?: number[];
  respectRetryAfter?: boolean;
}

export interface ResolvedNetworkConfig {
  prefetch: boolean;
  concurrency: number;
  minDelayMs: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  retryStatuses: number[];
  respectRetryAfter: boolean;
}

const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504];

function toInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function toRatio(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

export function resolveNetworkConfig(...inputs: Array<Partial<NetworkConfig> | undefined>): ResolvedNetworkConfig {
  const merged = Object.assign({}, ...inputs.filter(Boolean));
  const retryStatuses = Array.isArray(merged.retryStatuses)
    ? merged.retryStatuses
        .map((status: any) => (typeof status === "number" ? Math.floor(status) : Number.NaN))
        .filter((status: any) => Number.isInteger(status) && status >= 100 && status <= 599)
    : [];

  return {
    prefetch: merged.prefetch !== false,
    concurrency: Math.max(1, toInteger(merged.concurrency, 2)),
    minDelayMs: toInteger(merged.minDelayMs, 100),
    maxRetries: toInteger(merged.maxRetries, 4),
    baseDelayMs: toInteger(merged.baseDelayMs, 500),
    maxDelayMs: Math.max(toInteger(merged.baseDelayMs, 500), toInteger(merged.maxDelayMs, 15_000)),
    jitterRatio: toRatio(merged.jitterRatio, 0.2),
    retryStatuses: retryStatuses.length ? retryStatuses : DEFAULT_RETRY_STATUSES,
    respectRetryAfter: merged.respectRetryAfter !== false,
  };
}
