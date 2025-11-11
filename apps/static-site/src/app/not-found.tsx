import { GlobalFooter } from "@/components/GlobalFooter";
import { GlobalHeader } from "@/components/GlobalHeader";
import {
  NextIntlClientProvider,
  useMessages,
  useTranslations,
} from "next-intl";
import "./globals.css";
import localFont from "next/font/local";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Found",
  description: "The page you are looking for does not exist.",
};

const foundersGrotesk = localFont({
  variable: "--f-font",
  preload: true,
  src: [
    {
      path: "./fonts/founders-grotesk-web-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/founders-grotesk-web-medium-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/founders-grotesk-web-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/founders-grotesk-web-regular-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
});

const foundersGroteskMono = localFont({
  variable: "--f-mono-font",
  preload: true,
  src: [
    {
      path: "./fonts/founders-grotesk-mono-web-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/founders-grotesk-mono-web-medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
});

export default async function GlobalNotFound() {
  //const t = useTranslations();
  const t = (arg: string) => arg;
  return (
    <html lang="en">
      <body>
        <div
          className={`bg-gray-200 ${foundersGrotesk.variable} ${foundersGroteskMono.variable} font-sans flex flex-col max-h-[100vh] min-h-[100vh] justify-between`}
        >
          <GlobalHeader />
          <main className="flex w-full flex-col items-center grow">
            <div className="w-full max-w-screen-xl px-5 py-10 lg:px-10 flex flex-col gap-2 prose md:prose-xl">
              <h2>{t("Not found")} (404)</h2>
              <span>{t("The page you requested has not been found")}.</span>
              <span>
                {t(
                  "Please use the navigation above to browse or search the site",
                )}
                .
              </span>
              <span>
                <a href="" className="underline">
                  {t("Reload this page")}.
                </a>
              </span>
            </div>
          </main>
          <div>
            <GlobalFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
