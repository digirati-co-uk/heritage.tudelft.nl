"use client";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  GenericJsxEditor,
  InsertFrontmatter,
  InsertImage,
  type JsxComponentDescriptor,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  NestedLexicalEditor,
  UndoRedo,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  jsxPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
// InitializedMDXEditor.tsx
import type { ForwardedRef } from "react";
import { ArticleExhibition } from "../blocks/ArticleExhibition";
import { InsertArticleExhibitionEditor, articleExhibitionDescriptor } from "../blocks/ArticleExhibitionEditor";
import { InsertIllustrationEditor, illustrationDescriptor } from "../blocks/IllustrationEditor";

const jsxComponentDescriptors: JsxComponentDescriptor[] = [articleExhibitionDescriptor, illustrationDescriptor];

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  children,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null; children: React.ReactNode } & MDXEditorProps) {
  return (
    <MDXEditor
      className="mdx-editor"
      plugins={[
        // Example Plugin Usage
        headingsPlugin(),
        listsPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        jsxPlugin({ jsxComponentDescriptors }),
        toolbarPlugin({
          toolbarClassName: "mdx-editor-toolbar",
          toolbarContents: () => (
            <>
              <BlockTypeSelect />
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <CreateLink />
              <InsertImage />
              <InsertArticleExhibitionEditor />
              <InsertIllustrationEditor />
              {children}
            </>
          ),
        }),
      ]}
      {...props}
      ref={editorRef}
    />
  );
}
