import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import "react-social-icons/twitter";
import { twMerge } from "tailwind-merge";

export async function Page(props: { children: ReactNode; className?: string }) {
  const t = await getTranslations();

  return (
    <>
      <div className={twMerge("min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10", props.className ?? "")}>
        <Suspense fallback="Loading...">{props.children}</Suspense>
      </div>
    </>
  );
}
