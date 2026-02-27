import { describe, expect, test } from "vitest";
import { extractTopics } from "../../src/extract/extract-topics.ts";

function createApi(metadata: any[]) {
  return {
    resource: "resource-1",
    vault: {
      get: () => ({
        metadata,
      }),
    },
  } as any;
}

describe("extractTopics", () => {
  test("supports grouping multiple labels and string topic type config", async () => {
    const metadata = [
      {
        label: { en: ["Year"] },
        value: { en: ["1890", "1890"] },
      },
      {
        label: { en: ["Contributor"] },
        value: { en: ["Alice"] },
      },
      {
        label: { en: ["Contributors"] },
        value: { en: ["Bob"] },
      },
      {
        label: { en: ["Format"] },
        value: { en: ["paper, ink"] },
      },
    ];

    const result = await extractTopics.handler(
      {
        vault: createApi(metadata).vault,
      } as any,
      {
        resource: "resource-1",
      } as any,
      {
        language: "en",
        translate: false,
        commaSeparated: ["format"],
        topicTypes: {
          date: "Year",
          contributor: ["Contributor", "Contributors"],
          format: ["Format"],
        },
      }
    );

    expect(result.indices).toEqual({
      date: ["1890"],
      contributor: ["Alice", "Bob"],
      format: ["paper", "ink"],
    });
  });
});
