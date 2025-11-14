"use client";

import { IIIF_URL } from "@/iiif";
import { fetch } from "@iiif/helpers";
import type { Manifest } from "@iiif/presentation-3";
import { useQuery } from "@tanstack/react-query";

export function useLoadManifest(props: { manifest: string }) {
  return useQuery<Manifest | null>({
    queryKey: ["manifest", props.manifest],
    queryFn: () => {
      if (!props.manifest) {
        return null;
      }

      if (props.manifest.startsWith("http")) {
        return fetch(props.manifest) as Promise<Manifest>;
      }

      return fetch(`${IIIF_URL}${props.manifest}`) as Promise<Manifest>;
    },
  });
}
