// Hosted version.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DelftExhibition } from "./DelftExhibition";

import "./styles/index.css";
import "./styles/lib.css";
import type { Manifest } from "@iiif/presentation-3";
import { DelftPresentation } from "./DelftPresentation";

const search = new URLSearchParams(window.location.search);
const manifestId = search.get("manifest");

function Embed({ manifest }: { manifest: Manifest }) {
  const manifestId = search.get("manifest");
  const cutCorners = search.get("cut-corners");
  const fullTitleBar = search.get("full-title-bar");
  const isFloating = search.get("floating") === "true";
  const floatingPosition = search.get("floating-position") as any;

  const options = {
    cutCorners: !(cutCorners === "false"),
    fullTitleBar: fullTitleBar === "true",
    isFloating,
    floatingPosition,
  };

  if (!manifest) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center h-full">
      <DelftPresentation
        manifest={manifest}
        options={options}
        language="en"
        viewObjectLinks={[]}
      />
    </div>
  );
}

if (manifestId) {
  fetch(manifestId)
    .then((response) => response.json())
    .then((manifest) => {
      const root = createRoot(document.getElementById("root")!);
      root.render(<Embed manifest={manifest} />);
    });
}
