import { Publication } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { Slot } from "@/blocks/slot";
import { SlotContext } from "@/blocks/slot-context";
import { Illustration } from "../blocks/Illustration";

export interface PublicationPageProps {
  publication: Publication;
  locale: string;
}

export function PublicationPage(props: PublicationPageProps) {
  const MDXContent = useMDXComponent(props.publication.body.code);
  const CustomSlot = (inner: any) => {
    return <Slot context={{ publication: props.publication.id, locale: props.locale }} {...inner} />;
  };

  const Small = (props: any) => {
    return <div className="text-lg leading-tight">{props.children}</div>;
  };

  return (
    <div>
      {props.publication.hero ? (
        <div className="h-48 lg:h-96">
          <img src={props.publication.hero} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="mx-auto grid max-w-xl grid-cols-1 gap-12 py-12 lg:max-w-full lg:grid-cols-3">
        <div className="sticky top-0 self-start">
          <div className="cut-corners flex flex-col justify-between bg-orange-500 p-5 text-center text-black lg:aspect-square">
            <div className="text-md font-mono uppercase">Article</div>
            <div>
              <h1 className="text-xl font-bold leading-snug md:text-4xl">{props.publication.title}</h1>
              {/*<a className="font-mono underline pt-4 block" href="#">*/}
              {/*  View source on GitHub*/}
              {/*</a>*/}
            </div>
            <div className="font-mono">{props.publication.author}</div>
          </div>
          {props.publication.toc ? (
            <div className="cut-corners bg-black p-5 text-white">
              <h3 className="mb-4 text-center font-mono text-sm">Table of contents</h3>
              <ul className="pl-4 font-mono">
                {props.publication.headings.map((heading: any) => {
                  return (
                    <li key={heading.id} className="mb-3 list-disc text-sm underline">
                      <a href={`#${heading.id}`}>{heading.heading}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="h-full lg:col-span-2">
          <article className="prose lg:prose-2xl prose-lg max-w-full leading-snug md:leading-normal">
            <SlotContext name="publication" value={props.publication.id}>
              <MDXContent components={{ Slot: CustomSlot, Illustration, Small }} />
            </SlotContext>
          </article>
        </div>
      </div>
    </div>
  );
}
