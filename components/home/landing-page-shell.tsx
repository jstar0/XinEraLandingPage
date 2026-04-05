"use client";

import React from "react";
import { LazyMotion, domAnimation, m, type Variants } from "motion/react";

import EntryStationHero from "./entry-station-hero";
import {
  createSignalBandItems,
  resolveActiveNavHref,
  resolveHeroLayout,
  resolveScrollActiveNavHref,
} from "./landing-page-effects";
import {
  isChineseLocale,
  landingCopy,
  localeLabels,
  type SupportedLocale,
} from "./i18n";
import MagneticAnchor from "./magnetic-anchor";
import MobileEntryDock from "./mobile-entry-dock";
import SignalBand from "./signal-band";

type LandingPageShellProps = {
  locale: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
};

const HERO_IMAGE = "/images/landing/xinera-cathedral.png";
const ROUTE_IMAGES = [
  "/images/landing/xinera-cathedral.png",
  "/images/landing/xinera-city-blur.jpg",
  "/images/landing/xinera-battle.png",
] as const;
const SHOWCASE_IMAGE = "/images/hero-image.png";
const DISPATCH_BACKGROUND = "/images/landing/xinera-city-blur.jpg";

const staggerChildren: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.1,
    },
  },
};

const riseIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.82,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function headlineClass(locale: SupportedLocale, size: string) {
  return isChineseLocale(locale)
    ? `font-pixel ${size} leading-[1.04] tracking-[0.08em] text-[#edf8f8]`
    : `font-[family-name:var(--font-label)] ${size} leading-[0.92] tracking-[-0.04em] text-white uppercase`;
}

function sectionHeadingClass(locale: SupportedLocale, size: string) {
  return isChineseLocale(locale)
    ? `font-pixel ${size} leading-[1.08] tracking-[0.08em] text-[#edf8f8]`
    : `font-[family-name:var(--font-label)] ${size} leading-[0.96] tracking-[-0.03em] text-white uppercase`;
}

function bodyClass(locale: SupportedLocale, extra = "") {
  return `${isChineseLocale(locale) ? "font-pixel leading-[1.8]" : "font-[family-name:var(--font-body)] leading-relaxed"} ${extra}`;
}

function labelClass(locale: SupportedLocale, extra = "") {
  return `${isChineseLocale(locale) ? "font-pixel tracking-[0.22em]" : "font-[family-name:var(--font-label)] tracking-[0.22em] uppercase"} ${extra}`;
}

function heroAccentClass(locale: SupportedLocale, chinese: boolean) {
  return chinese
    ? "font-[family-name:var(--font-label)] text-[#53d6d8] uppercase"
    : "font-pixel text-[#53d6d8]";
}

