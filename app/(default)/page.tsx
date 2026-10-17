import { Journey } from "@/features/world/journey";
import { Records } from "@/features/journal/records";
import { StepLink } from "@/components/site/step-link";
import { Footer } from "@/components/site/footer";
import { Reveal } from "@/components/site/reveal";
import { BrandMark } from "@/components/site/brand";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <main id="main">
        <Journey />
        <Reveal>
          <Records />
          <section className="join" id="join">
            <div className="join-symbol" aria-hidden="true">
              <BrandMark />
            </div>
            <div className="join-copy">
              <span className="section-number">03 — 准备出发</span>
              <h2>
                <span>万象伊始，</span>
                <span>从心纪元。</span>
              </h2>
              <p>先选一个模样，记下想去的地方。下一段旅途，从这里开始。</p>
              <StepLink href="/account">进入玩家中心</StepLink>
            </div>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
