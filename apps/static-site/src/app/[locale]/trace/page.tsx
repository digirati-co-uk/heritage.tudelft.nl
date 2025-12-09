import { TracePage } from "@/components/pages/TracePage";
import { IIIF_URL } from "@/iiif";
import { redirect } from "next/navigation";

export default async function Trace() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  const data = await fetch(`${IIIF_URL}trace.json`).then((res) => res.json());

  return <TracePage trace={data} />;
}
