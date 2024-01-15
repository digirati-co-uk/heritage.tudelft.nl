import { InternationalString } from "@iiif/presentation-3";
import { useLocale } from "next-intl";

export function AutoLanguage({
  className,
  children,
  lines,
}: {
  lines?: boolean;
  className?: string;
  children: InternationalString | string | null | undefined;
}) {
  const locale = useLocale();
  if (!children) {
    return null;
  }
  if (typeof children === "string") {
    return <>{children}</>;
  }

  let value = children[locale];

  if (!value) {
    const fallback = Object.keys(children)[0];
    if (fallback) {
      value = children[fallback];
    }
  }

  if (value) {
    const filtered = value.filter(Boolean);
    if (filtered.length > 0) {
      if (lines) {
        return (
          <>
            {filtered.map((line) => (
              <p className={className}>{line}</p>
            ))}
          </>
        );
      }
      return <>{filtered.join(" ")}</>;
    }
  }

  return null;
}
