// Hosted version.
import { useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DelftExhibition } from "./DelftExhibition";

import "./styles/index.css";
import "./styles/lib.css";
import { LocaleString } from "react-iiif-vault";
import { DelftPresentation } from "./DelftPresentation";

const search = new URLSearchParams(window.location.search);

function App() {
  const [manifest, setManifest] = useState<any | null>(null);
  const [collection, setCollection] = useState<any | null>(null);

  const isPresentation = search.get("type") === "presentation";
  const manifestId = search.get("manifest");
  const cutCorners = search.get("cut-corners");
  const fullTitleBar = search.get("full-title-bar");

  const options = {
    cutCorners: !(cutCorners === "false"),
    fullTitleBar: fullTitleBar === "true",
  };

  useEffect(() => {
    fetch("https://heritage.tudelft.nl/iiif/stores/manifest-editor/collection.json")
      .then((r) => r.json())
      .then((col) => {
        setCollection(col);
      });
  }, []);

  useEffect(() => {
    if (manifestId) {
      fetch(manifestId)
        .then((response) => response.json())
        .then(setManifest);
    }
  }, [manifestId]);

  if (!collection) {
    return null;
  }

  if (!manifest) {
    return (
      <div>
        <ul className="my-8 w-full text-center">
          {collection.items.map((item: any) => (
            <li key={item.id} className="pb-4 text-2xl">
              <a href={`?manifest=${item.id}`} className="hover:underline">
                <LocaleString>{item.label}</LocaleString>
              </a>{" "}
              (
              <a href={`?manifest=${item.id}&type=presentation`} className="hover:underline">
                Presentation
              </a>
              )
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10">
        {isPresentation ? (
          <DelftPresentation manifest={manifest} options={options} language="en" viewObjectLinks={[]} />
        ) : (
          <DelftExhibition manifest={manifest} options={options} language="en" viewObjectLinks={[]} />
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
