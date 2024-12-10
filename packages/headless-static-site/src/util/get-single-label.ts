import { getValue } from "@iiif/helpers/i18n";
import { cachedTranslate } from "./cached-translate.ts";
import type { InternationalString } from "@iiif/presentation-3";

export async function getSingleLabel(
  label: InternationalString | undefined,
  options: {
    language: string;
    translate?: boolean;
  },
) {
  const labelLanguages = Object.keys(label || {});
  const primaryLabel = getValue(label, {
    language: options.language,
    fallbackLanguages: ["none"],
  });

  if (options.translate && label) {
    //
    const availableLabelLanguages = labelLanguages.filter((l) => l !== "none");
    const preferredLabelLanguage = availableLabelLanguages.find(
      (l) => l === options.language,
    );

    if (!preferredLabelLanguage && availableLabelLanguages.length > 0) {
      const firstLabelLanguage = availableLabelLanguages[0];
      const firstLabelValues = (label[firstLabelLanguage] || []).join(" ");
      if (firstLabelLanguage && firstLabelValues) {
        return await cachedTranslate(
          firstLabelValues,
          firstLabelLanguage,
          options.language,
        );
      }
    }
  }

  return primaryLabel;
}
