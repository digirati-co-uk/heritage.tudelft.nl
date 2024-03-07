const { withContentlayer } = require("next-contentlayer");
const withNextIntl = require("next-intl/plugin")("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const config = {
  // output: "export",
  transpilePackages: ["@repo/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = withNextIntl(withContentlayer(config));
