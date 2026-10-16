import { Header } from "@/components/site/header";
import { StepLink } from "@/components/site/step-link";
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="empty-page">
        <span className="section-number">404</span>
        <h1>这里还没有留下足迹。</h1>
        <p>这个页面不存在，或者已换了位置。</p>
        <StepLink href="/">回到心纪元</StepLink>
      </main>
    </>
  );
}
