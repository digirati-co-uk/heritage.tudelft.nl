import { useEffect, useMemo, useState } from "react";
import { CollectionsConfigPage } from "./components/CollectionsConfigPage";
import { FolderCollectionsPage } from "./components/FolderCollectionsPage";
import { HomePage } from "./components/HomePage";
import { MetadataPage } from "./components/MetadataPage";
import { Navigation } from "./components/Navigation";
import { ResourcePage } from "./components/ResourcePage";
import { SlugWorkshopPage } from "./components/SlugWorkshopPage";
import { StoresConfigPage } from "./components/StoresConfigPage";
import { TopicThumbnailsPage } from "./components/TopicThumbnailsPage";
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
  const isMetadata = slugPath === "metadata";
  const isStores = slugPath === "config/stores";
  const isSlugs = slugPath === "config/slugs";
  const isCollections = slugPath === "config/collections";
  const isFolderCollections = slugPath === "config/folder-collections";
  const isTopicThumbnails = slugPath === "topics/thumbnails";

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
      {isMetadata ? <MetadataPage debugBase={debugBase} /> : null}
      {isStores ? <StoresConfigPage debugBase={debugBase} /> : null}
      {isSlugs ? <SlugWorkshopPage debugBase={debugBase} /> : null}
      {isCollections ? <CollectionsConfigPage debugBase={debugBase} /> : null}
      {isFolderCollections ? (
        <FolderCollectionsPage debugBase={debugBase} />
      ) : null}
      {isTopicThumbnails ? <TopicThumbnailsPage debugBase={debugBase} /> : null}
      {!isHome &&
      !isTrace &&
      !isMetadata &&
      !isStores &&
      !isSlugs &&
      !isCollections &&
      !isFolderCollections &&
      !isTopicThumbnails ? (
        <ResourcePage debugBase={debugBase} slug={slugPath} />
      ) : null}
    </div>
  );
}

export default App;
