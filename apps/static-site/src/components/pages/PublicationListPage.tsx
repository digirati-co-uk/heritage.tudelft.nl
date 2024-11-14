import { Publication } from "contentlayer/generated";
import { getTranslations } from "next-intl/server";
import { Box } from "../blocks/Box";

export interface PublicationListPageProps {
  publications: Publication[];
  locale: string;
}

export async function PublicationListPage(props: PublicationListPageProps) {
  // Sort by date
  const sortedByDate = props.publications.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Group by id and language
  const articleMap = props.publications.reduce(
    (state, next) => {
      if (!state[next.id]) {
        state[next.id] = {};
      }
      state[next.id]![next.lang] = next;
      return state;
    },
    {} as Record<string, Record<string, Publication>>
  );

  // Remove duplicates
  const uniqueIds = new Set<string>();
  const publications = sortedByDate.filter((t) => {
    if (uniqueIds.has(t.id)) {
      return false;
    }
    uniqueIds.add(t.id);
    return true;
  });

  return (
    <>
      <div className="mb-8 grid-cols-1 md:grid md:grid-cols-3">
        {publications.map((_publication) => {
          const publication = (articleMap[_publication.id] || {})[props.locale] || _publication;
          return (
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
          );
        })}
      </div>
    </>
  );
}
