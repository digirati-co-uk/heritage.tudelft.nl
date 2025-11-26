import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from './routing';
import { hasLocale } from "next-intl";


// Can be imported from a shared config
const locales = ["en", "nl"];

export default getRequestConfig(async ({ requestLocale }) => {

  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`../../translations/${locale}.json`)).default,
  };
});
