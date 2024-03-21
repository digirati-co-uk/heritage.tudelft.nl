import { InternationalString } from "@iiif/presentation-3";
import { useLocale } from "next-intl";

export function AutoLanguage({
  className,
  children,
  lines,
  html,
  first = false,
  mapString: m = (text) => text,
}: {
  html?: boolean;
  lines?: boolean;
  className?: string;
  first?: boolean;
  children: InternationalString | string | null | undefined;
  mapString?: (text: string) => string;
}) {
  const locale = useLocale();
  if (!children) {
    return null;
  }
  if (typeof children === "string") {
    if (html) {
      return <span className={className} dangerouslySetInnerHTML={{ __html: m(children) }} />;
    }
    if (className) {
      return <span className={className}>{m(children)}</span>;
    }
    return <>{m(children)}</>;
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

  if (first && value && value[0]) {
    value = [value[0] || ""];
  }

  if (value) {
    const filtered = value.filter(Boolean);
    if (filtered.length > 0) {
      if (lines) {
        return (
          <>
            {filtered.map((line) =>
              html ? (
                <p className={className} dangerouslySetInnerHTML={{ __html: m(line) }} />
              ) : (
                <p className={className}>{m(line)}</p>
              )
            )}
          </>
        );
      }
      if (html) {
        return <span className={className} dangerouslySetInnerHTML={{ __html: m(filtered.join(" ")) }} />;
      }
      if (className) {
        return <span className={className}>{m(filtered.join(" "))}</span>;
      }
      return <>{m(filtered.join(" "))}</>;
    }
  }

  return null;
}
