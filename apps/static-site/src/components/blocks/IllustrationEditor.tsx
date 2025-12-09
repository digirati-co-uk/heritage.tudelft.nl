"use client";
import { relativeIIIFUrl } from "@/iiif";
import {
  Button,
  GenericJsxEditor,
  type JsxComponentDescriptor,
  type JsxEditorProps,
  NestedLexicalEditor,
  insertJsx$,
  useMdastNodeUpdater,
  useNestedEditorContext,
  usePublisher,
} from "@mdxeditor/editor";
import { IIIFBrowser } from "iiif-browser";
import { useState } from "react";
import { Illustration } from "./Illustration";

export function IllustrationEditor(props: JsxEditorProps) {
  const updateMdastNode = useMdastNodeUpdater();
  const [isEditing, setIsEditing] = useState(false);
  const realProps: any = {};
  for (const prop of props.mdastNode.attributes) {
    realProps[(prop as any).name] = prop.value;
  }

  if ((!realProps.manifest && !realProps.source) || isEditing) {
    return (
      <div className="">
        <GenericJsxEditor
          {...props}
          PropertyEditor={() => {
            return (
              <button
                className="text-sm bg-white px-3 py-1.5 rounded hover:bg-slate-200"
                onClick={() => setIsEditing(false)}
              >
                Finish editing
              </button>
            );
          }}
        />
        <IIIFBrowser
          className="h-[600px] prose-headings:text-lg rounded-none mb-0"
          ui={{
            homeLink: "http://localhost:7111/collections/site/collection.json",
          }}
          output={[
            {
              type: "callback",
              label: "Choose canvas",
              format: { type: "custom", format: (c) => c },
              supportedTypes: ["Canvas"],
              cb: (result) => {
                if (result.type === "Canvas") {
                  const canvas = result.id;
                  const manifest = relativeIIIFUrl(result.parent.id);
                  updateMdastNode({
                    attributes: [
                      {
                        type: "mdxJsxAttribute",
                        name: "manifest",
                        value: manifest,
                      },
                      {
                        type: "mdxJsxAttribute",
                        name: "canvas",
                        value: canvas,
                      },
                    ],
                  });
                  setIsEditing(false);
                }
              },
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <GenericJsxEditor
        {...props}
        PropertyEditor={() => {
          return (
            <button
              className="text-sm bg-white px-3 py-1.5 rounded hover:bg-slate-200"
              onClick={() => setIsEditing(true)}
            >
              Select resource
            </button>
          );
        }}
      />
      <Illustration {...realProps} />
    </div>
  );
}

export const illustrationDescriptor: JsxComponentDescriptor = {
  name: "Illustration",
  kind: "flow",
  props: [
    { name: "manifest", type: "string" },
    { name: "canvas", type: "string" },
  ],
  hasChildren: false,
  Editor: IllustrationEditor,
};

export function InsertIllustrationEditor() {
  const insertJsx = usePublisher(insertJsx$);
  return (
    <Button
      onClick={() =>
        insertJsx({
          name: "Illustration",
          kind: "text",
          props: { source: "", manifest: "", canvas: "" },
        })
      }
    >
      + Illustration
    </Button>
  );
}
