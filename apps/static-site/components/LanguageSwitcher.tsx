"use client";

import { Link, usePathname } from "@/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();
  return (
    <div>
      <ul className="flex gap-2">
        <li>
          <Link
            className={locale === "en" ? "text-white" : "text-gray-400"}
            href={pathname}
            locale="en"
          >
            EN
          </Link>
        </li>
        <li>
          <Link
            href={pathname}
            className={locale === "nl" ? "text-white" : "text-gray-400"}
            locale="nl"
          >
            NL
          </Link>
        </li>
      </ul>
    </div>
  );
}
