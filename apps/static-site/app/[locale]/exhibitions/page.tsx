import { getExhibitions } from "@/iiif";
import { Link } from "@/navigation";
import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";

export default async function ExhibitionsPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  const exhibitions = await getExhibitions();
  return (
    <Page>
      <h1>Exhibitions</h1>
      {exhibitions.items.map((manifest: any) => {
        const slug = manifest["hss:slug"].replace("manifests/", "exhibitions/");
        return (
          <div className="mb-4">
            <h3>{manifest.label.en[0]}</h3>
            <Link href={slug}>View</Link>
          </div>
        );
      })}
    </Page>
  );
}
