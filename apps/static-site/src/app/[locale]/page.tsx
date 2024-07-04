import { Page } from "@/components/Page";
import { Box } from "@/components/blocks/Box";
import { unstable_setRequestLocale } from "next-intl/server";
import { Slot } from "@/blocks/slot";

export default function Homepage({ params }: { params: { locale: string } }): JSX.Element {
  unstable_setRequestLocale(params.locale);
  return (
    <Page>
      <Slot
        context={{ locale: params.locale }}
        name="homepage"
      />
    </Page>
  );
}
