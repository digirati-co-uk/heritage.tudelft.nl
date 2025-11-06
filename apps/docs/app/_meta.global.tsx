import type { MetaRecord } from "nextra";

const meta: MetaRecord = {
  index: {
    type: "page",
    theme: {
      layout: "full",
      toc: false,
      timestamp: false,
    },
  },
  docs: {
    type: "page",
    title: "Documentation",
  },
  dev: {
    type: "page",
    title: "Developers",
    items: {
      hss: {
        title: "Headless static site",
      },
    },
  },
  nextraStarter: {
    title: "Links",
    type: "menu",
    items: {
      github: {
        title: "GitHub Repository",
        href: "https://github.com/digirati-co-uk/heritage.tudelft.nl",
      },
    },
  },
};

export default meta;
