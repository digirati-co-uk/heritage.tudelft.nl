import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { useIntersectionObserver } from "usehooks-ts";
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

  const [ref, entry] = useIntersectionObserver({
    threshold: 0.75,
    root: null,
    rootMargin: "0px",
    onChange: (isIntersecting) => {
      if (isIntersecting) {
        setHash(`s${id}`);
      }
    },
  });

  return (
    <section
      data-visible={entry}
      id={`s${id}`}
      ref={ref}
      data-step-id={id}
      className={`scroll-m-8 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
