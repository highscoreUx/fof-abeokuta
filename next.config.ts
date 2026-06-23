import type { NextConfig } from "next";

function imageRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/**",
    },
  ];

  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  if (r2PublicUrl) {
    try {
      const host = new URL(r2PublicUrl).hostname;
      patterns.push({
        protocol: "https",
        hostname: host,
        pathname: "/**",
      });
    } catch {
      // ignore invalid R2_PUBLIC_URL
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: imageRemotePatterns(),
  },
};

export default nextConfig;
