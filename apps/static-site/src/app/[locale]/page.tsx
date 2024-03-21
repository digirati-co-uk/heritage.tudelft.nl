import { Page } from "@/components/Page";
import { Box } from "@/components/blocks/Box";
import { unstable_setRequestLocale } from "next-intl/server";
import { Slot } from "@/blocks/slot";

export default function Homepage({ params }: { params: { locale: string } }): JSX.Element {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <h1 className="my-8 text-4xl font-bold">TUDelft</h1>

      <Slot
        className="pb-grid-slot grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3"
        context={{ locale: params.locale }}
        name="homepage"
      />
    </Page>
  );
}
