"use client";

import { useStore } from "@nanostores/react";
import { editingMode } from "@page-blocks/client";
import { useState } from "react";
import { Button } from "react-aria-components";

export function NewArticle(props: { onCreate: (article: { title: string }) => Promise<string> }) {
  const [title, setTitle] = useState("");
  const $editingMode = useStore(editingMode);

  if (process.env.NODE_ENV === "production" || !$editingMode) {
    return null;
  }

  return (
    <div className="z-2 relative p-5 text-black  flex h-full w-full flex-col justify-between gap-3 no-underline border-2 hover:bg-yellow-400 bg-yellow-400/50 cut-corners w-full h-full p-5">
      <div className="text-center font-mono">Create new article</div>
      <div>
        <textarea
          className="bg-transparent mt-8 w-full mx-auto text-center text-2xl md:text-4xl font-medium"
          placeholder="New article title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <Button onPress={() => props.onCreate({ title })} className="text-center font-mono bg-yellow-500 py-3">
        Create
      </Button>
    </div>
  );
}
