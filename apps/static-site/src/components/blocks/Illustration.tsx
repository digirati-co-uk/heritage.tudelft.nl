"use client";
import { ManifestLoader } from "@/app/provider";
import type { ViewObjectLink } from "@/helpers/get-view-object-links";
import { IIIF_URL } from "@/iiif";
import { fetch } from "@iiif/helpers";
import { useQuery } from "@tanstack/react-query";
import { SingleCanvasThumbnail, useVault } from "react-iiif-vault";
import { CanvasContext } from "../context-wrappers";
import { ObjectViewer } from "../iiif/ObjectViewer";
import { AutoLanguage } from "../pages/AutoLanguage";

export function Illustration(props: {
  source?: string;
  manifest?: string;
  canvas?: string;
  viewObjectLinks?: Array<ViewObjectLink>;
}) {
  const uuid = props.source?.split(".json")[0];
  const slug = uuid ? `manifests/${uuid}` : null;
  const manifestId = props.manifest || `/${slug}/manifest.json`;
  const vault = useVault();

  const { data, error } = useQuery({
    queryKey: ["manifest", manifestId],
    queryFn: async () => {
      if (!manifestId) return null;
      return fetch(manifestId.startsWith("http") ? manifestId : `${IIIF_URL}${manifestId}`);
    },
  });

  if (data?.id && !vault.requestStatus(data.id)) {
    vault.loadSync(data.id, JSON.parse(JSON.stringify(data)));
  }

  const link = props.viewObjectLinks ? props.viewObjectLinks[0] || null : null;

  // if (error) return <DevCreateManifest slug={slug} />;
  if (!data) return null; // loading.

  if (data.items.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return (
      <div className="cut-corners flex h-96 flex-col items-center justify-center gap-3 bg-white/50 p-8">
        {/*<DevEditManifest slug={slug} />*/}
      </div>
    );
  }

  return (
    <ManifestLoader manifest={{ ...data }}>
      <div className="group relative mb-8 grid-cols-7 md:grid">
        <div className="cut-corners col-span-4 aspect-square bg-gray-400">
          <ObjectViewer
            className="h-full w-full cursor-pointer"
            objectLink={link?.slug}
            objectCanvasId={link?.targetCanvasId}
          >
            <CanvasContext canvas={props.canvas as string}>
              <SingleCanvasThumbnail
                classes={{
                  imageWrapper: "h-full w-full cursor-pointer",
                  img: "h-full w-full image-no-margin object-contain transition-transform duration-1000 ease-in-out hover:scale-110",
                }}
                size={{ width: 512, height: 512 }}
              />
            </CanvasContext>
          </ObjectViewer>
        </div>
        <div className="cut-corners col-span-3 bg-black p-8 text-white">
          <div>
            <AutoLanguage>{data.label}</AutoLanguage>
          </div>
          <div>
            <AutoLanguage>{data.summary}</AutoLanguage>
          </div>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="absolute bottom-3 right-3 rounded bg-white p-3 opacity-0 transition-opacity group-hover:opacity-100">
            {/*<DevEditManifest slug={slug} />*/}
          </div>
        ) : null}
      </div>
    </ManifestLoader>
  );
}
