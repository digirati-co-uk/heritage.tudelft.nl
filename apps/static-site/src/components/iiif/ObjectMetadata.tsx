import { facetConfig } from "@/facets";
import { Link } from "@/i18n/navigation";
import { TYPESENSE_COLLECTION_NAME } from "@/search";
import { getValue } from "@iiif/helpers";
import { ManifestMetadata, LanguageProvider } from "react-iiif-vault";
import { useLocale } from "next-intl";

export function ObjectMetadata() {
  const locale = useLocale();
  // 'manifests[refinementList][topic_material][0]=metaal'
  return (
    <LanguageProvider language={locale || "en"}>
      <ManifestMetadata
        allowHtml={true}
        separator="<br>"
        customValueRender={(item, fallback) => {
          const label = getValue(item.label).toLowerCase();
          if (facetConfig.metadata[label]?.interactive) {
            // This is a bit.. meh with the try/catch
            try {
              const values =
                item.value[locale] ||
                item.value[Object.keys(item.value)?.[0]!] ||
                [];
              return (
                <ul>
                  {values.map((value) => {
                    return (
                      <li key={value} className="underline">
                        <Link
                          href={`/search?${TYPESENSE_COLLECTION_NAME}[refinementList][topic_${label}][0]=${value}`}
                        >
                          {value}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              );
            } catch (err) {
              // Need a helper to wrap around this..
            }
          }

          return fallback;
        }}
        classes={{
          container: "m-4",
          row: "border-b border-gray-200 flex flex-col",
          label: "font-medium text-slate-600 text-md font-mono",
          value: "text-sm text-slate-800 text-xl mb-4",
          empty: "text-gray-400",
        }}
      />
    </LanguageProvider>
  );
}
