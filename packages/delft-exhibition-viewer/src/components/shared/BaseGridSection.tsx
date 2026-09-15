import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { useIntersectionObserver } from "usehooks-ts";
import { getCanvasNavigationId } from "@/helpers/canvas-navigation";
import { useHashValue } from "@/helpers/use-hash-value";

interface BaseGridSectionProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  children: ReactNode;
  updatesTitle?: boolean;
  enabled?: boolean;
}

export function BaseGridSection({
  id,
  className,
  children,
  updatesTitle = true,
  enabled = true,
  ...props
}: BaseGridSectionProps) {
  const [, setHash] = useHashValue();
  const numericId = Number(id);
  const navigationId = id.startsWith("s") || Number.isNaN(numericId) ? id : getCanvasNavigationId(numericId);

  const [ref, entry] = useIntersectionObserver({
    threshold: 0.75,
    root: null,
    rootMargin: "0px",
    onChange: (isIntersecting) => {
      if (enabled && updatesTitle && isIntersecting) {
        setHash(navigationId);
      }
    },
  });

  return (
    <section
      data-visible={entry}
      id={navigationId}
      ref={ref}
      data-step-id={id}
      className={`scroll-m-8 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
