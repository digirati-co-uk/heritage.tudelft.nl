import "../globals.css";
import { SlotContext } from "@/blocks/slot-context";
import { GlobalFooter } from "@/components/GlobalFooter";
import { GlobalHeader } from "@/components/GlobalHeader";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { type ReactNode, lazy } from "react";
import BlockEditor from "../../blocks/block-editor";
import { Provider } from "../provider";
import { getTranslations } from "next-intl/server";
import { getBasicMetadata, getMdx } from "@/helpers/metadata";

const IIIFDevRefresh = lazy(() => import("../../components/IIIFDevRefresh"));

export const metadata: Metadata = {
  title: "TU Delft Academic Heritage",
  description: "TU Delft Library's Special Collections portal",
};

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const path = "/";
  const page = getMdx({ params: { pageName: "Home", path: path, locale: params.locale } });
  const description = page.description;
  return getBasicMetadata({
    locale: params.locale,
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
}

const foundersGrotesk = localFont({
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

const foundersGroteskMono = localFont({
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

export default function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}): JSX.Element {
  setRequestLocale(params.locale);
  return (
    <html lang={params.locale}>
      <body className={`bg-gray-200 ${foundersGrotesk.variable} ${foundersGroteskMono.variable} font-sans`}>
        <Provider>
          <SlotContext name="locale" value={params.locale}>
            <GlobalHeader />
            <main className="flex w-full flex-col items-center">{children}</main>
            {process.env.NODE_ENV !== "production" ? (
              <>
                <BlockEditor showToggle rsc />
                <IIIFDevRefresh />
              </>
            ) : null}
            <GlobalFooter />
          </SlotContext>
        </Provider>
      </body>
    </html>
  );
}
