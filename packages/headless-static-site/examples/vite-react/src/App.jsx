import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LocaleString } from "react-iiif-vault";
import { Manifest } from "./Manifest";
import { iiif } from "./lib/iiif";

function getLabel(label) {
  if (!label || typeof label !== "object") {
    return "Untitled";
  }

  for (const value of Object.values(label)) {
    if (Array.isArray(value) && value[0]) {
      return value[0];
    }
  }

  return "Untitled";
}

export function App() {
  const [selectedManifest, setSelectedManifest] = useState(null);
  const { data, error, status } = useQuery({
    queryKey: ["manifests"],
    queryFn: async () => {
      return await iiif.getAllManifests();
    },
  });

  const items = data?.items || [];

  if (selectedManifest) {
    return (
      <Manifest
        slug={selectedManifest}
        onDeselect={() => setSelectedManifest(null)}
      />
    );
  }

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        margin: "2rem auto",
        maxWidth: 800,
        padding: "0 1rem",
      }}
    >
      <h1>iiif-hss + Vite + React</h1>
      <p>
        This example uses <code>iiif-hss/vite-plugin</code> with shorthand
        configuration:
        <code>iiifPlugin(&#123; collection: &quot;...&quot; &#125;)</code>.
      </p>
      <p>
        It also uses <code>createIiifViteClient()</code> from
        <code>iiif-hss/vite/client</code> to load helper APIs.
      </p>
      <p>
        Browse debug tools at <a href="/iiif/_debug">/iiif/_debug</a>.
      </p>

      {status === "loading" && (
        <p>Loading manifests from /iiif/manifests/collection.json...</p>
      )}

      {status === "error" && (
        <p>
          Could not load manifests: <code>{error}</code>
        </p>
      )}

      {status === "success" && (
        <ul>
          {items.map((item) => {
            const slug = item["hss:slug"];
            const href = slug ? `/iiif/${slug}/meta.json` : item.id;
            return (
              <li key={item.id}>
                <LocaleString>{item.label}</LocaleString>
                <button onClick={() => setSelectedManifest(slug)}>View</button>
                <a href={href} target="_blank" rel="noreferrer">
                  (meta)
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
