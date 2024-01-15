import { Page } from "@/components/Page";
import { Slot } from "@/blocks/slot";
import { unstable_setRequestLocale } from "next-intl/server";

export default function Collections(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  return (
    <Page>
      <h1 className="text-4xl font-bold my-5">Digital Collections</h1>

      <Slot name="main-collections" context={{ locale: props.params.locale }} />
    </Page>
  );
}
