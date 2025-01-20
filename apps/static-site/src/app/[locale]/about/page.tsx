import { Slot } from "@/blocks/slot";
import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import { Illustration } from "@/components/blocks/Illustration";
import { useMDXComponent } from "next-contentlayer/hooks";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteName, getBasicMetadata, makeTitle, getMdx } from "@/helpers/metadata";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations();
  const siteName = await getSiteName();
  const page = getMdx({ params: { pageName: "About", path: "/about", locale: params.locale } });
  const title = makeTitle([page.title || t("About"), siteName]);
  const description = page.description || t("defaultDesc");
  const image = page.image;
  return getBasicMetadata(params.locale, siteName, title, description, image);
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const page = getMdx({ params: { pageName: "About", path: "/about", locale: params.locale } });
  const MDXContent = useMDXComponent(page.body.code);
  const CustomSlot = (inner: any) => {
    return <Slot context={{ page: "about", locale: params.locale }} {...inner} />;
  };

  return (
    <Page>
      <h1 className="text-4xl font-medium">{page.title}</h1>
      <div className="mb-32 mt-8 h-full lg:col-span-2">
        <article className="prose md:prose-xl prose-lg max-w-full leading-snug md:leading-snug">
          <SlotContext name="page" value={"about"}>
            <MDXContent components={{ Slot: CustomSlot, Illustration }} />
          </SlotContext>
        </article>
      </div>
    </Page>
  );
}
