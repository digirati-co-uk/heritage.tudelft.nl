export function getSlugFromRelativeUrl(url: string) {
  if (url.startsWith("http")) {
    return null;
  }

  if (!url.endsWith("/manifest.json")) {
    return null;
  }

  const urlWithoutExt = url.substring(0, url.length - "/manifest.json".length);

  // we need manifests/abc-123
  if (urlWithoutExt.startsWith("/")) {
    return urlWithoutExt.slice(1);
  }
  return urlWithoutExt;
}
