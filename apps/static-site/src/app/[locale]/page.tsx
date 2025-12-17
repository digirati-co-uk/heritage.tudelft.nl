import { Slot } from "@/blocks/slot";
import { Page } from "@/components/Page";
import { Box } from "@/components/blocks/Box";
import { setRequestLocale } from "next-intl/server";

export default async function Homepage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Page>
      <Slot context={{ locale }} name="homepage" />
    </Page>
  );
}
