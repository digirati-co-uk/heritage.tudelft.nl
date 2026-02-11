import { type XmlElement, parseXml } from "@rgrove/parse-xml";

export async function parseSingleCanvasAltoXML(
  altoFile: string | Buffer,
  recordId: string,
  canvas?: null | { id?: string; w: number; h: number }
) {
  const xml = parseXml(altoFile.toString());

  // Find the alto root element
  const altoElement = xml.children.find(
    (child) => child.type === "element" && (child as XmlElement).name === "alto"
  ) as XmlElement;
  if (!altoElement) {
    throw new Error("No alto element found in XML");
  }

  // Find Layout element
  const layoutElement = altoElement.children?.find(
    (child) => child.type === "element" && (child as XmlElement).name === "Layout"
  ) as XmlElement;
  if (!layoutElement) {
    throw new Error("No Layout element found in ALTO XML");
  }

  // Find Page element
  const pageElement = layoutElement.children?.find(
    (child) => child.type === "element" && (child as XmlElement).name === "Page"
  ) as XmlElement;
  if (!pageElement) {
    throw new Error("No Page element found in Layout");
  }

  const pageWidth = Number.parseInt(pageElement.attributes?.WIDTH || "0");
  const pageHeight = Number.parseInt(pageElement.attributes?.HEIGHT || "0");

  // Calculate scaling factors to match canvas dimensions
  const scaleX = canvas?.w ? canvas.w / pageWidth : 1;
  const scaleY = canvas?.h ? canvas.h / pageHeight : 1;

  const textFragments: Array<{
    group: string;
    text: string;
    regions: string[];
  }> = [];

  // Helper function to recursively find and process all text elements
  const processElement = (element: XmlElement, parentId?: string): void => {
    if (!element || element.type !== "element") return;

    const elementId = element.attributes?.ID || parentId || "unknown";

    // Process TextLine elements - group all String children into a single text fragment
    if (element.name === "TextLine") {
      const strings: Array<{
        content: string;
        hpos: number;
        vpos: number;
        width: number;
        height: number;
      }> = [];

      // Collect all String elements within this TextLine
      const collectStrings = (el: XmlElement): void => {
        if (el.name === "String" && el.attributes?.CONTENT) {
          strings.push({
            content: el.attributes.CONTENT,
            hpos: Number.parseInt(el.attributes.HPOS || "0"),
            vpos: Number.parseInt(el.attributes.VPOS || "0"),
            width: Number.parseInt(el.attributes.WIDTH || "0"),
            height: Number.parseInt(el.attributes.HEIGHT || "0"),
          });
        }

        // Recursively check child elements
        if (el.children) {
          for (const child of el.children) {
            if (child.type === "element") {
              collectStrings(child as XmlElement);
            }
          }
        }
      };

      collectStrings(element);

      if (strings.length > 0) {
        // Combine text with spaces
        const combinedText = strings.map((s) => s.content).join(" ");

        // Create individual regions for each word
        const regions = strings.map((s) => {
          const x = Math.round(s.hpos * scaleX);
          const y = Math.round(s.vpos * scaleY);
          const width = Math.round(s.width * scaleX);
          const height = Math.round(s.height * scaleY);
          return `${x},${y},${width},${height}`;
        });

        textFragments.push({
          group: elementId,
          text: combinedText,
          regions,
        });
      }
      return;
    }

    // Recursively process child elements for non-TextLine elements
    if (element.children) {
      for (const child of element.children) {
        if (child.type === "element") {
          processElement(child as XmlElement, elementId);
        }
      }
    }
  };

  // Process all child elements of the page
  if (pageElement.children) {
    for (const child of pageElement.children) {
      if (child.type === "element") {
        processElement(child as XmlElement);
      }
    }
  }

  return {
    id: recordId,
    textFragments,
  };
}
