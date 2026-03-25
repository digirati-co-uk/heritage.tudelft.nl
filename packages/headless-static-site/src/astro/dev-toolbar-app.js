import { defineToolbarApp } from "astro/toolbar";
import iiifIcon from "./iiif.svg?raw";

const APP_ID = "iiif-hss-control-center";
const EVENTS = {
  actionResult: `${APP_ID}:action-result`,
  error: `${APP_ID}:error`,
  healthCheck: `${APP_ID}:health-check`,
  healthResult: `${APP_ID}:health-result`,
  inspectPath: `${APP_ID}:inspect-path`,
  inspectSlug: `${APP_ID}:inspect-slug`,
  requestSnapshot: `${APP_ID}:request-snapshot`,
  resource: `${APP_ID}:resource`,
  runAction: `${APP_ID}:run-action`,
  snapshot: `${APP_ID}:snapshot`,
};

const ICON =
  typeof iiifIcon === "string" && iiifIcon.trim()
    ? iiifIcon.trim()
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="M3 7h18"/><path d="M3 17h18"/><circle cx="8" cy="7" r="1.3"/><circle cx="16" cy="12" r="1.3"/><circle cx="11" cy="17" r="1.3"/></svg>';
const SPINNER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5" opacity="0.25"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path></svg>';

function trimSlashes(value) {
  return String(value || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function normalizeSlug(value) {
  return trimSlashes(value).replace(/\/(manifest|collection)\.json$/i, "");
}

function encodeSlugPath(slug) {
  return normalizeSlug(slug)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleTimeString();
}

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) {
    return null;
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalized = String(pathOrUrl).startsWith("/")
    ? String(pathOrUrl)
    : `/${pathOrUrl}`;
  return new URL(normalized, `${window.location.origin}/`).toString();
}

function resourceLabel(resource) {
  if (resource?.label && typeof resource.label === "string") {
    return resource.label;
  }

  const label = resource?.resource?.label;
  if (typeof label === "string") {
    return label;
  }
  if (Array.isArray(label)) {
    return label.find(Boolean) || null;
  }
  if (label && typeof label === "object") {
    for (const key of Object.keys(label)) {
      const candidate = label[key];
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate[0];
      }
    }
  }

  return null;
}

function buildOnboardingTips(snapshot) {
  const onboarding = snapshot?.site?.onboarding || null;
  if (!onboarding) {
    return [];
  }

  const lines = [];
  if (onboarding.shorthand?.enabled) {
    lines.push(
      `Shorthand mode is active (${onboarding.shorthand.urls?.length || 0} URLs configured).`,
    );
    if (onboarding.shorthand.overrides) {
      lines.push(`Overrides folder: ${onboarding.shorthand.overrides}`);
    }
  }

  if (onboarding.enabled && onboarding.contentFolder) {
    lines.push(`Add or edit IIIF JSON in ${onboarding.contentFolder}.`);
  }

  if (onboarding.hints?.addContent) {
    lines.push(onboarding.hints.addContent);
  }
  if (onboarding.hints?.astro) {
    lines.push(`Astro hint: ${onboarding.hints.astro}`);
  }
  if (onboarding.hints?.vite) {
    lines.push(`Vite hint: ${onboarding.hints.vite}`);
  }

  if (!lines.length) {
    lines.push(`Config mode: ${onboarding.configMode || "unknown"}`);
  }

  return lines;
}

function sortResources(resources) {
  return [...(resources || [])].sort((a, b) =>
    String(a?.slug || "").localeCompare(String(b?.slug || "")),
  );
}

function getToolbarShadowRoot() {
  return document.querySelector("astro-dev-toolbar")?.shadowRoot || null;
}

