"use server";
import { createManifestBySlug } from "@/actions/create-manifest-actions";
import { revalidatePath } from "next/cache";

export async function DevCreateManifest({ slug }: { slug: string }) {
  if (process.env.NODE_ENV === "production") {
    // Just ignore broken manfiests
    return null;
  }

  return (
    <div className="bg-white/50 p-8 gap-3 h-96 cut-corners flex-col flex items-center justify-center">
      <code className="">{slug}.json</code>
      <div className="font-mono text-black/50">Manifest not found</div>
      <form
        action={async () => {
          "use server";
          await createManifestBySlug(slug);
          revalidatePath(`/`);
        }}
      >
        <button type="submit" className="underline">
          + Create Manifest
        </button>
      </form>
    </div>
  );
}
