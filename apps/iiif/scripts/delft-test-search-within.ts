import { extract } from "iiif-hss";

extract(
  {
    id: "delft-test-search-within",
    name: "Create canvas search index",
    types: ["Canvas"],
    invalidate: async (_, api) => true,
    search: {
      canvases: {
        emitCombined: false,
        allIndices: false,
        schema: {
          enable_nested_fields: true,
          fields: [
            { name: "id", type: "string" },
            { name: "type", type: "string" },
            // Reference the Manifests collection
            {
              name: "manifest_id",
              type: "string",
              facet: true,
            },
            { name: "canvas_id", type: "string" },
            { name: "canvas_index", type: "int32" },
            {
              name: "textFragments.text",
              type: "string[]",
              index: true,
              optional: true,
            },
          ],
        },
      },
    }, // delft/test-ocr/839007461-alto/Het Huis Bouwkunde_0142_alto.xml
  },
  async (resource, api, config) => {
    if (!(await api.resourceFiles.exists("ocr.json"))) {
      return {};
    }
    if (!api.parentResource || !api.parent) return {};

    const items = api.parent.items || [];
    const foundIndex = items.findIndex(
      (item: any) => item.id === api.resource.id,
    );

    const ocr = await api.resourceFiles.loadJson("ocr.json");
    const canvasHashId = resource.slug.replace("manifests/", "");
    const manifestHashId = api.parentResource.slug.replace("manifests/", "");

    // Everything in this section is to correct the OCR based on the height/width difference. Can be skipped
    // if the data is good.
    const width = api.resource.width;
    const height = api.resource.height;
    const imageWidth = ocr.imageWidth || 1;
    const imageHeight = ocr.imageHeight || 1;
    const wScale = width / imageWidth;
    const hScale = height / imageHeight;
    const scaleToUse = Math.min(wScale, hScale);

    const textFragments = (ocr?.textFragments || []).map((fragment: any) => {
      return {
        ...fragment,
        regions: (fragment.regions || []).map((region: string) => {
          const [x, y, w, h] = region.split(",");
          return [
            ~~(Number(x || 0) * scaleToUse),
            ~~(Number(y || 0) * scaleToUse),
            ~~(Number(w || 0) * scaleToUse),
            ~~(Number(h || 0) * scaleToUse),
          ].join(",");
        }),
      };
    });

    return {
      search: {
        indexes: ["canvases"],
        record: {
          id: btoa(canvasHashId),
          type: "Canvas",
          manifest_id: btoa(manifestHashId),
          canvas_id: api.resource.id,
          canvas_index: foundIndex,
          textFragments: textFragments.length ? textFragments : undefined,
        },
      },
    };
  },
);
