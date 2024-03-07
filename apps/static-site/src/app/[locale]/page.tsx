import { Page } from "@/components/Page";
import { Box } from "@/components/blocks/Box";
import { unstable_setRequestLocale } from "next-intl/server";
import { Slot } from "@/blocks/slot";

export default function Homepage({ params }: { params: { locale: string } }): JSX.Element {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <h1 className="my-8 text-4xl font-bold">TUDelft</h1>

      <Slot className="md:grid-col-1 grid grid-cols-3 gap-0.5" context={{ locale: params.locale }} name="homepage" />
    </Page>
  );
}
