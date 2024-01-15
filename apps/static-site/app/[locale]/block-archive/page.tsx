import { redirect } from "next/navigation";
import { BlockArchive } from "../../../blocks/block-archive";
import { unstable_setRequestLocale } from "next-intl/server";

export default function Page({
  params,
}: {
  params: { locale: string };
}): JSX.Element {
  unstable_setRequestLocale(params.locale);

  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  return (
    <div>
      <BlockArchive />
    </div>
  );
}
