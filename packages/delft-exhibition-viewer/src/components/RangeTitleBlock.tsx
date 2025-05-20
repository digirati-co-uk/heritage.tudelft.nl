import type { InternationalString } from "@iiif/presentation-3";
import { useRef } from "react";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "../helpers/use-hash-value";
import { useIntersectionRef } from "../helpers/use-intersection-ref";

export function RangeTitleBlock({
  id,
  label,
}: {
  id: string;
  label: InternationalString;
}) {
  const [hash, setHash] = useHashValue();
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = hash === id;

  useIntersectionRef(ref, (entries) => {
    for (const entry of entries) {
      const targetId: string = entry.target.id;
      if (entry.isIntersecting && targetId === id) {
        setHash(`s${targetId}`);
        break;
      }
    }
  });

  return (
    <div
      className={twMerge(
        "col-span-12 w-full px-5 pb-8 text-black",
        isVisible ? "text-black" : "text-black/50",
      )}
      ref={ref}
      id={id}
    >
      <div className="flex flex-row justify-between">
        <h2 className="text-4xl font-light">
          <LocaleString>{label}</LocaleString>
        </h2>
      </div>
    </div>
  );
}
