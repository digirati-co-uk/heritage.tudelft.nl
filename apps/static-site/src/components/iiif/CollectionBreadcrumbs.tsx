import { Link } from "@/i18n/navigation";
import type { Collection, InternationalString, Reference } from "@iiif/presentation-3";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { AutoLanguage } from "../pages/AutoLanguage";

export function CollectionBreadcrumbs({
  partOf,
  className,
  current,
}: { partOf?: Collection["partOf"]; className?: string; current?: InternationalString }) {
  const filtered = useMemo(() => {
    return (partOf || []).filter((part: any) => part["hss:slug"]) as any[];
  }, [partOf]) as Array<Reference<"Collection"> & { label: InternationalString; "hss:slug": string }>;

  if (filtered.length === 0) return null;

  return (
    <nav className={twMerge("w-full max-w-screen-xl px-5 py-5 lg:px-10", className ?? "")}>
      <ol className="flex gap-2 items-baseline">
        {filtered.map((part, n) => {
          const slug = part["hss:slug"] === "featured" ? "/collections" : `/${part["hss:slug"]}`;
          return (
            <li key={part.id} className={twMerge(n === 0 ? "text-3xl" : "", "flex items-center gap-2")}>
              {n > 0 && n < filtered.length && <span>→</span>}
              <Link href={slug} className="hover:underline">
                <AutoLanguage>{part.label}</AutoLanguage>
              </Link>
            </li>
          );
        })}
        {current && (
          <>
            <span>→</span>
            <li className="flex items-center gap-2">
              <AutoLanguage>{current}</AutoLanguage>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
