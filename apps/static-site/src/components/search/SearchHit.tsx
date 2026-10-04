import { Link } from "@/i18n/navigation";
import type { Collection, InternationalString } from "@iiif/presentation-3";
import { useTranslations } from "next-intl";
import { AutoLanguage } from "../pages/AutoLanguage";

export function SearchHit({
  hit,
}: {
  hit: {
    partOf?: Collection["partOf"];
    background?: string;
    type: string;
    thumbnail: string;
    label: string;
    full_label: InternationalString;
    slug: string;
    _highlightResult: any;
  };
}) {
  const t = useTranslations();
  const parent = hit.partOf?.[hit.partOf.length - 1];
  const url = `/${hit.slug}`;
  const result = hit._highlightResult as any;
  return (
    <article className="mb-10 flex gap-4">
      <div className="cut-corners h-32 w-32 bg-slate-400">
        <Link href={url}>
          <img src={hit.thumbnail} className="h-32 w-32 rounded-lg object-cover" alt="" />
        </Link>
      </div>
      <section className="flex-1">
        <header className="mb-2 w-full border-b border-slate-400 pb-2">
          <Link href={url}>
            <h3
              className="text-2xl font-medium leading-tight text-gray-900 underline-offset-2 hover:underline"
              dangerouslySetInnerHTML={{ __html: result.label.value }}
            />
          </Link>
          <div className="text-xl">{hit.type}</div>
        </header>
        {result.summary && result.summary.value ? (
          <p
            className="prose prose-xl leading-snug md:leading-normal"
            dangerouslySetInnerHTML={{ __html: result.summary.value }}
          />
        ) : null}
        {result.plaintext && result.plaintext.matchedWords.length > 0 && (
          <p
            className="prose prose-xl leading-snug md:leading-normal"
            dangerouslySetInnerHTML={{ __html: result.plaintext.value }}
          />
        )}
        {parent && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {t("Part of")}
            <Link
              href={
                parent["hss:slug"]
                  ? `/${parent["hss:slug"]}`
                  : parent.id.replace(/^.*\/collections\/(.+)\/collection\.json$/, "/collections/$1")
              }
              className="px-2 py-1 text-black underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: parent.background || hit.background || "var(--card-color)" }}
            >
              <AutoLanguage>{parent.label}</AutoLanguage>
            </Link>
          </p>
        )}
      </section>
    </article>
  );
}
