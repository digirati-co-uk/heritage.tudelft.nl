import type { InternationalString } from "@iiif/presentation-3";
import { useParams } from "next/navigation";

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
  const locale = useParams().locale as string;
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
    const filtered = value.filter(Boolean) as string[];
    if (filtered.length > 0) {
      if (lines) {
        return (
          <>
            {filtered.map((line, n) =>
              html ? (
                <div key={`line-${n}`} className={className} dangerouslySetInnerHTML={{ __html: m(line) }} />
              ) : (
                <div key={`line-${n}`} className={className}>
                  {m(line)}
                </div>
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