function HeroPoster({
  imageAlt,
  imageSrc,
}: {
  imageAlt: string;
  imageSrc: string;
}) {
  return (
    <div
      data-hero-poster="entry-station"
      className="group relative mx-auto aspect-[11/8] w-full max-w-[720px] touch-none select-none"
    >
      <div className="pointer-events-none absolute inset-[-8%_-6%_10%_-6%] bg-[radial-gradient(circle_at_50%_55%,rgba(47,211,213,0.18),transparent_36%),radial-gradient(circle_at_50%_110%,rgba(12,71,76,0.52),transparent_30%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[-6%] h-[16%] bg-[radial-gradient(circle,rgba(47,211,213,0.2),rgba(47,211,213,0.04)_42%,transparent_72%)] blur-xl" />
      <div className="relative h-full w-full [perspective:1800px]">
        <div className="absolute inset-[4%_3%] [transform-style:preserve-3d] [transform:rotateX(12deg)_rotateY(-18deg)_rotateZ(-1.9deg)] md:inset-[3.5%_2.5%]">
          <div className="absolute inset-[-1px] bg-[linear-gradient(135deg,rgba(47,211,213,0.32),rgba(255,255,255,0.06)_42%,rgba(47,211,213,0.22))] opacity-65" />
          <div className="absolute inset-[1px] overflow-hidden bg-[#05080b] shadow-[0_20px_50px_rgba(0,0,0,0.42)]">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.42] grayscale"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,11,0.06),rgba(5,8,11,0.18)),linear-gradient(135deg,rgba(47,211,213,0.1),transparent_36%,rgba(212,169,94,0.06)_82%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_4px)] opacity-30 mix-blend-screen" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(196,214,218,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(196,214,218,0.08)_1px,transparent_1px)] bg-[size:calc(100%/24)_calc(100%/14)] opacity-55" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(5,8,11,0.24)_72%,rgba(5,8,11,0.65)_100%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPageShell({
  locale,
  onLocaleChange,
}: LandingPageShellProps) {
  const copy = landingCopy[locale];
  const chinese = isChineseLocale(locale);
  const mobileHeroCopyTransform =
    locale === "en"
      ? "[transform:rotateX(12deg)_rotateY(-18deg)_rotateZ(-1.9deg)_translate3d(6px,40px,40px)]"
      : "[transform:rotateX(12deg)_rotateY(-18deg)_rotateZ(-1.9deg)_translate3d(6px,32px,40px)]";
  const heroMark = copy.brand.replace(/\s+ARCHIVE$/, "");
  const mobilePortalLabel = copy.access.cards[0]?.title ?? copy.hero.primaryLabel;
  const signalBandItems = createSignalBandItems(copy);
  const [heroLayout, setHeroLayout] = React.useState<"desktop" | "medium" | "mobile">(() =>
    typeof window === "undefined" ? "desktop" : resolveHeroLayout(window.innerWidth),
  );
  const [activeNavHref, setActiveNavHref] = React.useState<string | null>(() =>
    resolveActiveNavHref(copy.nav),
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      setActiveNavHref(resolveActiveNavHref(copy.nav));
      return;
    }

    const syncFromHash = () => {
      setActiveNavHref(resolveActiveNavHref(copy.nav, window.location.hash));
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [copy]);

  React.useEffect(() => {
    const sectionNavHrefs = copy.nav
      .map((item) => item.href)
      .filter((href) => href.startsWith("#"));

    if (typeof window === "undefined" || !sectionNavHrefs.length) {
      return;
    }

    let frameId: number | null = null;

    const syncFromScroll = () => {
      frameId = null;

      const sections = sectionNavHrefs
        .map((href) => {
          const element = document.getElementById(href.slice(1));

          if (!element) {
            return null;
          }

          const rect = element.getBoundingClientRect();
          return {
            href,
            height: rect.height,
            top: rect.top,
          };
        })
        .filter((section): section is { height: number; href: string; top: number } => Boolean(section));

      const nextActiveHref = resolveScrollActiveNavHref(sections, window.innerHeight);

      if (!nextActiveHref) {
        return;
      }

      setActiveNavHref((currentHref) =>
        currentHref === nextActiveHref ? currentHref : nextActiveHref,
      );
    };

    const queueSyncFromScroll = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(syncFromScroll);
    };

    queueSyncFromScroll();
    window.addEventListener("scroll", queueSyncFromScroll, { passive: true });
    window.addEventListener("resize", queueSyncFromScroll);

    return () => {
      window.removeEventListener("scroll", queueSyncFromScroll);
      window.removeEventListener("resize", queueSyncFromScroll);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [copy]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHeroLayout = () => {
      setHeroLayout(resolveHeroLayout(window.innerWidth));
    };

    syncHeroLayout();
    window.addEventListener("resize", syncHeroLayout);

    return () => {
      window.removeEventListener("resize", syncHeroLayout);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <div
        data-locale={locale}
        data-script={chinese ? "bitmap-cjk" : "editorial-latin"}
        className="bg-[#0b0e11] text-[#e5edef]"
      >
        <nav className="sticky top-0 z-50 w-full bg-[rgba(11,14,17,0.78)] px-5 py-4 backdrop-blur-xl md:px-10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-label)] text-sm tracking-[0.26em] text-[#53d6d8] uppercase md:text-base">
                {copy.brand}
              </div>
              <p className={labelClass(locale, "mt-1 text-[10px] text-white/42 md:text-xs")}>
                {copy.metaLine}
              </p>
            </div>

            <a
              href={copy.hero.primaryHref}
              target="_blank"
              rel="noreferrer"
              className={labelClass(
                locale,
                "inline-flex items-center justify-center bg-[linear-gradient(135deg,#2fd3d5_0%,#11878d_100%)] px-4 py-2 text-[10px] text-[#081113] md:hidden",
              )}
            >
              {mobilePortalLabel}
            </a>

            <div className="hidden items-center gap-8 md:flex">
              {copy.nav.map((item) => {
                const active = item.href === activeNavHref;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    data-nav-link={active ? "active" : "idle"}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setActiveNavHref(resolveActiveNavHref(copy.nav, item.href));
                    }}
                    className={`group relative pb-2 transition-colors duration-300 ease-out ${
                      active ? "text-white" : "text-white/58 hover:text-white"
                    }`}
                  >
                    <span
                      className={labelClass(
                        locale,
                        `block text-[11px] transition-[transform,color,text-shadow] duration-300 ease-out ${
                          active
                            ? "-translate-y-px text-white [text-shadow:0_0_12px_rgba(83,214,216,0.18)]"
                            : "text-white/78 group-hover:-translate-y-px group-hover:text-white group-hover:[text-shadow:0_0_10px_rgba(83,214,216,0.14)]"
                        }`,
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      data-nav-ink={active ? "active" : "idle"}
                      className={`pointer-events-none absolute inset-x-0 bottom-0 h-px origin-center bg-[linear-gradient(90deg,rgba(83,214,216,0),rgba(83,214,216,0.82),rgba(83,214,216,0))] transition-[transform,opacity] duration-300 ease-out ${
                        active
                          ? "scale-x-100 opacity-100"
                          : "scale-x-50 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                      }`}
                    />
                  </a>
                );
              })}
            </div>

            <div className="order-3 flex w-full items-center justify-end gap-2 md:order-none md:w-auto">
              {(["zh-CN", "zh-TW", "en", "ja"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onLocaleChange?.(item)}
                  className={labelClass(
                    locale,
                    `min-w-8 px-2 py-1.5 text-[10px] transition-colors md:min-w-10 md:text-[11px] ${
                      locale === item
                        ? "bg-[#2fd3d5] text-[#071113]"
                        : "bg-[#13191d] text-white/48 hover:bg-[#182125] hover:text-white"
                    }`,
                  )}
                >
                  {localeLabels[item]}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main>
          <header className="relative overflow-hidden px-5 pb-5 pt-10 md:px-10 md:pb-24 md:pt-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(47,211,213,0.12),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(76,110,123,0.16),transparent_34%),linear-gradient(180deg,#0b0e11_0%,#0e1216_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.08]" />

            <div
              data-mobile-hero="entry-station"
              className="relative mx-auto block max-w-[30rem] overflow-visible lg:hidden"
            >
              <div className="relative">
                <div className="mx-auto w-full max-w-[34rem]">
                  {heroLayout === "mobile" ? (
                    <EntryStationHero imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
                  ) : (
                    <HeroPoster imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
                  )}
                </div>

                <div
                  data-mobile-hero-copy="tilted-overlay"
                  className="pointer-events-none absolute inset-[16%_7%_18%_11%] z-10 flex items-end justify-center"
                >
                  <div
                    className={`w-[70%] max-w-[17rem] ${mobileHeroCopyTransform} [transform-style:preserve-3d] text-center`}
                  >
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <span className="h-px w-7 bg-[#2fd3d5]" />
                      <span className={labelClass(locale, "text-[9px] text-[#7bdfe1]")}>
                        {copy.hero.plaque}
                      </span>
                      <span className="h-px w-7 bg-[#2fd3d5]" />
                    </div>

                    <p className={labelClass(locale, "mb-2 text-[9px] text-white/34")}>
                      {copy.metaLine}
                    </p>
                    <h1 className={headlineClass(locale, chinese ? "text-4xl" : "text-4xl")}>
                      {copy.hero.title}
                    </h1>
                    <p
                      className={`${heroAccentClass(locale, chinese)} ${
                        chinese ? "mt-2 text-[1.15rem] tracking-[0.28em]" : "mt-2 text-xl tracking-[0.1em]"
                      }`}
                    >
                      {chinese ? heroMark : "心纪元"}
                    </p>
                    <p className={bodyClass(locale, "mx-auto mt-4 max-w-[14rem] text-xs text-white/70")}>
                      {copy.hero.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mx-auto mt-6 flex max-w-[24rem] flex-col gap-3 px-1">
                <a
                  href={copy.hero.primaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center bg-[linear-gradient(135deg,#2fd3d5_0%,#11878d_100%)] px-6 py-4 text-[#081113]",
                  )}
                >
                  {copy.hero.primaryLabel}
                </a>
                <a
                  href={copy.hero.secondaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center bg-[#141a1f] px-6 py-4 text-white/82",
                  )}
                >
                  {copy.hero.secondaryLabel}
                </a>
              </div>

              <div className="relative z-10 mx-auto mt-5 flex max-w-[24rem] flex-col gap-2 px-1 text-left">
                {copy.hero.routes.map((route, index) => (
                  <div key={route.title} className="flex items-center gap-3 text-white/26">
                    <span className="font-[family-name:var(--font-label)] text-3xl tracking-[-0.05em]">
                      0{index + 1}.
                    </span>
                    <span className={labelClass(locale, "text-[10px] text-[#53d6d8]/82")}>
                      {route.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              data-medium-hero="entry-station"
              className="relative mx-auto hidden max-w-[72rem] overflow-visible lg:block xl:hidden"
            >
              <div className="relative">
                <div className="mx-auto w-full max-w-[62rem]">
                  {heroLayout === "medium" ? (
                    <EntryStationHero imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
                  ) : (
                    <HeroPoster imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
                  )}
                </div>

                <div
                  data-medium-hero-copy="tilted-overlay"
                  className="pointer-events-none absolute inset-[10%_7%_21%_50%] z-10 flex items-end justify-end"
                >
                  <div className="w-[min(26rem,78%)] [transform:rotateX(12deg)_rotateY(-18deg)_rotateZ(-1.9deg)_translate3d(0,0,48px)] [transform-style:preserve-3d] text-left">
                    <div className="mb-4 flex items-center gap-4">
                      <span className="h-px w-10 bg-[#2fd3d5]" />
                      <span className={labelClass(locale, "text-[10px] text-[#7bdfe1] md:text-xs")}>
                        {copy.hero.plaque}
                      </span>
                    </div>

                    <p className={labelClass(locale, "mb-4 text-[10px] text-white/28 md:text-xs")}>
                      {copy.metaLine}
                    </p>
                    <h1
                      className={headlineClass(
                        locale,
                        chinese ? "text-5xl xl:text-6xl" : "text-5xl xl:text-6xl",
                      )}
                    >
                      {copy.hero.title}
                    </h1>
                    <p
                      className={`${heroAccentClass(locale, chinese)} ${
                        chinese
                          ? "mt-3 text-sm tracking-[0.38em] xl:text-base"
                          : "mt-3 text-2xl tracking-[0.14em] xl:text-[2rem]"
                      }`}
                    >
                      {chinese ? heroMark : "心纪元"}
                    </p>
                    <p
                      className={bodyClass(
                        locale,
                        chinese
                          ? "mt-6 max-w-xl text-sm text-white/68 md:text-base"
                          : "mt-6 max-w-xl text-base text-white/72 md:text-lg",
                      )}
                    >
                      {copy.hero.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mx-auto mt-6 flex max-w-[62rem] flex-col gap-3 px-4 sm:flex-row sm:justify-center lg:justify-end">
                <MagneticAnchor
                  href={copy.hero.primaryHref}
                  target="_blank"
                  rel="noreferrer"
                  targetName="hero-primary"
                  maxOffsetX={8}
                  maxOffsetY={6}
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center gap-3 bg-[linear-gradient(135deg,#2fd3d5_0%,#11878d_100%)] px-7 py-4 text-[#081113] transition-transform duration-300 hover:-translate-y-0.5",
                  )}
                >
                  <span className="magnetic-layer">{copy.hero.primaryLabel}</span>
                  <span className="magnetic-layer-strong">↗</span>
                </MagneticAnchor>
                <a
                  href={copy.hero.secondaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center bg-[#141a1f] px-7 py-4 text-white/84 transition-colors duration-300 hover:bg-[#1b2429] hover:text-white",
                  )}
                >
                  {copy.hero.secondaryLabel}
                </a>
              </div>
            </div>

            <div className="relative mx-auto hidden max-w-7xl items-center gap-12 xl:grid xl:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.98fr)]">
              <m.div
                className="order-2 lg:order-1"
                variants={sectionReveal}
                initial="hidden"
                animate="visible"
              >
                {heroLayout === "desktop" ? (
                  <EntryStationHero imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
                ) : (
                  <HeroPoster imageAlt="Xin Era entry station scene" imageSrc={HERO_IMAGE} />
                )}
              </m.div>

              <m.div
                className="order-1 flex flex-col justify-center lg:order-2"
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
              >
                <m.div variants={riseIn} className="mb-4 flex items-center gap-4">
                  <span className="h-px w-12 bg-[#2fd3d5]" />
                  <span className={labelClass(locale, "text-[11px] text-[#7bdfe1] md:text-xs")}>
                    {copy.hero.plaque}
                  </span>
                </m.div>

                <m.div variants={riseIn}>
                  <p className={labelClass(locale, "mb-4 text-[10px] text-white/28 md:text-xs")}>
                    {copy.metaLine}
                  </p>
                  <h1
                    className={headlineClass(
                      locale,
                      chinese ? "text-5xl md:text-7xl lg:text-[5.1rem]" : "text-5xl md:text-7xl",
                    )}
                  >
                    {copy.hero.title}
                  </h1>
                  <p
                    className={
                      chinese
                        ? "mt-3 font-[family-name:var(--font-label)] text-sm tracking-[0.38em] text-[#53d6d8] uppercase md:text-base"
                        : "mt-3 font-pixel text-2xl tracking-[0.14em] text-[#53d6d8] md:text-[2rem]"
                    }
                  >
                    {chinese ? heroMark : "心纪元"}
                  </p>
                </m.div>

                <m.p
                  variants={riseIn}
                  className={bodyClass(
                    locale,
                    chinese
                      ? "mt-6 max-w-xl text-sm text-white/68 md:text-base"
                      : "mt-6 max-w-xl text-base text-white/72 md:text-lg",
                  )}
                >
                  {copy.hero.description}
                </m.p>

                <m.div variants={riseIn} className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <MagneticAnchor
                    href={copy.hero.primaryHref}
                    target="_blank"
                    rel="noreferrer"
                    targetName="hero-primary"
                    maxOffsetX={8}
                    maxOffsetY={6}
                    className={labelClass(
                      locale,
                      "inline-flex items-center justify-center gap-3 bg-[linear-gradient(135deg,#2fd3d5_0%,#11878d_100%)] px-7 py-4 text-[#081113] transition-transform duration-300 hover:-translate-y-0.5",
                    )}
                  >
                    <span className="magnetic-layer">{copy.hero.primaryLabel}</span>
                    <span className="magnetic-layer-strong">↗</span>
                  </MagneticAnchor>
                  <a
                    href={copy.hero.secondaryHref}
                    target="_blank"
                    rel="noreferrer"
                    className={labelClass(
                      locale,
                      "inline-flex items-center justify-center bg-[#141a1f] px-7 py-4 text-white/84 transition-colors duration-300 hover:bg-[#1b2429] hover:text-white",
                    )}
                  >
                    {copy.hero.secondaryLabel}
                  </a>
                </m.div>

                <m.div
                  variants={riseIn}
                  className="mt-7 bg-[#11171b] px-5 py-4 text-left shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
                >
                  <p className={labelClass(locale, "text-[10px] text-[#53d6d8] md:text-xs")}>
                    {copy.hero.panelTitle}
                  </p>
                  <p className={bodyClass(locale, "mt-3 max-w-lg text-sm text-white/56")}>
                    {copy.hero.panelSubtitle}
                  </p>
                </m.div>

                {copy.hero.note ? (
                  <m.p
                    variants={riseIn}
                    className={bodyClass(locale, "mt-4 max-w-xl text-[10px] text-white/34 md:text-xs")}
                  >
                    {copy.hero.note}
                  </m.p>
                ) : null}
              </m.div>
            </div>
          </header>

          <div>
            <SignalBand
              bandId="world-entry"
              items={signalBandItems}
              className="border-y border-white/6"
              trackClassName="gap-4 px-4 py-3 md:gap-6 md:px-4 md:py-[0.85rem]"
              itemClassName={labelClass(
                locale,
                "text-[9px] tracking-[0.18em] text-white/32 md:text-xs md:tracking-[0.22em] md:text-white/34",
              )}
            />
          </div>

          <m.section
            data-mobile-route-summary="desktop-only"
            className="hidden bg-[#11151a] px-5 py-9 md:block md:px-10 md:py-20"
            variants={sectionReveal}
            initial={false}
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[minmax(0,1.1fr)_320px] md:items-end">
              <div>
                <p className={labelClass(locale, "mb-3 text-[10px] text-[#53d6d8] md:text-xs")}>
                  {copy.hero.panelTitle}
                </p>
                <h2 className={sectionHeadingClass(locale, chinese ? "text-3xl md:text-4xl" : "text-4xl")}>
                  {copy.gallery.rightCard.title}
                </h2>
                <p className={bodyClass(locale, "mt-5 max-w-2xl text-sm text-white/64 md:text-base")}>
                  {copy.gallery.rightCard.description}
                </p>
              </div>

              <div className="space-y-2 text-left md:text-right">
                {copy.hero.routes.map((route, index) => (
                  <div key={route.title} className="text-white/22">
                    <span className="font-[family-name:var(--font-label)] text-4xl tracking-[-0.04em] md:text-5xl">
                      0{index + 1}.
                    </span>
                    <span className={sectionHeadingClass(locale, chinese ? "ml-3 text-lg" : "ml-3 text-xl")}>
                      {route.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </m.section>

          <m.section
            className="bg-[#0e1216] px-5 py-20 md:px-10"
            variants={sectionReveal}
            initial={false}
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={labelClass(locale, "mb-3 text-[10px] text-[#53d6d8] md:text-xs")}>
                    {copy.hero.panelTitle}
                  </p>
                  <h2 className={sectionHeadingClass(locale, chinese ? "text-3xl md:text-4xl" : "text-4xl")}>
                    {copy.hero.panelTitle}
                  </h2>
                </div>
                <p className={bodyClass(locale, "max-w-2xl text-sm text-white/52 md:text-right")}>
                  {copy.hero.panelSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {copy.hero.routes.map((route, index) => (
                  <a
                    key={route.title}
                    href={route.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative flex min-h-[13rem] flex-col justify-between overflow-hidden bg-[#141a1f] p-7 transition-transform duration-300 hover:-translate-y-1 md:aspect-[4/5] md:min-h-0"
                  >
                    <img
                      src={ROUTE_IMAGES[index % ROUTE_IMAGES.length]}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-[0.38] grayscale transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-[0.5]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,11,0.24),rgba(5,8,11,0.86))]" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(83,214,216,0),rgba(83,214,216,0.9),rgba(83,214,216,0))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="relative">
                      <p className={labelClass(locale, "text-[10px] text-[#53d6d8] md:text-xs")}>
                        0{index + 1}
                      </p>
                      <p className={labelClass(locale, "mt-4 text-[10px] text-white/44 md:text-xs")}>
                        {route.audience}
                      </p>
                      <h3 className={sectionHeadingClass(locale, chinese ? "mt-3 text-2xl" : "mt-3 text-[2rem]")}>
                        {route.title}
                      </h3>
                    </div>

                    <div className="relative">
                      <p className={bodyClass(locale, "text-sm text-white/60")}>{route.description}</p>
                      <div className="mt-6 flex items-center justify-between text-[#53d6d8]">
                        <span className={labelClass(locale, "text-[10px] md:text-xs")}>
                          {route.title}
                        </span>
                        <span className="font-[family-name:var(--font-label)] text-sm">↗</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </m.section>

          <m.section
            id="core"
            className="bg-[#11151a] px-5 py-24 md:px-10"
            variants={sectionReveal}
            initial={false}
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="mx-auto max-w-7xl">
              <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className={labelClass(locale, "mb-3 text-[10px] text-[#53d6d8] md:text-xs")}>
                    {copy.core.ghost}
                  </p>
                  <h2 className={sectionHeadingClass(locale, chinese ? "text-3xl md:text-4xl" : "text-4xl")}>
                    {copy.core.title}
                  </h2>
                  <p className={bodyClass(locale, "mt-5 text-sm text-white/62 md:text-base")}>
                    {copy.core.description}
                  </p>
                </div>
                <a
                  href={copy.gallery.rightCard.href}
                  target="_blank"
                  rel="noreferrer"
                  className={labelClass(locale, "text-[10px] text-white/42 transition-colors hover:text-[#53d6d8] md:text-xs")}
                >
                  {copy.gallery.rightCard.action}
                </a>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                <div className="relative overflow-hidden bg-[#151b20]">
                  <img
                    src={SHOWCASE_IMAGE}
                    alt="Xin Era showcase"
                    className="h-full w-full object-cover opacity-[0.55] grayscale"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,11,0.08),rgba(6,8,11,0.88))]" />
                  <div className="absolute inset-x-0 bottom-0 p-7 md:p-10">
                    <p className={labelClass(locale, "text-[10px] text-[#53d6d8] md:text-xs")}>
                      {copy.core.cards[0]?.tag}
                    </p>
                    <h3 className={sectionHeadingClass(locale, chinese ? "mt-3 text-2xl md:text-3xl" : "mt-3 text-3xl")}>
                      {copy.core.cards[0]?.title}
                    </h3>
                    <p className={bodyClass(locale, "mt-4 max-w-xl text-sm text-white/66")}>
                      {copy.core.cards[0]?.description}
                    </p>
                  </div>
                </div>

                <a
                  href={copy.gallery.rightCard.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col justify-between bg-[#151b20] p-7 transition-colors duration-300 hover:bg-[#182126]"
                >
                  <div>
                    <p className={labelClass(locale, "text-[10px] text-white/42 md:text-xs")}>
                      {copy.gallery.rightCard.title}
                    </p>
                    <h3 className={sectionHeadingClass(locale, chinese ? "mt-3 text-2xl" : "mt-3 text-[2rem]")}>
                      {copy.gallery.rightCard.action}
                    </h3>
                    <p className={bodyClass(locale, "mt-4 text-sm text-white/58")}>
                      {copy.gallery.rightCard.description}
                    </p>
                  </div>
                  <span className={labelClass(locale, "mt-8 text-[10px] text-[#53d6d8] md:text-xs")}>
                    {copy.gallery.rightCard.action}
                  </span>
                </a>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {copy.core.cards.slice(1).map((card) => (
                  <div key={card.title} className="bg-[#151b20] p-7">
                    <div className="flex items-start justify-between gap-4">
                      <span className={labelClass(locale, "text-[10px] text-white/42 md:text-xs")}>
                        {card.tag}
                      </span>
                      <span className="text-[#53d6d8]">{card.symbol}</span>
                    </div>
                    <h3 className={sectionHeadingClass(locale, chinese ? "mt-6 text-2xl" : "mt-6 text-[2rem]")}>
                      {card.title}
                    </h3>
                    <p className={bodyClass(locale, "mt-4 text-sm text-white/58")}>{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </m.section>

          <m.section
            id="access"
            className="bg-[#0d1013] px-5 py-24 md:px-10"
            variants={sectionReveal}
            initial={false}
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={labelClass(locale, "mb-3 text-[10px] text-[#53d6d8] md:text-xs")}>
                    {copy.metaLine}
                  </p>
                  <h2 className={sectionHeadingClass(locale, chinese ? "text-3xl md:text-4xl" : "text-4xl")}>
                    {copy.access.title}
                  </h2>
                </div>
                <p className={bodyClass(locale, "max-w-2xl text-sm text-white/52 md:text-right")}>
                  {copy.access.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {copy.access.cards.map((card) => (
                  <MagneticAnchor
                    key={card.title}
                    href={card.href}
                    target="_blank"
                    rel="noreferrer"
                    targetName="access-card"
                    maxOffsetX={6}
                    maxOffsetY={5}
                    className="group flex min-h-[260px] flex-col justify-between bg-[#14191d] p-7 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={labelClass(locale, "text-[10px] text-white/42 md:text-xs")}>
                        {card.tag}
                      </span>
                      <span className="magnetic-layer-strong text-[#53d6d8] opacity-60 transition-opacity group-hover:opacity-100">
                        {card.symbol}
                      </span>
                    </div>

                    <div className="mt-8">
                      <h3 className={sectionHeadingClass(locale, chinese ? "text-2xl" : "text-[2rem]")}>
                        {card.title}
                      </h3>
                      <p className={bodyClass(locale, "mt-4 text-sm text-white/58")}>{card.description}</p>
                    </div>

                    <div className="magnetic-line mt-8 h-px bg-[linear-gradient(90deg,rgba(83,214,216,0.42),rgba(83,214,216,0))]" />
                  </MagneticAnchor>
                ))}
              </div>
            </div>
          </m.section>

          <m.section
            className="relative overflow-hidden bg-[#11161a] px-5 py-[5.5rem] md:px-10 md:py-24"
            variants={sectionReveal}
            initial={false}
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <img
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.1]"
              alt=""
              aria-hidden="true"
              src={DISPATCH_BACKGROUND}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,17,0.38),rgba(11,14,17,0.88))]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(83,214,216,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(83,214,216,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.08]" />

            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <p className={labelClass(locale, "text-[10px] text-[#53d6d8] md:text-xs")}>
                {copy.metaLine}
              </p>
              <h2
                className={sectionHeadingClass(
                  locale,
                  chinese ? "mt-4 text-3xl md:text-5xl" : "mt-4 text-4xl md:text-6xl",
                )}
              >
                {copy.dispatch.title}
              </h2>
              <p
                className={
                  chinese
                    ? "mt-4 font-[family-name:var(--font-label)] text-base tracking-[0.34em] text-[#53d6d8] uppercase md:text-xl"
                    : "mt-4 font-pixel text-2xl tracking-[0.12em] text-[#53d6d8] md:text-3xl"
                }
              >
                {chinese ? heroMark : "心纪元"}
              </p>
              <p className={bodyClass(locale, "mx-auto mb-10 mt-5 max-w-3xl text-sm text-white/62 md:text-base")}>
                {copy.dispatch.description}
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={copy.dispatch.primaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center bg-[linear-gradient(135deg,#2fd3d5_0%,#11878d_100%)] px-8 py-4 text-[#081113]",
                  )}
                >
                  {copy.dispatch.primaryLabel}
                </a>
                <a
                  href={copy.dispatch.secondaryHref}
                  target="_blank"
                  rel="noreferrer"
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center bg-[#14191d] px-8 py-4 text-white/84 transition-colors duration-300 hover:bg-[#1b2429]",
                  )}
                >
                  {copy.dispatch.secondaryLabel}
                </a>
              </div>
            </div>
          </m.section>
        </main>

        <footer className="bg-[#090c0f] px-5 py-10 pb-28 md:px-10 md:pb-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <div className="font-[family-name:var(--font-label)] text-sm tracking-[0.24em] text-white/34 uppercase">
                  {copy.brand}
                </div>
                {copy.footer.note ? (
                  <p className={bodyClass(locale, "mt-3 text-sm text-white/36")}>{copy.footer.note}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-5">
                {copy.footer.links.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={labelClass(locale, "text-[10px] text-white/38 transition-colors hover:text-white md:text-xs")}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2 border-t border-white/6 pt-5 text-left md:flex-row md:items-center md:justify-between">
              <p className={labelClass(locale, "text-[10px] text-white/24 md:text-xs")}>
                {copy.footer.filingLabel}
              </p>
              <a
                href={copy.footer.filingHref}
                target="_blank"
                rel="noreferrer noopener"
                className={labelClass(locale, "text-[10px] text-white/34 transition-colors hover:text-[#53d6d8] md:text-xs")}
              >
                {copy.footer.filingNumber}
              </a>
            </div>
          </div>
        </footer>

        <MobileEntryDock
          activeHref={activeNavHref}
          items={copy.mobileDock}
          labelClassName={labelClass(locale, "")}
        />
      </div>
    </LazyMotion>
  );
}
