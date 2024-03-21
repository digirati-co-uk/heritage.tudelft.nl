import { getTranslations } from "next-intl/server";
import { ReactNode, Suspense } from "react";
import { SocialIcon } from "react-social-icons";
import "react-social-icons/twitter";

export async function Page(props: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <>
      <div className="min-h-[90vh] w-full max-w-screen-xl px-5 lg:px-10">
        <Suspense fallback="Loading...">{props.children}</Suspense>
      </div>
    </>
  );
}
