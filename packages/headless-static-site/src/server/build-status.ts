import {
  BUILD_STEP_ORDER,
  type BuildProgressCallbacks,
  type BuildStatus,
  createEmptyBuildProgress,
} from "../util/build-progress.ts";

function cloneBuildStatus(value: BuildStatus): BuildStatus {
  return {
    ...value,
    progress: {
      ...value.progress,
      step: { ...value.progress.step },
      resources: { ...value.progress.resources },
      fetch: { ...value.progress.fetch },
    },
  };
}

export function createBuildStatusTracker(onUpdate?: (status: BuildStatus) => void) {
  const buildStatus: BuildStatus = {
    status: "idle",
    startedAt: null,
    completedAt: null,
    lastError: null,
    buildCount: 0,
    progress: createEmptyBuildProgress(),
  };
  let processedResources = 0;

  const publish = () => {
    if (!onUpdate) {
      return;
    }
    onUpdate(cloneBuildStatus(buildStatus));
  };

  const callbacks: BuildProgressCallbacks = {
    onPhase(details) {
      buildStatus.progress.phase = details.id;
      buildStatus.progress.message = details.label;
      buildStatus.progress.step.id = details.id;
      buildStatus.progress.step.index = details.index;
      buildStatus.progress.step.total = details.total;
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
    onResourcesDiscovered({ total }) {
      buildStatus.progress.resources.total = Math.max(buildStatus.progress.resources.total, Math.max(0, total));
      buildStatus.progress.resources.processed = Math.min(buildStatus.progress.resources.total, processedResources);
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
    onResourceProcessed({ slug }) {
      processedResources += 1;
      const maxTotal = buildStatus.progress.resources.total;
      buildStatus.progress.resources.processed = maxTotal ? Math.min(maxTotal, processedResources) : processedResources;
      buildStatus.progress.resources.currentSlug = slug || null;
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
    onFetch(event) {
      const fetchState = buildStatus.progress.fetch;
      if (event.type === "queued") {
        fetchState.queued += 1;
      } else if (event.type === "started") {
        fetchState.started += 1;
        fetchState.inFlight += 1;
      } else if (event.type === "completed") {
        fetchState.completed += 1;
        fetchState.inFlight = Math.max(0, fetchState.inFlight - 1);
      } else if (event.type === "failed") {
        fetchState.failed += 1;
        fetchState.inFlight = Math.max(0, fetchState.inFlight - 1);
      } else if (event.type === "cache-hit") {
        fetchState.cacheHits += 1;
      }
      fetchState.currentUrl = event.url || null;
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
    onMessage(message) {
      buildStatus.progress.message = message;
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
  };

  return {
    startBuild() {
      buildStatus.status = "building";
      buildStatus.startedAt = new Date().toISOString();
      buildStatus.completedAt = null;
      buildStatus.lastError = null;
      buildStatus.buildCount += 1;
      buildStatus.progress = createEmptyBuildProgress("Preparing build…");
      buildStatus.progress.step.total = BUILD_STEP_ORDER.length;
      processedResources = 0;
      publish();
    },
    completeBuild() {
      buildStatus.status = "ready";
      buildStatus.completedAt = new Date().toISOString();
      buildStatus.progress.phase = "idle";
      buildStatus.progress.message = "Build complete";
      buildStatus.progress.step.id = "idle";
      buildStatus.progress.step.index = buildStatus.progress.step.total;
      buildStatus.progress.resources.currentSlug = null;
      buildStatus.progress.fetch.currentUrl = null;
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
    failBuild(error: unknown) {
      buildStatus.status = "error";
      buildStatus.completedAt = new Date().toISOString();
      buildStatus.lastError = (error as Error)?.message || String(error);
      buildStatus.progress.phase = "idle";
      buildStatus.progress.message = "Build failed";
      buildStatus.progress.step.id = "idle";
      buildStatus.progress.resources.currentSlug = null;
      buildStatus.progress.fetch.currentUrl = null;
      buildStatus.progress.updatedAt = new Date().toISOString();
      publish();
    },
    getBuildStatus() {
      return cloneBuildStatus(buildStatus);
    },
    callbacks,
  };
}
