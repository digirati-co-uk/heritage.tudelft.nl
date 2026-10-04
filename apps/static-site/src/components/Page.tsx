import type { Collection, InternationalString } from "@iiif/presentation-3";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import "react-social-icons/twitter";
import { twMerge } from "tailwind-merge";
import { CollectionBreadcrumbs } from "./iiif/CollectionBreadcrumbs";

export async function Page(props: {
  children: ReactNode;
  className?: string;
  breadcrumbs?: Collection["partOf"];
  current?: InternationalString;
  background?: string;
}) {
  const t = await getTranslations();
  return (
    <>
      {props.breadcrumbs && <CollectionBreadcrumbs partOf={props.breadcrumbs} current={props.current} />}
      <div
        className={twMerge("min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10", props.className ?? "")}
        style={{ "--card-color": props.background || "#F3CE49" } as any}
      >
        <Suspense fallback="Loading...">{props.children}</Suspense>
      </div>
    </>
  );
}
