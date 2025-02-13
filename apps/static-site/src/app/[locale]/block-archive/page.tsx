import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { BlockArchive } from "../../../blocks/block-archive";

export default function Page({ params }: { params: { locale: string } }): JSX.Element {
  setRequestLocale(params.locale);

  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  return (
    <div>
      <BlockArchive />
    </div>
  );
}
