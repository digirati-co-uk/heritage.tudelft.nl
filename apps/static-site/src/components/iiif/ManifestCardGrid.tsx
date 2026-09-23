"use client";

import type { Collection } from "@iiif/presentation-3";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CardGrid } from "./CardGrid";
import { ManifestCard } from "./ManifestCard";

const batchSize = 24;

export function ManifestCardGrid({ manifests, children }: { manifests: Collection["items"]; children?: ReactNode }) {
  const t = useTranslations();
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const button = useRef<HTMLButtonElement>(null);
  const hasMore = visibleCount < manifests.length;

  useEffect(() => {
    if (visibleCount >= manifests.length || !button.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          setVisibleCount((count) => count + batchSize);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(button.current);
    return () => observer.disconnect();
  }, [manifests.length, visibleCount]);

  return (
    <div>
      <CardGrid>
        {children}
        {manifests.slice(0, visibleCount).map((manifest) => (
          <ManifestCard key={manifest.id} manifest={manifest} />
        ))}
      </CardGrid>
      {manifests.length > 0 && (
        <output className="mt-4 block text-center text-sm">
          {t("Showing objects", { count: Math.min(visibleCount, manifests.length), total: manifests.length })}
        </output>
      )}
      {hasMore && (
        <button
          ref={button}
          type="button"
          onClick={() => setVisibleCount((count) => count + batchSize)}
          className="mx-auto mt-4 block min-h-11 bg-black px-6 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >
          {t("Load more")}
        </button>
      )}
    </div>
  );
}
