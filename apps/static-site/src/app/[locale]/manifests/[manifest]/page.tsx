import { redirect } from "next/navigation";

export default async function ManifestRedirectToObject({ params }: { params: { manifest: string; locale: string } }) {
  return redirect(`/${params.locale}/objects/${params.manifest}`);
}
