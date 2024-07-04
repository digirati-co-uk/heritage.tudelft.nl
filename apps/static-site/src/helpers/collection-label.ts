export function renderCollectionLabel(text: string) {
  const newText = text.replace("collections/", "");

  // replace - with space
  return newText.replace(/-/g, " ");
}
