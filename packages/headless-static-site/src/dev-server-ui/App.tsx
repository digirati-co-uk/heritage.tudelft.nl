import { useEffect, useMemo, useState } from "react";
import { HomePage } from "./components/HomePage";
import { Navigation } from "./components/Navigation";
import { ResourcePage } from "./components/ResourcePage";
import { detectDebugBase, getSlugPath } from "./components/utils";
import { TracePage } from "./trace/TracePage";

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [trace, setTrace] = useState<any>(null);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const debugBase = useMemo(() => detectDebugBase(pathname), [pathname]);
  const slugPath = useMemo(
    () => getSlugPath(pathname, debugBase),
    [debugBase, pathname],
  );
  const isHome = !slugPath;
  const isTrace = slugPath === "trace";

  useEffect(() => {
    if (!isTrace) return;
    let cancelled = false;
    fetch(`${debugBase}/api/trace`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setTrace(json);
      })
      .catch(() => {
        if (!cancelled) setTrace({});
      });
    return () => {
      cancelled = true;
    };
  }, [debugBase, isTrace]);

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <Navigation debugBase={debugBase} />
      {isHome ? <HomePage debugBase={debugBase} /> : null}
      {isTrace ? (
        trace ? (
          <TracePage trace={trace} debugBase={debugBase} />
        ) : (
          <p>Loading trace…</p>
        )
      ) : null}
      {!isHome && !isTrace ? (
        <ResourcePage debugBase={debugBase} slug={slugPath} />
      ) : null}
    </div>
  );
}

export default App;
