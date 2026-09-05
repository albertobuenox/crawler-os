import os from "node:os";
import path from "node:path";
import type { NextConfig } from "next";

function lanDevOrigins() {
  const origins = ["localhost", "127.0.0.1"];
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) origins.push(net.address);
    }
  }
  return origins;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
  turbopack: {
    root: path.resolve(__dirname),
  },
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
