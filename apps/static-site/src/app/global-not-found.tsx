import { GlobalFooter } from "@/components/GlobalFooter";
import { GlobalHeader } from "@/components/GlobalHeader";
import { NextIntlClientProvider, useMessages } from "next-intl";
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

export default function GlobalNotFound() {
  return (
    <html>
      <body>
        <NextIntlClientProvider>
          <div
            className={`${foundersGrotesk.variable} ${foundersGroteskMono.variable}`}
          >
            <GlobalHeader />
            <div>404 page oops</div>
            <GlobalFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
