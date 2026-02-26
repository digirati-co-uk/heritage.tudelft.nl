import { describe, expect, test } from "vitest";
import { extractCollectionThumbnail } from "../../src/extract/extract-collection-thumbnail.ts";

describe("extractCollectionThumbnail", () => {
  test("derives collection thumbnail from manifest item thumbnail", async () => {
    const response = await extractCollectionThumbnail.collect?.(
      {
        "manifests/a": {
          type: "Manifest",
          id: "https://example.org/manifests/a",
          thumbnail: { id: "https://example.org/thumbs/a.jpg", type: "Image" },
        },
        "collections/root": {
          type: "Collection",
          id: "https://example.org/collections/root/collection.json",
          slug: "collections/root",
          items: [{ id: "https://example.org/manifests/a", type: "Manifest" }],
        },
      } as any,
      {
        build: {
          makeId: ({ slug }: { slug: string }) => `https://example.org/${slug}/collection.json`,
        },
      } as any,
      {}
    );

    expect(response?.temp["collections/root"]).toEqual({
      thumbnail: { id: "https://example.org/thumbs/a.jpg", type: "Image" },
    });

    const injected = await extractCollectionThumbnail.injectManifest?.(
      { type: "Collection" } as any,
      response?.temp["collections/root"],
      {} as any,
      {}
    );

    expect(injected).toEqual({
      meta: {
        thumbnail: { id: "https://example.org/thumbs/a.jpg", type: "Image" },
      },
    });
  });

  test("derives thumbnails through nested collections", async () => {
    const response = await extractCollectionThumbnail.collect?.(
      {
        "manifests/a": {
          type: "Manifest",
          id: "https://example.org/manifests/a",
          thumbnail: { id: "https://example.org/thumbs/a.jpg" },
        },
        "collections/child": {
          type: "Collection",
          id: "https://example.org/collections/child/collection.json",
          slug: "collections/child",
          items: [{ id: "https://example.org/manifests/a", type: "Manifest" }],
        },
        "collections/root": {
          type: "Collection",
          id: "https://example.org/collections/root/collection.json",
          slug: "collections/root",
          items: [{ id: "https://example.org/collections/child/collection.json", type: "Collection" }],
        },
      } as any,
      {
        build: {
          makeId: ({ slug }: { slug: string }) => `https://example.org/${slug}/collection.json`,
        },
      } as any,
      {}
    );

    expect(response?.temp["collections/child"]).toEqual({
      thumbnail: { id: "https://example.org/thumbs/a.jpg" },
    });
    expect(response?.temp["collections/root"]).toEqual({
      thumbnail: { id: "https://example.org/thumbs/a.jpg" },
    });
  });

  test("does not derive when collection already has thumbnail", async () => {
    const response = await extractCollectionThumbnail.collect?.(
      {
        "manifests/a": {
          type: "Manifest",
          id: "https://example.org/manifests/a",
          thumbnail: { id: "https://example.org/thumbs/a.jpg" },
        },
        "collections/root": {
          type: "Collection",
          id: "https://example.org/collections/root/collection.json",
          slug: "collections/root",
          thumbnail: { id: "https://example.org/thumbs/root.jpg" },
          items: [{ id: "https://example.org/manifests/a", type: "Manifest" }],
        },
      } as any,
      {
        build: {
          makeId: ({ slug }: { slug: string }) => `https://example.org/${slug}/collection.json`,
        },
      } as any,
      {}
    );

    expect(response).toBeUndefined();
  });
});
