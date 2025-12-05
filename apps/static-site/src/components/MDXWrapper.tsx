import { Slot } from "@/blocks/slot";
import { getMDXComponent } from "mdx-bundler/client";
import { useMemo } from "react";
import { ArticleExhibitionServer } from "./blocks/ArticleExhibitionServer";
import { IllustrationServer } from "./blocks/IllustrationServer";

export function MDXWrapper({
  code,
  locale,
  context,
}: {
  code: any;
  locale: string;
  context: Record<string, any>;
}) {
  const MDXContent = useMemo(() => {
    try {
      return getMDXComponent(code);
    } catch (error) {
      console.error("Error rendering MDX:", error);
      return () => (
        <div>
          <h3>Error rendering article</h3>
          <ul>
            <li>Ensure that frontmatter does not have strings wrapped in quotes</li>
            <li>Avoid using empty values in the frontmatter</li>
            {/* Add other issues that might arise here. */}
          </ul>
        </div>
      );
    }
  }, [code]);

  const CustomSlot = (inner: any) => {
    return <Slot context={{ ...context, locale }} {...inner} />;
  };

  return (
    <MDXContent
      components={
        { Slot: CustomSlot, Illustration: IllustrationServer, ArticleExhibition: ArticleExhibitionServer, Small } as any
      }
    />
  );
}

function Small(props: any) {
  return <div className="text-lg leading-tight">{props.children}</div>;
}