function ensureToolbarLoadingStyles(shadowRoot) {
  if (!shadowRoot || shadowRoot.getElementById("hss-toolbar-loading-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "hss-toolbar-loading-style";
  style.textContent = `
    [data-app-id="${APP_ID}"].hss-app-loading .icon > svg {
      animation: hss-app-icon-pulse 1.1s ease-in-out infinite;
      transform-origin: center;
    }
    [data-app-id="${APP_ID}"].hss-app-loading .icon {
      color: rgba(118, 199, 255, 1);
    }
    @keyframes hss-app-icon-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.68; transform: scale(0.86); }
    }
  `;
  shadowRoot.appendChild(style);
}

function setToolbarLoadingClass(isLoading) {
  const shadowRoot = getToolbarShadowRoot();
  if (!shadowRoot) {
    return;
  }
  ensureToolbarLoadingStyles(shadowRoot);

  const mainButton = shadowRoot.querySelector(`[data-app-id="${APP_ID}"]`);
  if (mainButton) {
    mainButton.classList.toggle("hss-app-loading", isLoading);
  }

  const moreCanvas = shadowRoot.querySelector(
    'astro-dev-toolbar-app-canvas[data-app-id="astro:more"]',
  );
  const moreButton = moreCanvas?.shadowRoot?.querySelector(
    `[data-app-id="${APP_ID}"]`,
  );
  if (moreButton) {
    moreButton.classList.toggle("hss-app-loading", isLoading);
  }
}

export default defineToolbarApp({
  icon: ICON,
  id: APP_ID,
  name: "IIIF HSS",
  init(canvas, app, server) {
    const tabs = [
      { id: "overview", label: "Overview" },
      { id: "inspector", label: "Inspector" },
      { id: "files", label: "Files" },
      { id: "health", label: "Health" },
      { id: "onboarding", label: "Onboarding" },
    ];

    const state = {
      activeTab: "inspector",
      actionBusy: "",
      health: null,
      iconMode: "idle",
      lastError: "",
      lastMessage: "",
      loading: {
        health: false,
        inspect: false,
        snapshot: false,
      },
      open: false,
      pathInput: window.location.pathname || "/",
      resourcePayload: null,
      search: "",
      selectedResource: null,
      selectedSlug: "",
      snapshot: null,
    };
    let snapshotPollTimer = null;

    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }
      .hss-shell {
        width: 100%;
        max-height: min(78vh, 920px);
        overflow: auto;
        display: grid;
        gap: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
      }
      .hss-card {
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.02);
      }
      .hss-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      }
      .hss-stat-label {
        display: block;
        font-size: 11px;
        opacity: 0.75;
      }
      .hss-stat-value {
        display: block;
        font-size: 14px;
        font-weight: 600;
      }
      .hss-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hss-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .hss-tabs-wrap {
        padding: 0;
      }
      .hss-inline-status {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 8px;
        font-size: 11px;
        opacity: 0.92;
        display: flex;
        align-items: center;
        gap: 7px;
        white-space: nowrap;
        overflow: hidden;
      }
      .hss-inline-status.is-loading {
        border-color: rgba(118, 199, 255, 0.45);
      }
      .hss-inline-status-text {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hss-spinner {
        width: 11px;
        height: 11px;
        border: 2px solid rgba(255, 255, 255, 0.35);
        border-top-color: rgba(118, 199, 255, 1);
        border-radius: 999px;
        animation: hss-spin 0.9s linear infinite;
        flex: 0 0 auto;
      }
      @keyframes hss-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .hss-tab {
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.04);
        color: inherit;
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .hss-tab.is-active {
        border-color: rgba(118, 199, 255, 0.65);
        background: rgba(118, 199, 255, 0.12);
      }
      .hss-btn {
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .hss-btn[disabled] {
        opacity: 0.55;
        cursor: progress;
      }
      .hss-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.04);
        color: inherit;
        padding: 7px 8px;
        font-size: 12px;
      }
      .hss-row {
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(240px, 1fr) auto;
      }
      .hss-subtle {
        font-size: 12px;
        opacity: 0.8;
      }
      .hss-list {
        display: grid;
        gap: 6px;
        max-height: 280px;
        overflow: auto;
      }
      .hss-list-item {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        padding: 8px;
        display: grid;
        gap: 4px;
      }
      .hss-list-item.is-selected {
        border-color: rgba(118, 199, 255, 0.65);
        background: rgba(118, 199, 255, 0.08);
      }
      .hss-list-head {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        font-size: 12px;
      }
      .hss-kv {
        display: grid;
        gap: 4px;
        font-size: 12px;
      }
      .hss-kv code {
        font-size: 11px;
      }
      .hss-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hss-link {
        color: #76c7ff;
        text-decoration: none;
        font-size: 12px;
      }
      .hss-link:hover {
        text-decoration: underline;
      }
      .hss-status-pass { color: #89d185; }
      .hss-status-warn { color: #f3d26b; }
      .hss-status-fail { color: #ff8f8f; }
      .hss-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .hss-message {
        font-size: 12px;
      }
      .hss-error {
        color: #ff8f8f;
      }
      .hss-empty {
        opacity: 0.7;
        font-size: 12px;
      }
    `;

    const windowElement = document.createElement("astro-dev-toolbar-window");
    const shell = document.createElement("div");
    shell.className = "hss-shell";
    windowElement.appendChild(shell);

    canvas.appendChild(style);
    canvas.appendChild(windowElement);

    function toggleNotification() {
      const buildStatus = state.snapshot?.site?.build?.status;
      const hasBuildError = buildStatus === "error";
      const hasHealthFailures = (state.health?.summary?.failures || 0) > 0;
      const hasHealthWarnings = (state.health?.summary?.warnings || 0) > 0;

      if (hasBuildError || hasHealthFailures) {
        app.toggleNotification({ level: "error", state: true });
        return;
      }
      if (hasHealthWarnings) {
        app.toggleNotification({ level: "warning", state: true });
        return;
      }
      app.toggleNotification({ state: false });
    }

    function setLoading(key, value) {
      if (!(key in state.loading)) {
        return;
      }
      state.loading[key] = Boolean(value);
    }

    function isBusy() {
      return (
        Boolean(state.actionBusy) ||
        state.loading.snapshot ||
        state.loading.inspect ||
        state.loading.health ||
        state.snapshot?.site?.build?.status === "building"
      );
    }

    function updateToolbarIcon() {
      const iconMode = isBusy() ? "loading" : "idle";
      if (state.iconMode === iconMode) {
        setToolbarLoadingClass(iconMode === "loading");
        return;
      }
      state.iconMode = iconMode;
      setToolbarLoadingClass(iconMode === "loading");

      const nextIcon = iconMode === "loading" ? SPINNER_ICON : ICON;
      try {
        if (typeof app.setIcon === "function") {
          app.setIcon(nextIcon);
          return;
        }
        if (typeof app.update === "function") {
          app.update({ icon: nextIcon });
          return;
        }
        if (typeof app.setState === "function") {
          app.setState({ icon: nextIcon });
        }
      } catch {
        // Ignore toolbar icon update errors; inline status still shows loading.
      }
    }

    function syncSnapshotPolling() {
      const shouldPoll = state.open && isBusy();
      if (shouldPoll && !snapshotPollTimer) {
        snapshotPollTimer = window.setInterval(() => {
          requestSnapshot();
        }, 1200);
        return;
      }
      if (!shouldPoll && snapshotPollTimer) {
        clearInterval(snapshotPollTimer);
        snapshotPollTimer = null;
      }
    }

    function runAction(action) {
      if (state.actionBusy) {
        return;
      }
      state.activeTab = "overview";
      state.actionBusy = action;
      state.lastMessage = `Running ${action}...`;
      render();
      server.send(EVENTS.runAction, { action });
      requestSnapshot();
    }

    function requestSnapshot() {
      if (state.loading.snapshot) {
        return;
      }
      setLoading("snapshot", true);
      render();
      server.send(EVENTS.requestSnapshot, {});
    }

    function setActiveTab(tabId) {
      if (!tabs.some((tab) => tab.id === tabId)) {
        return;
      }
      state.activeTab = tabId;
      render();
    }

    function inspectPath() {
      const pathname = String(state.pathInput || "").trim() || "/";
      state.activeTab = "inspector";
      state.lastMessage = `Inspecting ${pathname}...`;
      state.selectedResource = null;
      state.health = null;
      setLoading("inspect", true);
      render();
      server.send(EVENTS.inspectPath, { pathname });
    }

    function inspectSlug(slug) {
      const normalized = normalizeSlug(slug);
      if (!normalized) {
        return;
      }
      state.activeTab = "inspector";
      state.selectedSlug = normalized;
      state.selectedResource = null;
      state.lastError = "";
      state.lastMessage = `Inspecting ${normalized}...`;
      state.health = null;
      setLoading("inspect", true);
      render();
      server.send(EVENTS.inspectSlug, { slug: normalized });
    }

    function runHealthCheck() {
      if (!state.selectedSlug) {
        state.activeTab = "files";
        state.lastError = "Select a resource first from Files or Inspector.";
        render();
        return;
      }
      state.activeTab = "health";
      state.lastMessage = `Checking source health for ${state.selectedSlug}...`;
      setLoading("health", true);
      render();
      server.send(EVENTS.healthCheck, { slug: state.selectedSlug });
    }

    function render() {
      const snapshot = state.snapshot;
      const buildStatus = snapshot?.site?.build?.status || "idle";
      const buildCount = snapshot?.site?.build?.buildCount || 0;
      const resourceCount = snapshot?.site?.resources?.length || 0;
      const pendingFiles = snapshot?.config?.pendingFiles?.length || 0;
      const watchState = snapshot?.config?.isWatching ? "Watching" : "Stopped";
      const onboardingTips = buildOnboardingTips(snapshot);
      const resources = sortResources(snapshot?.site?.resources || []);
      const hasContent = resources.length > 0;
      const visibleTabs = tabs.filter(
        (tab) => tab.id !== "onboarding" || !hasContent,
      );
      const activeTabValue = visibleTabs.some(
        (tab) => tab.id === state.activeTab,
      )
        ? state.activeTab
        : "inspector";
      if (activeTabValue !== state.activeTab) {
        state.activeTab = activeTabValue;
      }
      const searchTerm = state.search.trim().toLowerCase();
      const filteredResources = resources
        .filter((resource) => {
          if (!searchTerm) {
            return true;
          }
          const slug = String(resource?.slug || "").toLowerCase();
          const type = String(resource?.type || "").toLowerCase();
          const label = String(resource?.label || "").toLowerCase();
          return (
            slug.includes(searchTerm) ||
            type.includes(searchTerm) ||
            label.includes(searchTerm)
          );
        })
        .slice(0, 60);

      const selected = state.selectedResource;
      const selectedLabel = resourceLabel(selected) || selected?.slug || "-";
      const build = snapshot?.site?.build || null;
      const buildProgress = build?.progress || null;
      const resourcesTotal = Number(buildProgress?.resources?.total || 0);
      const resourcesProcessed = Number(
        buildProgress?.resources?.processed || 0,
      );
      const fetchQueued = Number(buildProgress?.fetch?.queued || 0);
      const fetchCompleted = Number(buildProgress?.fetch?.completed || 0);
      const fetchFailed = Number(buildProgress?.fetch?.failed || 0);
      const fetchInFlight = Number(buildProgress?.fetch?.inFlight || 0);
      const buildLine = [];
      buildLine.push(
        buildStatus === "building"
          ? `Build: ${buildProgress?.message || "running"}`
          : `Build: ${buildStatus}`,
      );
      if (resourcesTotal > 0) {
        buildLine.push(`Res ${resourcesProcessed}/${resourcesTotal}`);
      }
      if (fetchQueued > 0) {
        buildLine.push(
          `Fetch ${fetchCompleted + fetchFailed}/${fetchQueued}${fetchInFlight > 0 ? ` (+${fetchInFlight})` : ""}`,
        );
      }
      if (state.actionBusy) {
        buildLine.push(`Action: ${state.actionBusy}`);
      }
      if (state.loading.inspect) {
        buildLine.push("Inspecting...");
      }
      if (state.loading.snapshot && !state.snapshot) {
        buildLine.push("Loading snapshot...");
      }
      const compactBuildLine = buildLine.join(" | ");
      const debugBasePath = snapshot?.debugBasePath || "/iiif/_debug";
      const debugHome = toAbsoluteUrl(debugBasePath);
      const debugResource =
        state.selectedSlug && debugBasePath
          ? toAbsoluteUrl(
              `${String(debugBasePath).replace(/\/+$/, "")}/${encodeSlugPath(state.selectedSlug)}`,
            )
          : null;
      const links = [
        { href: selected?.links?.json, label: "JSON" },
        { href: selected?.links?.localJson, label: "Local JSON" },
        { href: selected?.links?.remoteJson, label: "Remote JSON" },
        { href: selected?.links?.manifestEditor, label: "Manifest Editor" },
        { href: selected?.links?.theseus, label: "Theseus" },
        { href: debugResource, label: "Debug Resource" },
        { href: debugHome, label: "Debug Home" },
      ].filter((entry) => entry.href);

      const healthChecks = Array.isArray(state.health?.checks)
        ? state.health.checks
        : [];
      const selectedSummary = selected
        ? `${selected.type || "Unknown"} from ${selected.source?.type || "unknown source"}`
        : "No resource selected";
      const activePanel = (tabId) =>
        activeTabValue === tabId ? "" : ' style="display:none;"';
      const tabButtons = visibleTabs
        .map(
          (tab) =>
            `<button class="hss-tab ${activeTabValue === tab.id ? "is-active" : ""}" data-action="tab" data-tab="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>`,
        )
        .join("");

      shell.innerHTML = `
        <section class="hss-tabs-wrap">
          <div class="hss-tabs">${tabButtons}</div>
        </section>
        <section class="hss-inline-status ${isBusy() ? "is-loading" : ""}" title="${escapeHtml(compactBuildLine)}">
          ${isBusy() ? '<span class="hss-spinner" aria-hidden="true"></span>' : ""}
          <span class="hss-inline-status-text">${escapeHtml(compactBuildLine)}</span>
        </section>

        <section class="hss-card"${activePanel("overview")}>
          <div class="hss-title">Status Snapshot</div>
          <div class="hss-grid">
            <div><span class="hss-stat-label">Build status</span><span class="hss-stat-value">${escapeHtml(buildStatus)}</span></div>
            <div><span class="hss-stat-label">Build count</span><span class="hss-stat-value">${escapeHtml(buildCount)}</span></div>
            <div><span class="hss-stat-label">Resources</span><span class="hss-stat-value">${escapeHtml(resourceCount)}</span></div>
            <div><span class="hss-stat-label">Watch</span><span class="hss-stat-value">${escapeHtml(watchState)}</span></div>
            <div><span class="hss-stat-label">Pending files</span><span class="hss-stat-value">${escapeHtml(pendingFiles)}</span></div>
            <div><span class="hss-stat-label">Updated</span><span class="hss-stat-value">${escapeHtml(formatDate(snapshot?.timestamp))}</span></div>
          </div>
          <div class="hss-actions" style="margin-top: 8px;">
            <button class="hss-btn" data-action="refresh">Refresh</button>
            <button class="hss-btn" data-action="rebuild" ${state.actionBusy ? "disabled" : ""}>Rebuild</button>
            <button class="hss-btn" data-action="save" ${state.actionBusy ? "disabled" : ""}>Save Pending</button>
            <button class="hss-btn" data-action="toggle-watch" ${state.actionBusy ? "disabled" : ""}>${snapshot?.config?.isWatching ? "Stop Watch" : "Start Watch"}</button>
          </div>
          <div class="hss-links" style="margin-top: 8px;">
            <a class="hss-link" href="${escapeHtml(debugHome || "#")}" target="_blank" rel="noreferrer">Debug Home</a>
          </div>
        </section>

        ${
          !hasContent
            ? `<section class="hss-card"${activePanel("onboarding")}>
          <div class="hss-title">Onboarding Coach</div>
          ${onboardingTips.length ? `<div class="hss-kv">${onboardingTips.map((tip) => `<div>• ${escapeHtml(tip)}</div>`).join("")}</div>` : '<div class="hss-empty">No onboarding hints from runtime.</div>'}
        </section>`
            : ""
        }

        <section class="hss-card"${activePanel("inspector")}>
          <div class="hss-title">Current-Page Inspector</div>
          <div class="hss-message ${state.lastError ? "hss-error" : ""}" style="margin-bottom: 8px;">
            ${escapeHtml(state.lastError || state.lastMessage || selectedSummary)}
          </div>
          <div class="hss-row">
            <input class="hss-input" data-role="path-input" value="${escapeHtml(state.pathInput)}" placeholder="/manifests/my-slug" />
            <button class="hss-btn" data-action="inspect-path">Inspect Path</button>
          </div>
          ${state.resourcePayload?.candidateSlugs?.length ? `<div class="hss-subtle" style="margin-top: 6px;">Candidates: ${state.resourcePayload.candidateSlugs.map((slug) => escapeHtml(slug)).join(", ")}</div>` : ""}
          ${
            selected
              ? `
            <div class="hss-kv" style="margin-top: 10px;">
              <div><strong>Slug:</strong> <code>${escapeHtml(selected.slug || state.selectedSlug || "-")}</code></div>
              <div><strong>Type:</strong> ${escapeHtml(selected.type || "-")}</div>
              <div><strong>Source:</strong> ${escapeHtml(selected.source?.type || "-")}</div>
              <div><strong>Editable:</strong> ${selected.isEditable ? "yes" : "no"}</div>
              <div><strong>Label:</strong> ${escapeHtml(selectedLabel)}</div>
            </div>
            <div class="hss-links" style="margin-top: 8px;">
              ${links.map((link) => `<a class="hss-link" href="${escapeHtml(toAbsoluteUrl(link.href) || link.href)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
            </div>
            <div style="margin-top: 10px;">
              <button class="hss-btn" data-action="run-health">Run Source Health Check</button>
            </div>
          `
              : '<div class="hss-empty" style="margin-top: 8px;">No resource selected yet.</div>'
          }
        </section>

        <section class="hss-card"${activePanel("health")}>
          <div class="hss-title">Source Health</div>
          ${
            healthChecks.length
              ? `<div class="hss-kv">${healthChecks
                  .map(
                    (check) =>
                      `<div><span class="hss-status-${escapeHtml(check.status)}">${escapeHtml(String(check.status).toUpperCase())}</span> ${escapeHtml(check.label)}: ${escapeHtml(check.detail)}</div>`,
                  )
                  .join("")}</div>`
              : '<div class="hss-empty">Run a health check on a selected resource.</div><div style="margin-top: 8px;"><button class="hss-btn" data-action="run-health">Run Health Check</button></div>'
          }
        </section>

        <section class="hss-card"${activePanel("files")}>
          <div class="hss-title">Resource Search</div>
          <input class="hss-input" data-role="search-input" value="${escapeHtml(state.search)}" placeholder="Search by slug, type, label" />
          <div class="hss-subtle" style="margin-top: 6px;">Showing ${escapeHtml(filteredResources.length)} of ${escapeHtml(resources.length)} resources</div>
          <div class="hss-list" style="margin-top: 8px;">
            ${
              filteredResources.length
                ? filteredResources
                    .map((resource) => {
                      const slug = normalizeSlug(resource?.slug || "");
                      const selectedClass =
                        slug === state.selectedSlug ? "is-selected" : "";
                      return `<div class="hss-list-item ${selectedClass}"><div class="hss-list-head"><code>${escapeHtml(slug)}</code><span>${escapeHtml(resource?.type || "-")}</span></div><div class="hss-subtle">${escapeHtml(resource?.label || "")}</div><div><button class="hss-btn" data-action="inspect-slug" data-slug="${escapeHtml(slug)}">Inspect</button></div></div>`;
                    })
                    .join("")
                : '<div class="hss-empty">No matching resources.</div>'
            }
          </div>
        </section>
      `;
      updateToolbarIcon();
      syncSnapshotPolling();
    }

    shell.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const role = target.getAttribute("data-role");
      if (role === "path-input") {
        state.pathInput = target.value;
        return;
      }
      if (role === "search-input") {
        state.search = target.value;
        render();
      }
    });

    shell.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (event.key !== "Enter") {
        return;
      }
      if (target.getAttribute("data-role") === "path-input") {
        inspectPath();
      }
    });

    shell.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const button = target.closest("[data-action]");
      if (!(button instanceof Element)) {
        return;
      }
      const action = button.getAttribute("data-action");
      if (action === "tab") {
        setActiveTab(button.getAttribute("data-tab"));
        return;
      }
      if (action === "refresh") {
        requestSnapshot();
        return;
      }
      if (
        action === "rebuild" ||
        action === "save" ||
        action === "toggle-watch"
      ) {
        runAction(action);
        return;
      }
      if (action === "inspect-path") {
        inspectPath();
        return;
      }
      if (action === "inspect-slug") {
        inspectSlug(button.getAttribute("data-slug"));
        return;
      }
      if (action === "run-health") {
        runHealthCheck();
      }
    });

    server.on(EVENTS.snapshot, (payload) => {
      setLoading("snapshot", false);
      state.snapshot = payload || null;
      if (!state.selectedSlug && payload?.site?.resources?.length) {
        const first = payload.site.resources[0];
        if (first?.slug) {
          state.selectedSlug = normalizeSlug(first.slug);
        }
      }
      state.lastError = "";
      state.lastMessage = "Snapshot updated.";
      render();
      toggleNotification();
    });

    server.on(EVENTS.resource, (payload) => {
      setLoading("inspect", false);
      state.resourcePayload = payload || null;
      state.selectedResource = payload?.resource || null;
      state.selectedSlug = normalizeSlug(
        payload?.resolvedSlug || payload?.resource?.slug || state.selectedSlug,
      );
      state.activeTab = "inspector";
      state.lastError = payload?.found ? "" : "No matching resource found.";
      state.lastMessage = payload?.found ? "Resource loaded." : "";
      render();
    });

    server.on(EVENTS.actionResult, (payload) => {
      state.actionBusy = "";
      setLoading("snapshot", false);
      if (payload?.ok) {
        if (payload?.snapshot) {
          state.snapshot = payload.snapshot;
        }
        state.lastError = "";
        state.lastMessage = `Action complete: ${payload.action}`;
      } else {
        state.lastError =
          payload?.error || `Action failed: ${payload?.action || "unknown"}`;
      }
      render();
      toggleNotification();
    });

    server.on(EVENTS.healthResult, (payload) => {
      setLoading("health", false);
      state.health = payload || null;
      state.activeTab = "health";
      if (payload?.summary?.ok) {
        state.lastError = "";
        state.lastMessage = "Health check passed.";
      } else if (payload?.error) {
        state.lastError = payload.error;
      } else {
        state.lastMessage = "Health check completed with warnings/errors.";
      }
      render();
      toggleNotification();
    });

    server.on(EVENTS.error, (payload) => {
      state.actionBusy = "";
      setLoading("health", false);
      setLoading("inspect", false);
      setLoading("snapshot", false);
      state.lastError = payload?.message || "Unexpected toolbar error";
      render();
      toggleNotification();
    });

    app.onToggled((options) => {
      state.open = Boolean(options?.state);
      if (!state.open) {
        syncSnapshotPolling();
        return;
      }
      if (!options?.state) {
        return;
      }
      requestSnapshot();
      inspectPath();
    });

    state.open = true;
    requestSnapshot();
    inspectPath();
    render();
  },
});
