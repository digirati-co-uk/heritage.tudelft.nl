import { LocaleString, useVault } from "react-iiif-vault";

// Remove this placeholder image URL when real thumbnails are available
const PLACEHOLDER_IMAGE = "https://picsum.photos/600/400";

export function SeeAlsoCarousel({ items }) {
  const vault = useVault();
  if (!items?.length) return null;

  return (
    <section className="w-full bg-neutral-900 text-white py-16">
      <div className="px-8 mb-4">
        <h3 className="text-lg font-semibold">See also</h3>
      </div>

      <div className="flex gap-6 overflow-x-auto px-8 pb-4">
        {items.map((item, i) => {
          const resource = item.id ? vault.get(item.id) : null;

          const thumb = resource?.thumbnail
            ? Array.isArray(resource.thumbnail)
              ? resource.thumbnail[0]
              : resource.thumbnail
            : null;

          return (
            <a
              key={item.id ?? i}
              href={item.id}
              target="_blank"
              rel="noopener noreferrer"
              className="relative min-w-[420px] h-[240px] flex-shrink-0 overflow-hidden bg-neutral-800 group"
            >
              {/* Image (thumbnail or placeholder) */}
              <img
                src={thumb?.id ?? PLACEHOLDER_IMAGE}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Text overlay */}
              <div className="absolute bottom-5 left-0 p-4 bg-neutral-800 opacity-80 w-60">
                <div className="text-base font-medium ">
                  <LocaleString>{resource?.label ?? item.label}</LocaleString>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
