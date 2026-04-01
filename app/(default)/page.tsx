export const metadata = {
  title: "心纪元 MC | Xin Era",
  description: "心纪元 MC 的个人游戏分享站与玩家入口。",
};

import { headers } from "next/headers";
import LandingPage from "@/components/home/landing-page";
import { resolveLocaleFromAcceptLanguage } from "@/components/home/i18n";

export default function Home() {
  const acceptLanguage = headers().get("accept-language");
  const initialLocale = resolveLocaleFromAcceptLanguage(acceptLanguage);

  return <LandingPage initialLocale={initialLocale} />;
}
