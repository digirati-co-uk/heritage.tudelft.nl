import { createSharedPathnamesNavigation } from "next-intl/navigation";

export const locales = ["en", "nl"] as const;
export const localePrefix = "always"; // Default

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({ locales, localePrefix });

export function getObjectSlug(fullSlug: string) {
  return fullSlug.replace("manifests/", "objects/");
}
