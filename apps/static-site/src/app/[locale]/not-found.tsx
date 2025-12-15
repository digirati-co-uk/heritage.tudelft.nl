import { useTranslations } from "next-intl";
import { foundersGrotesk, foundersGroteskMono } from "./layout";

export default function NotFoundPage() {
  const t = useTranslations();
  return (
    <div
      className={`bg-gray-200 ${foundersGrotesk.variable} ${foundersGroteskMono.variable} font-sans flex flex-col w-full`}
    >
      <main className="flex w-full flex-col items-center grow">
        <div className="w-full xl:min-h-[60vh] max-w-screen-xl px-5 py-10 lg:px-10 flex flex-col gap-2 prose md:prose-xl">
          <h2>{t("Not found")} (404)</h2>
          <span>{t("The page you requested has not been found")}.</span>
          <span>
            {t("Please use the navigation above to browse or search the site")}.
          </span>
          <span>
            <a href="" className="underline">
              {t("Retry this page")}.
            </a>
          </span>
        </div>
      </main>
    </div>
  );
}
