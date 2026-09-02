import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Crawler OS — The System HUD",
  description: "Real-time CarlRPG session tool for La IA and Crawlers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Crawler OS",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="canvas-bokeh antialiased">{children}</body>
    </html>
  );
}
