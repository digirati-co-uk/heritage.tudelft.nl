import { Slot } from "@/blocks/slot";
import { Page } from "@/components/Page";
import { Box } from "@/components/blocks/Box";
import { setRequestLocale } from "next-intl/server";

export default function Homepage({ params }: { params: { locale: string } }): JSX.Element {
  setRequestLocale(params.locale);
  return (
    <Page>
      <Slot context={{ locale: params.locale }} name="homepage" />
    </Page>
  );
}
