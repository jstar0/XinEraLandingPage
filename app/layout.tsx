import type { Metadata, Viewport } from "next";
import "./site.css";
import "@/components/site/theme.css";
import { site } from "@/lib/site";
import { themeInitialization } from "@/lib/theme";
import { ThemeSync } from "@/components/site/theme-toggle";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "心纪元 · Minecraft 原创剧情 RPG",
    template: "%s · 心纪元",
  },
  description: site.description,
  openGraph: {
    siteName: "心纪元",
    locale: "zh_CN",
    type: "website",
    images: [{ url: "/xinera/courtyard.jpg", alt: "心纪元西奥格勒教堂庭院" }],
  },
  icons: { icon: { url: "/xinera/brand-mark.svg", type: "image/svg+xml" } },
};
export const viewport: Viewport = { themeColor: "#f4dfc9" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitialization }} />
      </head>
      <body>
        <ThemeSync />
        <a className="skip-link" href="#main">
          跳到内容
        </a>
        {children}
      </body>
    </html>
  );
}
