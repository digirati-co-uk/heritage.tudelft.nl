import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

export const locales = ["en", "nl"] as const;
export const localePrefix = "always"; // Default

export function getObjectSlug(fullSlug: string) {
  return fullSlug.replace("manifests/", "objects/");
}
