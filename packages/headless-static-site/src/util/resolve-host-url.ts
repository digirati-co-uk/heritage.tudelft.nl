import { HostURL } from "@webcontainer/env";

export function resolveHostUrl(url: string) {
  try {
    return HostURL.parse(url).href;
  } catch {
    return url;
  }
}
