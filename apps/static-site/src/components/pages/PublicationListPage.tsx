import { Publication } from "contentlayer/generated";
import { getTranslations } from "next-intl/server";
import { Box } from "../blocks/Box";

export interface PublicationListPageProps {
  publications: Publication[];
}

export async function PublicationListPage(props: PublicationListPageProps) {
  const t = await getTranslations();
  return (
    <div className="mb-8 grid-cols-1 gap-0.5 md:grid md:grid-cols-3">
      {props.publications.map((publication) => (
        <div key={publication._id}>
          <Box
            key={publication._id}
            link={`/publications/${publication.id}`}
            dark
            type={publication.date as any}
            title={publication.title}
            subtitle={publication.author}
          />
        </div>
      ))}
    </div>
  );
}
