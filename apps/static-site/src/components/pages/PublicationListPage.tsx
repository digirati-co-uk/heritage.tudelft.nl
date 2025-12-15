import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import type { Publication } from "contentlayer/generated";
import { slug } from "github-slugger";
import { revalidatePath } from "next/cache";
import { Box } from "../blocks/Box";
import { NewArticle } from "../blocks/NewArticle";

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
    {} as Record<string, Record<string, Publication>>,
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
        {process.env.NODE_ENV === "development" && (
          <NewArticle
            onCreate={async (data) => {
              "use server";

              const titleSlug = slug(data.title);
              const filePath = join(cwd(), "content/publications", props.locale, `${titleSlug}.mdx`);
              if (existsSync(filePath)) {
                return titleSlug;
              }
              let markdown = "---\n";
              markdown += `date: ${new Date().toISOString().split("T")[0]}\n`;
              markdown += `title: ${data.title}\n`;
              markdown += "---\n";
              markdown += `# ${data.title}`;

              await writeFile(filePath, markdown);
              revalidatePath("/[locale]/publications");
              return titleSlug;
            }}
          />
        )}
        {publications.map((_publication) => {
          const publication = articleMap[_publication.id]?.[props.locale] || _publication;
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
