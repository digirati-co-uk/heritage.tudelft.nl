import { defineDocumentType, makeSource } from "contentlayer/source-files";
import GithubSlugger from "github-slugger";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { getSlugFromRelativeUrl } from "./src/helpers/get-slug-from-relative-url";

const Pages = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: "pages/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    path: { type: "string", required: true },
    description: { type: "string", required: false },
    image: { type: "string", required: false },
    imageWidth: { type: "number", required: false },
    imageHeight: { type: "number", required: false },
  },
  computedFields: {
    lang: {
      type: "string",
      resolve: (page) => {
        return page._id.split("/")[1];
      },
    },
  },
}));

const Publication = defineDocumentType(() => ({
  name: "Publication",
  filePathPattern: "publications/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: false },
    date: { type: "string", required: false },
    author: { type: "string", required: false },
    image: { type: "string", required: false },
    imageWidth: { type: "number", required: false },
    imageHeight: { type: "number", required: false },
    hero: { type: "string", required: false },
    toc: { type: "boolean", default: false, required: false },
    seeAlso: { type: "boolean", default: false, required: false },
    depth: { type: "number", default: 3 },
  },
  computedFields: {
    lang: {
      type: "string",
      resolve: (publication) => {
        return publication._id.split("/")[1];
      },
    },
    id: {
      type: "string",
      resolve: (publication) => {
        return publication._id.split("/")[2]!.split(".")[0];
      },
    },
    referencedIIIF: {
      type: "list",
      of: { type: "string" },
      resolve: async (doc) => {
        // Regex to find JSX components with source or manifest attributes
        const jsxRegex =
          /<(\w+)\s+(?:[^>]*?\s+)?((?:source|manifest)="[^"]*")(?:\s+[^>]*)?\s*\/?>/g;
        const attributeRegex = /(source|manifest)="([^"]*)"/;

        const referencedIIIF: string[] = [];
        let match: any;

        while ((match = jsxRegex.exec(doc.body.raw)) !== null) {
          const componentName = match[1];
          const attributeString = match[2];
          const attributeMatch = attributeString?.match(attributeRegex);

          if (attributeMatch) {
            const attributeName = attributeMatch[1]; // 'source' or 'manifest'
            const attributeValue = attributeMatch[2]; // the actual value

            if (attributeName === "source") {
              // something.json -> manifests/something
              if (attributeValue.endsWith(".json")) {
                referencedIIIF.push(
                  `manifests/${attributeValue.replace(".json", "")}`,
                );
              }
            }

            if (attributeName === "manifest" && attributeValue) {
              const slug = getSlugFromRelativeUrl(attributeValue);
              if (slug) {
                referencedIIIF.push(slug);
              }
            }
          }
        }
        return referencedIIIF;
      },
    },
    headings: {
      type: "json",
      resolve: async (doc) => {
        const regXHeader = /\n(?<flag>#{1,6})\s+(?<content>.+)/g;
        const slugger = new GithubSlugger();
        const headings = Array.from(doc.body.raw.matchAll(regXHeader)).map(
          ({ groups }) => {
            const flag = groups?.flag;
            const content = groups?.content;
            return {
              level: flag?.length,
              heading: content,
              id: content ? slugger.slug(content) : undefined,
            };
          },
        );
        return headings;
      },
    },
  },
  //
}));

// const Manifest = defineDocumentType(() => ({
//   name: "Manifest",
//   filePathPattern: "../public/iiif/manifests/**/meta.json",
//   contentType: "data",
//   fields: {
//     totalItems: { type: "number" },
//     label: { type: "json" },
//     thumbnail: { type: "json" },
//   },
// }));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Publication, Pages],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  },
});
