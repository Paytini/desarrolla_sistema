import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "bcryptjs"],
};

export default nextConfig;
