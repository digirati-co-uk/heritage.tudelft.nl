import { Link } from "@/i18n/navigation";
import { InternationalString } from "@iiif/presentation-3";

export function SearchHit({
  hit,
}: {
  hit: {
    type: string;
    thumbnail: string;
    label: string;
    full_label: InternationalString;
    slug: string;
    _highlightResult: any;
  };
}) {
  const url = `/${hit.slug}`;
  const result = hit._highlightResult as any;
  return (
    <article className="mb-10 flex gap-4">
      <div className="cut-corners h-32 w-32 bg-slate-400">
        <Link href={url}>
          <img
            src={hit.thumbnail}
            className="h-32 w-32 rounded-lg object-cover"
            alt=""
          />
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
      </section>
    </article>
  );
}
