import { GlobalHeader } from "@/components/GlobalHeader";
import { NextIntlClientProvider, useMessages } from "next-intl";

export default function NotFound() {
  return (
    <NextIntlClientProvider>
      <GlobalHeader />
    </NextIntlClientProvider>
  );
}
