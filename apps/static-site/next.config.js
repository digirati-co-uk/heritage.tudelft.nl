const { withContentlayer } = require("next-contentlayer");
const withNextIntl = require("next-intl/plugin")("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const config = {
  // output: "export",
  transpilePackages: ["@repo/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/:locale/manifests/:manifest",
        destination: "/:locale/objects/:manifest",
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(withContentlayer(config));
