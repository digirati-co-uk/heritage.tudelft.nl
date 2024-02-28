import { InternationalString } from "@iiif/presentation-3";
import { useLocale } from "next-intl";

export function AutoLanguage({
  className,
  children,
  lines,
  html,
}: {
  html?: boolean;
  lines?: boolean;
  className?: string;
  children: InternationalString | string | null | undefined;
}) {
  const locale = useLocale();
  if (!children) {
    return null;
  }
  if (typeof children === "string") {
    if (html) {
      return <span dangerouslySetInnerHTML={{ __html: children }} />;
    }
    return <>{children}</>;
  }

  let value = children[locale];

  if (!value || value[0] === "") {
    for (const fallback of Object.keys(children)) {
      if (fallback && fallback[0] !== "") {
        value = children[fallback];
      }
    }
  }

  if (typeof value === "string") {
    value = [value];
  }

  if (value) {
    const filtered = value.filter(Boolean);
    if (filtered.length > 0) {
      if (lines) {
        return (
          <>
            {filtered.map((line) =>
              html ? (
                <p className={className} dangerouslySetInnerHTML={{ __html: line }} />
              ) : (
                <p className={className}>{line}</p>
              )
            )}
          </>
        );
      }
      if (html) {
        return <span className={className} dangerouslySetInnerHTML={{ __html: filtered.join(" ") }} />;
      }
      return <>{filtered.join(" ")}</>;
    }
  }

  return null;
}
