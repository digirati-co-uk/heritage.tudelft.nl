import { SearchPage } from "@/components/pages/SearchPage";
import { Page } from "@/components/Page";
import { unstable_setRequestLocale } from "next-intl/server";

export default async function Search({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);

  return (
    <Page>
      <SearchPage />
    </Page>
  );
}
