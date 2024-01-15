import { Publication } from "contentlayer/generated";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export interface PublicationListPageProps {
  publications: Publication[];
}

export async function PublicationListPage(props: PublicationListPageProps) {
  const t = await getTranslations();
  return (
    <div className="max-w-screen-xl w-full px-10">
      <h1 className="text-3xl font-bold underline">{t("Publications")}</h1>
      <div>
        {props.publications.map((publication) => (
          <div key={publication._id}>
            <h2 className="text-2xl font-bold">{publication.title}</h2>
            <Link href={`/${publication.lang}/publications/${publication.id}`}>
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
