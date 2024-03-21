"use client";
import { BlockArchive as BaseBlockArchive } from "@page-blocks/react-client";
import { directory } from "@/components/directory";

export function BlockArchive() {
  return <BaseBlockArchive directory={directory} />;
}
