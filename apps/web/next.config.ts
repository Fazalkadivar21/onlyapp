import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mark-1/shared", "@mark-1/db"]
};

export default nextConfig;
