import { Link, getObjectSlug } from "@/i18n/navigation";
import type { Collection } from "@iiif/presentation-3";
import { AutoLanguage } from "../pages/AutoLanguage";

export function ManifestCard({ manifest }: { manifest: Collection["items"][number] }) {
  const href = manifest["hss:slug"]
    ? `/${getObjectSlug(manifest["hss:slug"])}`
    : manifest.id.replace(/^.*\/manifests\/(.+)\/manifest\.json$/, "/objects/$1");
  const thumbnail = manifest.thumbnail?.[0]?.id;

  return (
    <Link
      href={href}
      className="cut-corners group flex h-full flex-col bg-[var(--card-color)] text-black focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black"
    >
      <div className="cut-corners relative aspect-square w-full shrink-0 bg-zinc-300">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-1000 group-hover:scale-110"
          />
        ) : null}
      </div>
      <h3 className="flex-1 break-words p-4 pb-6 font-mono text-sm underline-offset-4 group-hover:underline group-focus-visible:underline sm:p-5 sm:pb-6">
        <AutoLanguage>{manifest.label}</AutoLanguage>
      </h3>
    </Link>
  );
}
