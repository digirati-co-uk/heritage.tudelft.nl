import { typesenseServerConfig } from "@/search";
import type { SearchServiceSearchResponse } from "@iiif/presentation-3";
import { type NextRequest, NextResponse } from "next/server";
import { cache } from "react";
import Typesense from "typesense";

const getClient = cache(() => new Typesense.Client(typesenseServerConfig));

interface SearchResult {
  canvas_id: string;
  canvas_index: number;
  id: string;
  manifest_id: string;
  textFragments: {
    confidence: number;
    group: string;
    regions: string[];
    text: string;
  }[];
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("Origin");
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}

export const GET = async (
  _req: NextRequest,
  ctx: RouteContext<"/api/search/[manifest]">,
) => {
  const origin = _req.headers.get("Origin");
  const { manifest } = await ctx.params;
  const q = _req.nextUrl.searchParams.get("q");

  const manifestSanitised = manifest.replace(/[^a-zA-Z0-9]/g, "");

  const client = getClient();

  const response = await client
    .collections<SearchResult>("canvases")
    .documents()
    //
    .search({
      q: q || "",
      facet_by: "manifest_id",
      filter_by: `manifest_id:=[\`${btoa(manifestSanitised)}\`]`,
      //
      query_by: "textFragments.text",
      per_page: 20,
      prioritize_exact_match: true,
      use_cache: true,
    });

  const resources: SearchServiceSearchResponse["resources"] = [];
  const hits: SearchServiceSearchResponse["hits"] = [];

  for (const result of response.hits || []) {
    const fragments = result.highlight.textFragments || [];

    for (let fragIndex = 0; fragIndex < fragments.length; fragIndex++) {
      const frag = fragments[fragIndex];
      if (frag?.text?.matched_tokens?.length) {
        const snippet = frag.text.snippet || "";
        const markRegex = /(.*)<mark>(.*?)<\/mark>(.*)/;
        const match = snippet.match(markRegex);
        if (match) {
          const textFragment = result.document.textFragments[fragIndex];

          const before = match[1];
          const mark = match[2];
          const after = match[3];
          const annotationId = `http://example.org/identifier/annotation/anno-${mark}`;
          const hit = {
            "@id": `http://example.org/identifier/hit/${mark}`,
            "@type": "search:Hit" as const,
            annotations: [annotationId],
            match: mark,
            before,
            after,
          };

          // Highlight the words.
          const words = (mark || "").split(" ");
          const numberToHighlight = words.length;
          const startIndex = (before || "").split(" ").length;

          if (!numberToHighlight) continue;

          const regions = textFragment?.regions
            .slice(startIndex - 1, startIndex + numberToHighlight)
            .map((reg) => {
              const [x, y, w, h] = reg.split(",");
              return {
                x: Number(x),
                y: Number(y),
                w: Number(w),
                h: Number(h),
              };
            });

          if (!regions?.length) {
            continue;
          }

          function containAllBoxes(
            boxes: Array<{ x: number; y: number; w: number; h: number }>,
          ) {
            const minX = Math.min(...boxes.map((box) => box.x));
            const minY = Math.min(...boxes.map((box) => box.y));
            const maxX = Math.max(...boxes.map((box) => box.x + box.w));
            const maxY = Math.max(...boxes.map((box) => box.y + box.h));
            return {
              x: minX,
              y: minY,
              w: maxX - minX,
              h: maxY - minY,
            };
          }

          const { x, y, w, h } = containAllBoxes(regions);

          const onValue = `${result.document.canvas_id}#xywh=${x},${y},${w},${h}`;

          hits.push(hit as any);

          resources.push({
            "@id": annotationId,
            "@type": "oa:Annotation",
            motivation: "sc:painting",
            resource: {
              "@type": "cnt:ContentAsText",
              chars: `${before}${mark}${after}`,
            },
            on: onValue,
          });
        }
      }
    }
  }

  return NextResponse.json(
    {
      "@context": [
        "http://iiif.io/api/presentation/2/context.json",
        "http://iiif.io/api/search/1/context.json",
      ],
      "@id": "http://example.org/service/manifest/search?q=hand+is",
      "@type": "sc:AnnotationList",
      resources,
      hits,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
};
