import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { PlayerCenter } from "@/features/account/player-center";
import "./account.css";
export const metadata = {
  title: "玩家中心",
  description:
    "预览心纪元角色皮肤，收藏旅途中的地点。外观与收藏保存在当前浏览器，账号关联尚未开放。",
  robots: { index: false, follow: true },
};
export default function AccountPage() {
  return (
    <>
      <Header />
      <PlayerCenter />
      <Footer />
    </>
  );
}
