import { Collection } from "@iiif/presentation-3";
import { Box } from "../blocks/Box";
import { AutoLanguage } from "./AutoLanguage";

export async function ExhibitionListing({ exhibitions }: { exhibitions: Collection["items"] }) {
  return (
    <div className="mb-8 grid-cols-1 gap-2 md:grid md:grid-cols-3">
      {exhibitions.map((exhibition) => {
        const slug = exhibition["hss:slug"].replace("manifests/", "exhibitions/");
        return (
          <Box
            key={slug}
            link={slug}
            dark
            title={(<AutoLanguage>{exhibition.label}</AutoLanguage>) as any as string}
            type="exhibition"
          />
        );
      })}
    </div>
  );
}
