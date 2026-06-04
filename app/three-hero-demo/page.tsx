import EntryStationHeroThree from "@/components/home/entry-station-hero-three";

const HERO_IMAGE = "/images/landing/xinera-cathedral.png";

export const metadata = {
  title: "Three Hero Demo | Xin Era",
  description: "WebGL prototype for the Xin Era entry station hero banner.",
};

export default function ThreeHeroDemoPage() {
  return (
    <main className="min-h-screen bg-[#0b0e11] px-5 py-10 text-[#e5edef] md:px-10 md:py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(47,211,213,0.12),transparent_32%),linear-gradient(180deg,#0b0e11_0%,#11151a_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.08]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2">
          <p className="font-[family-name:var(--font-label)] text-xs tracking-[0.26em] text-[#53d6d8] uppercase">
            Xin Era WebGL Prototype
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-white md:text-6xl">
            Entry Station Hero
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-white/56 md:text-base">
            A Three.js version of the approved banner style: same image, flat grid tiles,
            idle sweep, hover lift, and ripple pulses.
          </p>
        </div>

        <EntryStationHeroThree imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
      </div>
    </main>
  );
}
