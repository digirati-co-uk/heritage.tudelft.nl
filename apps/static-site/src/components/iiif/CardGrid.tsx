import type { ReactNode } from "react";

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">{children}</div>
  );
}
