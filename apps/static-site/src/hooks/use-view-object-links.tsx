"use client";
import type { ViewObjectLink } from "@/helpers/get-view-object-links";
import { Link } from "@/i18n/navigation";
import { useMemo } from "react";

export function useViewObjectLinks(viewObjectLinks?: null | ViewObjectLink[]) {
  return useMemo(() => {
    return (viewObjectLinks || []).map((link) => {
      return {
        ...link,
        component: (
          <div>
            <Link
              href={`/${link.slug.replace("manifests/", "objects/")}?c=${link.targetCanvasId}`}
              className="text-white underline py-3"
            >
              View object
            </Link>
          </div>
        ),
      };
    });
  }, [viewObjectLinks]);
}
