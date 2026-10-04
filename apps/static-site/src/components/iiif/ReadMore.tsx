"use client";

import type { InternationalString } from "@iiif/presentation-3";
import { useLocale } from "next-intl";
import { useState } from "react";
import { AutoLanguage, type AutoLanguageProps } from "../pages/AutoLanguage";

export function ReadMore({
  label,
  closeLabel,
  first,
  ...props
}: AutoLanguageProps & { label?: string; closeLabel?: string; children: InternationalString }) {
  const [isOpen, setIsOpen] = useState(!first);
  const lang = useLocale();

  const text = props.children || {};
  const values = text[lang] || text.en || text.nl || [];

  return (
    <>
      <AutoLanguage {...props} first={!isOpen} />
      {values.length > 1 && label && (
        <button className="underline text-xl" type="button" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? closeLabel || label : label}
        </button>
      )}
    </>
  );
}
