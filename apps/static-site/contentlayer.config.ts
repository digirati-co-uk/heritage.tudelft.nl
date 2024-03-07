import { defineDocumentType, makeSource } from "contentlayer/source-files";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import GithubSlugger from "github-slugger";

const Pages = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: "pages/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    path: { type: "string", required: true },
    description: { type: "string", required: false },
  },
  computedFields: {
    lang: {
      type: "string",
      resolve: (publication) => {
        return publication._id.split("/")[1];
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
    date: { type: "string", required: false },
    author: { type: "string", required: false },
    image: { type: "string", required: false },
    hero: { type: "string", required: false },
    toc: { type: "boolean", default: false },
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
    headings: {
      type: "json",
      resolve: async (doc) => {
        const regXHeader = /\n(?<flag>#{1,6})\s+(?<content>.+)/g;
        const slugger = new GithubSlugger();
        const headings = Array.from(doc.body.raw.matchAll(regXHeader)).map(({ groups }) => {
          const flag = groups?.flag;
          const content = groups?.content;
          return {
            level: flag?.length,
            heading: content,
            id: content ? slugger.slug(content) : undefined,
          };
        });
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
