import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// Can be imported from a shared config
const locales = ["en", "nl"];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`../translations/${locale}.json`)).default,
  };
});
