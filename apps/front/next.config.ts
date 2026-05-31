import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tau/back-schemas"],
  output: "standalone",
};

export default nextConfig;
