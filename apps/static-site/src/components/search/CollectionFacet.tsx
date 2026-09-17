"use client";

import { getValue } from "@iiif/helpers";
import type { Collection } from "@iiif/presentation-3";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRefinementList } from "react-instantsearch";

type Resource = Collection["items"][number];
type Refinements = Pick<ReturnType<typeof useRefinementList>, "items" | "refine">;

function CollectionSection({ section, items, refine, term }: Refinements & { section: Resource; term: string }) {
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const label = (resource: Resource) => getValue(resource.label, { language: locale });
  const children = (section.items || []).filter((item) => item.type === "Collection");
  const matchesSection = label(section).toLocaleLowerCase(locale).includes(term);
  const matches = children.filter((child) => matchesSection || label(child).toLocaleLowerCase(locale).includes(term));
  if (term && !matchesSection && !matches.length) return null;

  const row = (resource: Resource) => {
    const slug = resource["hss:slug"];
    const item = items.find((item) => item.value === slug);
    return (
      <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-3 py-3 pe-3">
        <span>
          {label(resource)} ({item?.count || 0})
        </span>
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-black"
          checked={item?.isRefined || false}
          disabled={!slug}
          onChange={() => refine(slug)}
        />
      </label>
    );
  };

  return (
    <div style={{ backgroundColor: section.background || "var(--card-color)" }} className="text-black">
      <div className="flex items-center font-bold">
        {children.length > 0 && (
          <button
            type="button"
            className="flex size-11 shrink-0 items-center hover:bg-black/10 justify-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            aria-label={label(section)}
            aria-expanded={expanded || Boolean(term)}
            onClick={() => setExpanded(!expanded)}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-5 ${expanded || term ? "rotate-180" : ""}`}>
              <path d="m4 7 6 6 6-6" fill="none" stroke="currentColor" />
            </svg>
          </button>
        )}
        {row(section)}
      </div>
      {(expanded || term) && (
        <div className="">
          {matches.map((child) => (
            <div key={child.id} className="pl-12 hover:bg-black/10" style={{ backgroundColor: child.background }}>
              {row(child)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionFacet({ sections }: { sections: Collection["items"] }) {
  const t = useTranslations();
  const [term, setTerm] = useState("");
  const { items, refine } = useRefinementList({
    attribute: "collectionSlugs",
    operator: "or",
    limit: Math.max(
      100,
      sections.reduce((count, section) => count + 1 + (section.items?.length || 0), 0),
    ),
    sortBy: ["name:asc"],
  });

  return (
    <details open className="mb-8">
      <summary className="cursor-pointer py-3 text-xl font-bold uppercase">{t("Collections")}</summary>
      <input
        type="search"
        aria-label={t("Search in collections")}
        placeholder={t("Search in collections")}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        className="mb-1 w-full bg-white p-3 text-lg"
      />
      {sections.map((section) => (
        <CollectionSection
          key={section.id}
          section={section}
          items={items}
          refine={refine}
          term={term.trim().toLocaleLowerCase()}
        />
      ))}
    </details>
  );
}
