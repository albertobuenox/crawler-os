import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Crawler OS — HUD de The System",
  description: "Herramienta de sesión CarlRPG en tiempo real para el Dungeon Master y los Crawlers",
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
