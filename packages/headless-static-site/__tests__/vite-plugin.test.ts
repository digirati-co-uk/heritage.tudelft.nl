import { beforeEach, describe, expect, test, vi } from "vitest";

const cachedBuildMock = vi.fn(async () => ({}));
const requestMock = vi.fn(async () => new Response(null));
const createServerMock = vi.fn(async () => ({
  _extra: {
    cachedBuild: cachedBuildMock,
    app: { fetch: vi.fn() },
  },
  request: requestMock,
}));

vi.mock("../src/create-server", () => ({
  createServer: (...args: any[]) => createServerMock(...args),
}));

describe("vite plugin lifecycle", () => {
  beforeEach(() => {
    cachedBuildMock.mockClear();
    requestMock.mockClear();
    createServerMock.mockClear();
  });

  test("runs build hook safely in build mode without starting watch", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "build",
      mode: "production",
    } as any);

    await plugin.buildStart?.call({} as any);

    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(cachedBuildMock).toHaveBeenCalledTimes(1);
    expect(cachedBuildMock).toHaveBeenCalledWith({ cache: false, emit: true });
    expect(requestMock).not.toHaveBeenCalledWith("/watch");
  });

  test("skips build work when vite command is serve", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      enabled: true,
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "serve",
      mode: "development",
    } as any);

    await plugin.buildStart?.call({} as any);

    expect(createServerMock).not.toHaveBeenCalled();
    expect(cachedBuildMock).not.toHaveBeenCalled();
  });

  test("is disabled by default in vitest environment", async () => {
    const { iiifPlugin } = await import("../src/vite-plugin");
    const plugin = iiifPlugin({
      config: {
        stores: {
          local: {
            type: "iiif-remote",
            url: "https://example.org/iiif/collection.json",
          },
        },
      },
    });

    await plugin.configResolved?.({
      command: "build",
      mode: "test",
    } as any);

    await plugin.buildStart?.call({} as any);

    expect(createServerMock).not.toHaveBeenCalled();
    expect(cachedBuildMock).not.toHaveBeenCalled();
  });
});
