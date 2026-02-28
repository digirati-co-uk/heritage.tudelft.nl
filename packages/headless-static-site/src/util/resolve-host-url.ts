import { HostURL } from "@webcontainer/env";

function isWebContainerHostname(hostname: string) {
  return hostname === "webcontainer.io" || hostname.endsWith(".webcontainer.io");
}

export function resolveHostUrl(url: string) {
  try {
    const parsed = HostURL.parse(url).toString();
    const asUrl = new URL(parsed);
    if (asUrl.protocol === "http:" && isWebContainerHostname(asUrl.hostname)) {
      asUrl.protocol = "https:";
      return asUrl.toString();
    }
    return parsed;
  } catch {
    return url;
  }
}
