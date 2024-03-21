"use client";

import { Link, usePathname } from "@/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher({ oldStyle }: { oldStyle?: boolean }) {
  const pathname = usePathname();
  const locale = useLocale();

  const ac = "opacity-100 group-hover:opacity-50";
  const ic = "opacity-50 group-hover:opacity-100";

  if (!oldStyle) {
    return (
      <Link
        className="group flex h-10 w-10 items-center justify-center rounded-full border border-white "
        href={pathname}
        locale={locale === "en" ? "nl" : "en"}
      >
        <svg viewBox="0 0 40 45" xmlns="http://www.w3.org/2000/svg" width={22} height={22}>
          <path
            className={locale === "nl" ? ac : ic}
            fill="#FFF"
            d="M4.252 19.332V.004h3.797l7.91 12.907V.004h3.625v19.327h-3.916L7.877 6.728v12.604H4.252zm19.564 0V.163h3.902v15.913h9.703v3.256H23.816z"
          />
          <path
            className={locale === "en" ? ac : ic}
            fill="#FFF"
            d="M3.21 44.938V25.611h14.331v3.27H7.112v4.285h9.703v3.256H7.112v5.26H17.91v3.257H3.21zm18.048 0V25.611h3.797l7.91 12.906V25.611h3.625v19.327h-3.914l-7.792-12.604v12.604h-3.626z"
          />
        </svg>
      </Link>
    );
  }

  return (
    <div>
      <ul className="flex gap-2">
        <li>
          <Link className={locale === "en" ? "text-white" : "text-gray-400"} href={pathname} locale="en">
            EN
          </Link>
        </li>
        <li>
          <Link href={pathname} className={locale === "nl" ? "text-white" : "text-gray-400"} locale="nl">
            NL
          </Link>
        </li>
      </ul>
    </div>
  );
}
