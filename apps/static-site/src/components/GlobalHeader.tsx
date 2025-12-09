import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getTranslations } from "next-intl/server";
import { MobileMenu } from "./atoms/MobileMenu";

export async function GlobalHeader() {
  const t = await getTranslations();

  const menu = (
    <>
      <li>
        <Link
          className="uppercase underline-offset-4 hover:underline"
          href="/exhibitions"
        >
          {t("Exhibitions")}
        </Link>
      </li>
      <li>
        <Link
          className="uppercase underline-offset-4 hover:underline"
          href="/collections"
        >
          {t("Collections")}
        </Link>
      </li>
      <li>
        <Link
          className="uppercase underline-offset-4 hover:underline"
          href="/publications"
        >
          {t("Publications")}
        </Link>
      </li>
      <li>
        <Link
          className="uppercase underline-offset-4 hover:underline"
          href="/about"
        >
          {t("About")}
        </Link>
      </li>
      <li>
        <Link className="uppercase" href="/search">
          <div className="transition-background duration-400 flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-white hover:border-white hover:bg-white hover:bg-opacity-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width={24}
              height={24}
            >
              <path d="M0 0h24v24H0V0z" fill="none" />
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                fill="currentColor"
              />
            </svg>
          </div>
        </Link>
      </li>
      <li>
        <LanguageSwitcher />
      </li>
      <li className="hidden md:block">
        <a href="https://www.tudelft.nl/library">
          <svg
            className="-translate-y-1.5"
            viewBox="0 0 105 41"
            xmlns="http://www.w3.org/2000/svg"
            width={81}
            height={32}
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M30.5 36.73c2.62 0 4.03-1.74 4.03-4.18V20.12h5.56v12.71c-.06 5.6-4.53 7.8-9.59 7.8-5.05 0-9.53-2.2-9.58-7.8v-12.7h5.55v12.42c0 2.44 1.42 4.18 4.03 4.18M77.18 33.73v-1.31c0-3.87-2.2-6.6-6.15-6.6-4.41 0-6.47 3.42-6.47 7.52 0 4.12 1.78 7.29 6.25 7.29 3.34 0 5.78-1.59 6.2-4.76h-2.78c-.3 2.03-1.33 2.84-3.39 2.84-2.7 0-3.59-2.4-3.59-4.98h9.93zm-9.87-1.84c.02-2.18 1.34-4.15 3.53-4.15 2.55 0 3.55 1.76 3.55 4.15h-7.08zM80.37 20.12h2.65v20.1h-2.65v-20.1zM6.53 40.21h5.55V24.02h6.22v-3.9H.3v3.9h6.23v16.2M19.87 10.34c-1.35.42-2.75.08-2.75-1.73 0-2.77 6.49-5.09 7.4-7.5.21-.61.23-1.1-.06-1.1-.2.02-.04.32-.5.78-2.69 2.69-7.19 2.68-10.65 4.24-2.26 1.02-8.9 4.15-7.37 11.13.07.33.27 1.44.47 1.44.24 0 .23-.66.23-1.46-.05-4.16 4.86-5.32 6.46-8.04.2-.32.52-.77.6-.56.04.1.01.25-.05.54-.5 2.23-2.83 3.66-2.17 5.26.85 2.07 3.32.53 4.08-.8.2-.37.32-.6.46-.56.1.04.1.46.03.84-.4 2.4-.96 3.75-2.71 5.12-.56.43-1.44.52-1.33.86.03.09.41.08.71.05 4.68-.3 8.59-5.82 9.62-9.43.11-.25.14-.5.03-.58-.14-.1-.35.14-.56.33-.53.47-1.26.96-1.94 1.17M91.29 40.21V28.08h3.22v-1.84h-3.22V24c0-1.62.78-1.9 2.28-1.9.44 0 .89.06 1.33.09v-2.2a8.59 8.59 0 00-1.89-.28c-2.5 0-4.36 1.26-4.36 3.93v2.61h-2.72v1.84h2.72v12.13h2.64M96.03 26.24v1.84h2.38v8.9c0 1.86.03 3.65 3.95 3.65.61 0 1.18-.06 1.8-.17v-2.03c-.42.1-.96.17-1.38.17-.95 0-1.72-.48-1.72-1.48v-9.04h3.22v-1.84h-3.22v-3.8l-2.65.83v2.98h-2.38M48.43 22.51h4.1c4.64 0 6.56 3.5 6.56 7.66 0 4.15-1.92 7.65-6.56 7.65h-4.1v-15.3zm-2.79 17.7h6.9c8.57 0 9.47-7.27 9.47-10.04 0-2.77-.9-10.05-9.48-10.05h-6.89v20.1z"
            ></path>
          </svg>
        </a>
      </li>
    </>
  );

  return (
    <div className="flex justify-center bg-[#1D1F71] font-mono text-white">
      <div className="flex h-16 w-full max-w-screen-xl items-center gap-5 px-5 py-2 md:px-10">
        <MobileMenu>{menu}</MobileMenu>
        <div className="font-mono uppercase max-sm:ml-auto max-sm:mr-auto md:text-base">
          <Link href="/">{t("Academic Heritage")}</Link>
        </div>
        <ul className="ml-auto lg:flex hidden items-center text-xs md:gap-2 md:text-base lg:gap-5">
          {menu}
        </ul>
        <div className="justify-self-end sm:ml-auto lg:hidden">
          <Link className="uppercase" href="/search">
            <div className="transition-background duration-400 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white hover:bg-opacity-20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={24}
                height={24}
              >
                <path d="M0 0h24v24H0V0z" fill="none" />
                <path
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
