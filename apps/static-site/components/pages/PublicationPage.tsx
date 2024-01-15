import { Publication } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { Slot } from "@/blocks/slot";
import { SlotContext } from "@/blocks/slot-context";

export interface PublicationPageProps {
  publication: Publication;
  locale: string;
}

export function PublicationPage(props: PublicationPageProps) {
  const MDXContent = useMDXComponent(props.publication.body.code);
  const CustomSlot = (inner: any) => {
    return (
      <Slot
        context={{ publication: props.publication.id, locale: props.locale }}
        {...inner}
      />
    );
  };

  const Illustration = () => {
    return <div>ILLUSTRATION PLACEHOLDER</div>;
  };

  const Small = (props: any) => {
    return <div className="text-lg leading-tight">{props.children}</div>;
  };

  return (
    <div>
      {props.publication.hero ? (
        <div className="lg:h-96 h-48">
          <img
            src={props.publication.hero}
            alt=""
            className="object-cover w-full h-full"
          />
        </div>
      ) : null}
      <div className="grid lg:grid-cols-3 grid-cols-1 py-12 lg:max-w-full max-w-xl mx-auto gap-12">
        <div className="sticky top-0 self-start">
          <div className="text-black flex flex-col bg-orange-500 justify-between text-center lg:aspect-square p-5 cut-corners">
            <div className="uppercase text-md font-mono">Article</div>
            <div>
              <h1 className="md:text-4xl text-xl font-bold leading-snug">
                {props.publication.title}
              </h1>
              {/*<a className="font-mono underline pt-4 block" href="#">*/}
              {/*  View source on GitHub*/}
              {/*</a>*/}
            </div>
            <div className="font-mono">{props.publication.author}</div>
          </div>
          {props.publication.toc ? (
            <div className="bg-black text-white p-5 cut-corners">
              <h3 className="text-center mb-4 font-mono text-sm">
                Table of contents
              </h3>
              <ul className="pl-4 font-mono">
                {props.publication.headings.map((heading: any) => {
                  return (
                    <li
                      key={heading.id}
                      className="list-disc underline mb-3 text-sm"
                    >
                      <a href={`#${heading.id}`}>{heading.heading}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="lg:col-span-2 h-full">
          <article className="prose lg:prose-2xl prose-lg max-w-full leading-snug md:leading-normal">
            <SlotContext name="publication" value={props.publication.id}>
              <MDXContent
                components={{ Slot: CustomSlot, Illustration, Small }}
              />
            </SlotContext>
          </article>
        </div>
      </div>
    </div>
  );
}
