import { useEffect, useMemo, useState } from "react";
import type { SiteResponse } from "./types";

type BuildStatusPayload = {
  build: SiteResponse["build"];
};

function shorten(value: string, max = 72) {
  if (!value || value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function formatStatus(build: SiteResponse["build"] | null) {
  if (!build) {
    return {
      tone: "bg-slate-50 border-slate-200 text-slate-700",
      text: "Loading build status...",
    };
  }

  if (build.status === "error") {
    return {
      tone: "bg-red-50 border-red-200 text-red-800",
      text: `Build failed: ${shorten(build.lastError || "Unknown error", 120)}`,
    };
  }

  if (build.status === "building") {
    const resourcesTotal = build.progress?.resources.total || 0;
    const resourcesProcessed = build.progress?.resources.processed || 0;
    const fetchQueued = build.progress?.fetch.queued || 0;
    const fetchDone =
      (build.progress?.fetch.completed || 0) +
      (build.progress?.fetch.failed || 0);
    const fetchInFlight = build.progress?.fetch.inFlight || 0;
    const details = [
      `step ${build.progress?.step.index || 0}/${build.progress?.step.total || 0}`,
      resourcesTotal > 0
        ? `resources ${resourcesProcessed}/${resourcesTotal}`
        : null,
      fetchQueued > 0 || fetchInFlight > 0
        ? `fetch ${fetchDone}/${fetchQueued} (+${fetchInFlight})`
        : null,
    ].filter(Boolean);
    return {
      tone: "bg-blue-50 border-blue-200 text-blue-900",
      text: `Rebuilding: ${build.progress?.message || "Processing"}${details.length ? ` - ${details.join(" | ")}` : ""}`,
    };
  }

  if (build.status === "ready") {
    return {
      tone: "bg-emerald-50 border-emerald-200 text-emerald-800",
      text: `Build ready (${build.buildCount} total builds)`,
    };
  }

  return {
    tone: "bg-slate-50 border-slate-200 text-slate-700",
    text:
      (build.buildCount || 0) === 0
        ? "Waiting for initial build..."
        : `Idle (${build.buildCount} total builds)`,
  };
}

export function BuildStatusLine({ debugBase }: { debugBase: string }) {
  const [build, setBuild] = useState<SiteResponse["build"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${debugBase}/api/status`)
      .then((response) => response.json())
      .then((json: BuildStatusPayload) => {
        if (cancelled) {
          return;
        }
        setBuild(json.build || null);
        setError(null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setError(String(nextError));
      });

    return () => {
      cancelled = true;
    };
  }, [debugBase]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    const events = new EventSource(`${debugBase}/api/build-events`);
    const handleBuild = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const nextBuild = JSON.parse(message.data) as SiteResponse["build"];
        setBuild(nextBuild);
        setError(null);
      } catch {
        // Ignore malformed event payloads.
      }
    };

    events.addEventListener("build", handleBuild);
    return () => {
      events.removeEventListener("build", handleBuild);
      events.close();
    };
  }, [debugBase]);

  const status = useMemo(() => formatStatus(build), [build]);

  if (error) {
    return (
      <section className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        Build status unavailable: {shorten(error, 120)}
      </section>
    );
  }

  return (
    <section
      className={`mb-4 rounded-lg border px-3 py-2 text-sm ${status.tone}`}
    >
      {status.text}
    </section>
  );
}
