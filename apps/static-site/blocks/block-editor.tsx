"use client";

import { useRouter } from "next/navigation";
import { BlockEditor as CustomBlockEditor } from "@page-blocks/react-client";
import { BlockEditorReact } from "@page-blocks/react-editor";
import { directory } from "@/components/directory";

export default function BlockEditor(props: {
  showToggle?: boolean;
  rsc?: boolean;
}) {
  const router = useRouter();
  return (
    <BlockEditorReact>
      <CustomBlockEditor
        options={directory}
        showToggle={props.showToggle}
        onRefresh={() => {
          if (props.rsc) router.refresh();
        }}
      />
    </BlockEditorReact>
  );
}
