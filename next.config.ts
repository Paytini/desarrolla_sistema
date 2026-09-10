import type { NextConfig } from "next"
import withBundleAnalyzer from "@next/bundle-analyzer"

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "bcrypt", "sharp"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatar.iran.liara.run",
      },
    ],
  },
}

// Solo se activa con ANALYZE=true (p. ej. `npm run analyze`); en build normal es un no-op.
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig)
