import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ia", destination: "/dm", permanent: true },
      { source: "/ia/:path*", destination: "/dm/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
      },
    ],
  },
};

export default nextConfig;
