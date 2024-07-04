import { allPages } from ".contentlayer/generated";
import { Slot } from "@/blocks/slot";
import { SlotContext } from "@/blocks/slot-context";
import { Page } from "@/components/Page";
import { Illustration } from "@/components/blocks/Illustration";
import { useMDXComponent } from "next-contentlayer/hooks";

export default async function AboutPage({ params }: { params: { locale: string } }) {
  const aboutPages = allPages.filter((page) => page.path === "/about");
  const aboutPage = aboutPages.find((page) => page.lang === params.locale) || aboutPages[0];

  if (!aboutPage) throw new Error(`No about page found for locale ${params.locale}`);

  const MDXContent = useMDXComponent(aboutPage.body.code);
  const CustomSlot = (inner: any) => {
    return <Slot context={{ page: "about", locale: params.locale }} {...inner} />;
  };

  return (
    <Page>
      <h1 className="text-4xl font-medium">{aboutPage.title}</h1>
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
