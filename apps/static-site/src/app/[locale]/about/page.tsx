import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import type { Metadata } from "next";
import { getMdx, metaFromMdx } from "@/helpers/metadata";
import { MDXWrapper } from "@/components/MDXWrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metaFromMdx({
    locale,
    pageName: "About",
    path: "/about",
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = getMdx({
    params: { pageName: "About", path: "/about", locale: locale },
  });

  return (
    <Page>
      <h1 className="text-4xl font-medium">{page.title}</h1>
      <div className="mb-32 mt-8 h-full lg:col-span-2">
        <article className="prose md:prose-xl prose-lg max-w-full leading-snug md:leading-snug">
          <SlotContext name="page" value={"about"}>
            <MDXWrapper
              code={page.body.code}
              locale={locale}
              context={{ page: "about" }}
            />
          </SlotContext>
        </article>
      </div>
    </Page>
  );
}
