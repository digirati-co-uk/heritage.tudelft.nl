import "exhibition-viewer/lib";
import "../globals.css";

import { SlotContext } from "@/blocks/slot-context";
import { GlobalFooter } from "@/components/GlobalFooter";
import { GlobalHeader } from "@/components/GlobalHeader";
import { getBasicMetadata, getMdx } from "@/helpers/metadata";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import localFont from "next/font/local";
import { type ReactNode, lazy } from "react";
import BlockEditor from "../../blocks/block-editor";
import { Provider } from "../provider";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { hasLocale, NextIntlClientProvider } from "next-intl";

const IIIFDevRefresh = lazy(() => import("../../components/IIIFDevRefresh"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const path = "/";
  const page = getMdx({
    params: { pageName: "Home", path: path, locale: locale },
  });
  const description = page.description;
  return getBasicMetadata({
    locale: locale,
    siteName: page.title,
    title: page.title,
    description: description,
    image: {
      url: page.image,
      width: page.imageWidth,
      height: page.imageHeight,
    },
    path: path,
  });
}

if (process.env.NODE_ENV !== "production") {
  // @ts-expect-error typescript can't resolve CSS
  import("@page-blocks/react-editor/dist/index.css");
  // @ts-expect-error typescript can't resolve CSS
  import("@page-blocks/react/dist/index.css");
  // @ts-expect-error typescript can't resolve CSS
  import("@page-blocks/web-components/dist/index.css");
  // // @ts-expect-error typescript can't resolve CSS
  // import("exhibition-viewer/dist/index.css");
}

export const foundersGrotesk = localFont({
  variable: "--f-font",
  preload: true,
  src: [
    {
      path: "../fonts/founders-grotesk-web-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/founders-grotesk-web-medium-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/founders-grotesk-web-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/founders-grotesk-web-regular-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
});

export const foundersGroteskMono = localFont({
  variable: "--f-mono-font",
  preload: true,
  src: [
    {
      path: "../fonts/founders-grotesk-mono-web-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/founders-grotesk-mono-web-medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
});

export async function generateStaticParams() {
  return [{ locale: "nl" }, { locale: "en" }];
}

const devClass = process.env.NODE_ENV === "development" ? "dev" : "";

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`bg-gray-200 ${foundersGrotesk.variable} ${foundersGroteskMono.variable} font-sans ${devClass}`}
      >
        <Provider>
          <NextIntlClientProvider locale={locale}>
            <SlotContext name="locale" value={locale}>
              <GlobalHeader />
              <main className="flex w-full flex-col items-center">
                {children}
              </main>
              {process.env.NODE_ENV !== "production" ? (
                <>
                  <BlockEditor showToggle rsc />
                  <IIIFDevRefresh />
                </>
              ) : null}
              <GlobalFooter />
            </SlotContext>
          </NextIntlClientProvider>
        </Provider>
      </body>
    </html>
  );
}
