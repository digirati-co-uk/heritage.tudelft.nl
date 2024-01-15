import { Page } from "@/components/Page";
import { Box } from "@/components/blocks/Box";
import { unstable_setRequestLocale } from "next-intl/server";
import { Slot } from "@/blocks/slot";

export default function Homepage({
  params,
}: {
  params: { locale: string };
}): JSX.Element {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <h1 className="text-3xl font-bold underline">TUDelft</h1>

      <div className="grid grid-cols-3">
        <Box
          link="/exhibitions/irrigation-knowledge"
          title="Irrigation Knowledge"
          type="exhibition"
          backgroundColor="bg-purple-400"
          backgroundImage="https://dlc.services/thumbs/7/21/17da5645-e7b1-8870-1de4-ac34fa58420a/full/full/0/default.jpg"
        />
        <Box
          link="/objects/pekalen"
          title="Pekalenwerken"
          type="object"
          backgroundImage="https://dlc.services/thumbs/7/6/d4f5810d-967c-4f52-85ee-7b919feadfd6/full/full/0/default.jpg"
          backgroundColor="bg-orange-400"
        />
        <Box
          link="/publications/test-publication"
          title="The SharedHistory of TU Delft and Bandung Institute of Technology"
          type="article"
          dark
          subtitle="Abel Streefland"
        />
      </div>

      <Slot
        className="grid grid-cols-3"
        context={{ locale: params.locale }}
        name="homepage"
      />
    </Page>
  );
}
