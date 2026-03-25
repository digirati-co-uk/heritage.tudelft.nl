export const BUILD_STEP_ORDER = [
  "warm-remote",
  "parse-stores",
  "load-stores",
  "link-resources",
  "extract-resources",
  "enrich-resources",
  "emit-files",
  "build-indices",
  "save-files",
] as const;

export type BuildStepId = (typeof BUILD_STEP_ORDER)[number];
export type BuildProgressPhase = "idle" | BuildStepId;

export type BuildFetchProgressEvent = {
  type: "queued" | "started" | "completed" | "failed" | "cache-hit";
  url: string;
  storeId: string;
  phase?: BuildStepId;
};

export type BuildProgressCallbacks = {
  onPhase?: (details: { id: BuildStepId; label: string; index: number; total: number }) => void;
  onResourcesDiscovered?: (details: { total: number; storeId?: string }) => void;
  onResourceProcessed?: (details: { slug: string; storeId?: string }) => void;
  onFetch?: (event: BuildFetchProgressEvent) => void;
  onMessage?: (message: string) => void;
};

export type BuildProgressSnapshot = {
  phase: BuildProgressPhase;
  message: string;
  step: {
    id: BuildProgressPhase;
    index: number;
    total: number;
  };
  resources: {
    total: number;
    processed: number;
    currentSlug: string | null;
  };
  fetch: {
    queued: number;
    started: number;
    completed: number;
    failed: number;
    cacheHits: number;
    inFlight: number;
    currentUrl: string | null;
  };
  updatedAt: string;
};

export type BuildStatus = {
  status: "idle" | "building" | "ready" | "error";
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  buildCount: number;
  progress: BuildProgressSnapshot;
};

export function createEmptyBuildProgress(message = "Waiting for build…"): BuildProgressSnapshot {
  return {
    phase: "idle",
    message,
    step: {
      id: "idle",
      index: 0,
      total: BUILD_STEP_ORDER.length,
    },
    resources: {
      total: 0,
      processed: 0,
      currentSlug: null,
    },
    fetch: {
      queued: 0,
      started: 0,
      completed: 0,
      failed: 0,
      cacheHits: 0,
      inFlight: 0,
      currentUrl: null,
    },
    updatedAt: new Date().toISOString(),
  };
}
