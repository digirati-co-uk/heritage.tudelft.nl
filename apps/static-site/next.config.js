const { withContentlayer } = require("next-contentlayer");
const withNextIntl = require("next-intl/plugin")("./i18n.ts");

/** @type {import('next').NextConfig} */
const config = {
  // output: "export",
  transpilePackages: ["@repo/ui"],
  experimental: {
    serverActions: false, // React hydration bug with custom elements.
  },
};

module.exports = withNextIntl(withContentlayer(config));
