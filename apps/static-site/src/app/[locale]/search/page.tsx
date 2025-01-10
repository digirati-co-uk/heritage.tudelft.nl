import { Page } from "@/components/Page";
import { SearchPage } from "@/components/pages/SearchPage";
import { setRequestLocale } from "next-intl/server";

export default async function Search({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  return (
    <Page>
      <SearchPage />
    </Page>
  );
}
