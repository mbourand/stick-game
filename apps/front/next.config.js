// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tau/back-schemas"],
  eslint: {
    // Lint runs as a separate task (`pnpm lint`); avoid blocking `next build`.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [{ hostname: "assets.ppy.sh", protocol: "https" }],
  },
  webpack: (config) => {
    // Allow ".js" specifier in TS sources of workspace packages to resolve to ".ts" / ".tsx".
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

module.exports = nextConfig;
