import { Link } from "@/navigation";
import { InternationalString } from "@iiif/presentation-3";

export function CollectionItemHit({
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
  let thumbnail = hit.thumbnail;
  if (thumbnail) {
    thumbnail.replace("/200,/", "/400,/");
  }

  return (
    <div className="mb-4">
      <div className="group">
        <div className="cut-corners aspect-square">
          <Link href={url}>
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full cursor-pointer object-cover transition-transform duration-1000 group-hover:scale-110"
            />
          </Link>
        </div>
        <Link href={url}>
          <h4
            className="p-4 font-mono text-sm underline-offset-2 group-hover:underline"
            dangerouslySetInnerHTML={{ __html: result.label.value }}
          />
        </Link>
      </div>
    </div>
  );
}
