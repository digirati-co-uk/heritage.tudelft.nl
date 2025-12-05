"use client";

import { useRouter } from "next/navigation";
import { BlockEditor as CustomBlockEditor } from "@page-blocks/react-client";
import { BlockEditorReact } from "@page-blocks/react-editor";
import { directory } from "@/components/directory";
import { useQueryClient } from "@tanstack/react-query";

export default function BlockEditor(props: {
  showToggle?: boolean;
  rsc?: boolean;
}) {
  const router = useRouter();
  const client = useQueryClient();
  return (
    <BlockEditorReact>
      <CustomBlockEditor
        client={client}
        options={directory}
        showToggle={props.showToggle}
        onRefresh={() => {
          if (props.rsc) router.refresh();
        }}
      />
    </BlockEditorReact>
  );
}
