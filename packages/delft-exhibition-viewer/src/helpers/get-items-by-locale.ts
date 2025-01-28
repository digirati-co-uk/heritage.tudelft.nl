export function getItemsByLocale<T extends { text: any }>(
  items: T[],
  locale: string,
): T[] {
  if (items.length === 1) return items;
  const found = items.filter((t) => Object.keys(t.text).includes(locale));
  if (found.length) {
    return found;
  }
  const firstLang = Object.keys(items[0]?.text || {})[0];
  if (firstLang) {
    return items.filter((t) => Object.keys(t.text).includes(firstLang));
  }

  return items;
}
