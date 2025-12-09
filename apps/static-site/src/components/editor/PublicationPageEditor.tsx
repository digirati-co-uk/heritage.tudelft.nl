"use client";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./mdx-editor.css";

import type { Publication } from "contentlayer/generated";
import { useLayoutEffect, useRef, useState } from "react";
import { Button, Dialog, DialogTrigger, Modal } from "react-aria-components";
import { createPortal } from "react-dom";
import InitializedMDXEditor from "./InitializedMDXEditor";
import "iiif-browser/dist/index.css";
import { useStore } from "@nanostores/react";
import { editingMode } from "@page-blocks/client";
import { IIIFBrowser } from "iiif-browser";

export function PublicationPageEditor({
  publication,
  updateMarkdown,
  children,
}: { publication: Publication; updateMarkdown: (markdown: string) => void; children: React.Node }) {
  // create a ref to the editor component
  const markdown = publication.body.raw;
  const ref = useRef<MDXEditorMethods>(null);
  const [_unsavedChanges, setUnsavedChanges] = useState(false);
  const initialMdx = useRef<string | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const $editingMode = useStore(editingMode);

  useLayoutEffect(() => {
    setContainer(document.getElementById("frontmatter-editor"));
  }, []);

  const [title, setTitle] = useState(publication.title || "");
  const [date, setDate] = useState(publication.date || "");
  const [author, setAuthor] = useState(publication.author || "");
  const [showTableOfContents, setShowTableOfContents] = useState(publication.toc || false);
  const [showSeeAlso, setShowSeeAlso] = useState(publication.seeAlso || false);
  const [image, setImage] = useState(publication.image || "");

  const unsavedChanges =
    _unsavedChanges ||
    title !== publication.title ||
    date !== publication.date ||
    author !== publication.author ||
    showTableOfContents !== publication.toc ||
    showSeeAlso !== publication.seeAlso ||
    image !== publication.image;

  const onSave = () => {
    if (!ref.current) return;
    // Update markdown AND frontmatter.
    let frontmatter = "---";
    if (title) {
      frontmatter += `\ntitle: ${title}`;
    }
    if (date) {
      frontmatter += `\ndate: ${date}`;
    }
    if (author) {
      frontmatter += `\nauthor: ${author}`;
    }
    if (showTableOfContents) {
      frontmatter += "\ntoc: true";
    }
    if (showSeeAlso) {
      frontmatter += "\nseeAlso: true";
    }
    if (image) {
      frontmatter += `\nimage: ${image}`;
    }
    frontmatter += "\n---\n\n";

    updateMarkdown(frontmatter + ref.current.getMarkdown());
  };

  if (!$editingMode) {
    return children;
  }

  return (
    <>
      {container &&
        createPortal(
          <div className="cut-corners bg-black p-5 text-white">
            <h2>Frontmatter Editor</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="space-y-4 mt-4"
            >
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter publication title"
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium mb-2">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [color-scheme:dark]"
                />
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-medium mb-2">
                  Author
                </label>
                <input
                  id="author"
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter author name"
                />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <input
                    id="show-toc"
                    type="checkbox"
                    checked={showTableOfContents}
                    onChange={(e) => setShowTableOfContents(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label htmlFor="show-toc" className="text-sm font-medium">
                    Show Table of Contents
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <input
                    id="show-see-also"
                    type="checkbox"
                    checked={showSeeAlso}
                    onChange={(e) => setShowSeeAlso(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label htmlFor="show-see-also" className="text-sm font-medium">
                    Show See Also
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium mb-2">
                  Image URL
                </label>
                <input
                  id="image"
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <DialogTrigger>
                <Button>Choose manifest</Button>
                <Modal isDismissable className="react-aria-Modal z-50 flex max-h-full justify-center p-2">
                  {/* overflow-auto */}
                  <Dialog
                    className={
                      "z-50 w-[80vw] h-[80vh] flex rounded bg-white overflow-clip drop-shadow-xl focus:outline-none"
                    }
                  >
                    {({ close }) => (
                      <IIIFBrowser
                        ui={{
                          homeLink: "http://localhost:7111/collections/collection.json",
                        }}
                        output={[
                          {
                            type: "callback",
                            label: "Choose manifest",
                            format: { type: "url", resolvable: true },
                            supportedTypes: ["Manifest"],
                            cb: (manifest) => {
                              console.log("manifest", manifest);
                              close();
                            },
                          },
                        ]}
                      />
                    )}
                  </Dialog>
                </Modal>
              </DialogTrigger>
            </form>
          </div>,
          container,
        )}
      <InitializedMDXEditor
        editorRef={ref}
        markdown={markdown}
        onChange={(newMdx) => {
          if (initialMdx.current === null) {
            initialMdx.current = newMdx;
            return;
          }
          if (newMdx !== initialMdx.current) {
            setUnsavedChanges(true);
          } else {
            setUnsavedChanges(false);
          }
        }}
      >
        {unsavedChanges && <div className="px-2">You have unsaved changes</div>}
        <Button
          onPress={onSave}
          isDisabled={!unsavedChanges}
          className="bg-blue-500 disabled:opacity-50 hover:bg-blue-700 text-white py-1 px-3 rounded"
        >
          Save changes
        </Button>
      </InitializedMDXEditor>
    </>
  );
}
