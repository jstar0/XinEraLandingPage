import "./css/style.css";
import localFont from "next/font/local";

const pixelFont = localFont({
  src: "./fonts/ChillBitmap_16px.ttf",
  display: "swap",
  variable: "--font-pixel",
});

export const metadata = {
  title: "心纪元 MC",
  description: "心纪元 MC 的个人游戏分享站与玩家入口。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body
        className={`${pixelFont.variable} bg-[#131313] text-slate-100 antialiased`}
      >
        <div className="flex min-h-screen flex-col overflow-hidden supports-[overflow:clip]:overflow-clip">
          {children}
        </div>
      </body>
    </html>
  );
}
