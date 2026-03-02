import { describe, expect, test } from "vitest";
import { resolveHostUrl } from "../../src/util/resolve-host-url";

describe("resolveHostUrl", () => {
  test("forces https for webcontainer hostnames", () => {
    const url = "http://blitz--1234.local.webcontainer.io/iiif/_debug";
    expect(resolveHostUrl(url)).toBe("https://blitz--1234.local.webcontainer.io/iiif/_debug");
  });

  test("keeps localhost protocol unchanged", () => {
    const url = "http://localhost:4321/iiif/_debug";
    expect(resolveHostUrl(url)).toBe("http://localhost:4321/iiif/_debug");
  });

  test("returns original string when URL parsing fails", () => {
    expect(resolveHostUrl("/relative/path")).toBe("/relative/path");
  });
});
