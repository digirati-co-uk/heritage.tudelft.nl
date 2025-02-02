import { type HTMLAttributes, type ReactNode, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "../helpers/use-hash-value";
import { useIntersectionRef } from "../helpers/use-intersection-ref";

interface BaseGridSectionProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  children: ReactNode;
  updatesTitle?: boolean;
}

export function BaseGridSection({
  id,
  className,
  children,
  updatesTitle = true,
  ...props
}: BaseGridSectionProps) {
  const [hash, setHash] = useHashValue();
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = `${hash}` === `${id}`;

  useIntersectionRef(ref, (entries) => {
    if (!updatesTitle) return;
    for (const entry of entries) {
      const targetId: string = entry.target.id;
      if (entry.isIntersecting && targetId === id) {
        if (targetId !== "undefined") {
          setHash(targetId);
        }
        break;
      }
    }
  });

  return (
    <section
      id={id}
      ref={ref}
      className={twMerge("scroll-m-8", className)}
      {...props}
    >
      {children}
    </section>
  );
}
