"use client";

import React from "react";
import { LazyMotion, domAnimation, m, type Variants } from "motion/react";

import {
  landingCopy,
  localeLabels,
  type SupportedLocale,
  isChineseLocale,
} from "./i18n";

type LandingPageShellProps = {
  locale: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
};

const HERO_IMAGE = "/images/landing/xinera-cathedral.png";
const PANEL_IMAGE = "/images/landing/xinera-city-blur.jpg";
const GALLERY_LEFT = "/images/landing/xinera-battle.png";
const GALLERY_RIGHT = "/images/hero-image.png";
const DISPATCH_BACKGROUND = "/images/landing/xinera-city-blur.jpg";

const staggerChildren: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const riseIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function headingClass(locale: SupportedLocale, size: string) {
  return isChineseLocale(locale)
    ? `font-pixel ${size} leading-[1.08] tracking-[0.08em] text-primary-fixed-dim`
    : `font-[family-name:var(--font-display)] ${size} leading-[0.98] tracking-tight text-primary-fixed-dim`;
}

function bodyClass(locale: SupportedLocale, extra = "") {
  return `${isChineseLocale(locale) ? "font-pixel leading-[1.85]" : "font-[family-name:var(--font-body)] leading-relaxed"} ${extra}`;
}

function labelClass(locale: SupportedLocale, extra = "") {
  return `${isChineseLocale(locale) ? "font-pixel tracking-[0.24em]" : "font-[family-name:var(--font-label)] tracking-[0.24em] uppercase"} ${extra}`;
}

export default function LandingPageShell({
  locale,
  onLocaleChange,
}: LandingPageShellProps) {
  const copy = landingCopy[locale];
  const chinese = isChineseLocale(locale);

  return (
    <LazyMotion features={domAnimation}>
      <div
        data-locale={locale}
        data-script={chinese ? "bitmap-cjk" : "editorial-latin"}
        className="bg-background text-on-background"
      >
        <nav className="sticky top-0 z-50 w-full border-b border-stone-800/60 bg-stone-950/72 px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-display)] text-lg tracking-[0.18em] text-[#C5A059] uppercase md:text-2xl">
                {copy.brand}
              </div>
              <p className={labelClass(locale, "mt-1 text-[10px] text-stone-500 md:text-xs")}>
                {copy.metaLine}
              </p>
            </div>

            <div className="hidden items-center gap-8 md:flex">
              {copy.nav.map((item) => (
                <a
                  key={item.label}
                  className="text-stone-400 transition-colors duration-300 hover:text-[#E9C176]"
                  href={item.href}
                >
                  <span className={labelClass(locale, "text-[11px]")}>{item.label}</span>
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {(["zh-CN", "zh-TW", "en", "ja"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onLocaleChange?.(item)}
                  className={`min-w-10 px-2 py-1.5 text-[11px] transition-colors ${labelClass(
                    locale,
                    locale === item
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low text-stone-400 hover:text-primary",
                  )}`}
                >
                  {localeLabels[item]}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main>
          <section className="relative isolate flex min-h-[calc(100svh-73px)] items-center overflow-hidden md:min-h-[calc(100svh-77px)]">
            <div className="absolute inset-0 z-0">
              <m.img
                className="h-full w-full object-cover opacity-55 brightness-[0.38]"
                alt="Xin Era hero scene"
                src={HERO_IMAGE}
                initial={{ scale: 1.08 }}
                animate={{
                  scale: [1.08, 1.12, 1.08],
                  x: [0, 12, -8, 0],
                  y: [0, -8, 6, 0],
                }}
                transition={{
                  duration: 22,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <div className="vignette absolute inset-0" />
              <div className="grid-overlay absolute inset-0" />
              <m.div
                className="ambient-orb absolute left-[-10%] top-[10%] h-[340px] w-[340px] rounded-full"
                animate={{
                  x: [0, 18, -10, 0],
                  y: [0, -12, 10, 0],
                  scale: [1, 1.06, 0.98, 1],
                }}
                transition={{
                  duration: 18,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <m.div
                className="ambient-orb absolute bottom-[-8%] right-[-6%] h-[300px] w-[300px] rounded-full opacity-80"
                animate={{
                  x: [0, -20, 10, 0],
                  y: [0, 14, -8, 0],
                  scale: [0.94, 1.02, 1, 0.94],
                }}
                transition={{
                  duration: 20,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <div className="hero-rings absolute inset-0 opacity-70" />
              <m.div
                className="scan-beam absolute inset-y-0 left-[-35%] w-[55%]"
                animate={{ x: ["0%", "155%"] }}
                transition={{
                  duration: 8,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1.4,
                  ease: "easeInOut",
                }}
              />
            </div>

            <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 md:px-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
              <m.div
                className="text-center md:text-left"
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
              >
                <m.div variants={riseIn} className="mb-5 flex justify-center md:justify-start">
                  <div className="relative border border-primary/20 bg-surface-container-low/45 px-4 py-2 backdrop-blur-md md:px-5">
                    <div className="corner-bracket-tl" />
                    <div className="corner-bracket-tr" />
                    <div className="corner-bracket-bl" />
                    <div className="corner-bracket-br" />
                    <span className={labelClass(locale, "text-[10px] text-primary md:text-xs")}>
                      {copy.hero.plaque}
                    </span>
                  </div>
                </m.div>

                <m.h1
                  variants={riseIn}
                  className={headingClass(
                    locale,
                    chinese
                      ? "text-4xl sm:text-5xl md:text-7xl lg:text-[5.75rem]"
                      : "text-5xl sm:text-6xl md:text-[6.75rem]",
                  )}
                >
                  {copy.hero.title}
                </m.h1>

                <m.p
                  variants={riseIn}
                  className={bodyClass(
                    locale,
                    chinese
                      ? "mx-auto mt-5 max-w-3xl text-base text-on-surface-variant md:mx-0 md:text-lg"
                      : "mx-auto mt-5 max-w-3xl text-lg italic text-on-surface-variant md:mx-0 md:text-[1.45rem]",
                  )}
                >
                  {copy.hero.description}
                </m.p>

                <m.div
                  variants={riseIn}
                  className="mt-8 flex flex-col items-center gap-4 md:flex-row md:items-start"
                >
                  <m.a
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={labelClass(
                      locale,
                      "brass-gradient inline-flex items-center gap-3 px-7 py-4 font-bold text-on-primary shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition-shadow hover:shadow-[0_18px_42px_rgba(233,193,118,0.26)] md:px-10",
                    )}
                    href={copy.hero.primaryHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{copy.hero.primaryLabel}</span>
                    <span>↗</span>
                  </m.a>
                  <m.a
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.99 }}
                    className={labelClass(
                      locale,
                      "inline-flex items-center justify-center border border-primary/35 bg-surface-container-highest/20 px-7 py-4 text-primary transition-colors hover:bg-primary/10 md:px-9",
                    )}
                    href={copy.hero.secondaryHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.hero.secondaryLabel}
                  </m.a>
                </m.div>

                <m.p
                  variants={riseIn}
                  className={bodyClass(
                    locale,
                    "mx-auto mt-4 max-w-2xl text-[11px] text-stone-500 md:mx-0 md:text-xs",
                  )}
                >
                  {copy.hero.note}
                </m.p>
              </m.div>

              <m.aside
                variants={sectionReveal}
                initial="hidden"
                animate="visible"
                className="relative"
              >
                <div className="hero-panel relative overflow-hidden border border-primary/15 bg-stone-950/72 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl md:p-6">
                  <img
                    className="absolute inset-0 h-full w-full object-cover opacity-[0.14] saturate-[0.9]"
                    alt=""
                    aria-hidden="true"
                    src={PANEL_IMAGE}
                  />
                  <div className="paper-texture absolute inset-0 opacity-10" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

                  <div className="relative">
                    <p className={labelClass(locale, "text-[10px] text-primary/80 md:text-xs")}>
                      {copy.hero.panelTitle}
                    </p>
                    <p className={bodyClass(locale, "mt-3 text-sm text-stone-400")}>
                      {copy.hero.panelSubtitle}
                    </p>
                  </div>

                  <div className="relative mt-5 space-y-3">
                    {copy.hero.routes.map((route, index) => (
                      <m.a
                        key={route.title}
                        whileHover={{ x: 4, y: -2 }}
                        className="group block border border-stone-800/80 bg-stone-900/65 p-4 transition-colors hover:border-primary/40 hover:bg-stone-900"
                        href={route.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={labelClass(locale, "text-[10px] text-stone-500")}>
                              {route.audience}
                            </p>
                            <h2
                              className={
                                chinese
                                  ? "mt-2 font-pixel text-xl tracking-[0.08em] text-primary"
                                  : "mt-2 font-[family-name:var(--font-display)] text-[1.45rem] text-primary"
                              }
                            >
                              {route.title}
                            </h2>
                          </div>
                          <span className="font-[family-name:var(--font-label)] text-xs tracking-[0.24em] text-stone-600 transition-colors group-hover:text-primary/90">
                            0{index + 1}
                          </span>
                        </div>
                        <p className={bodyClass(locale, "mt-3 text-xs text-stone-400")}>
                          {route.description}
                        </p>
                      </m.a>
                    ))}
                  </div>
                </div>
              </m.aside>
            </div>
          </section>

          <m.section
            id="core"
            className="relative overflow-hidden bg-surface-container-low px-5 py-24 md:px-10"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="grid-overlay absolute inset-0" />
            <div className="relative z-10 mx-auto max-w-7xl">
              <div className="mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <h2 className={headingClass(locale, chinese ? "text-4xl md:text-5xl" : "text-5xl")}>
                    {copy.core.title}
                  </h2>
                  <div className="mb-5 mt-4 h-px w-24 bg-primary/30" />
                  <p className={bodyClass(locale, "text-on-surface-variant")}>
                    {copy.core.description}
                  </p>
                </div>
                <div className="font-[family-name:var(--font-display)] text-4xl uppercase text-surface-container-highest opacity-45 md:text-6xl">
                  {copy.core.ghost}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {copy.core.cards.map((card, index) => (
                  <m.div
                    key={card.title}
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className={`group relative overflow-hidden p-8 md:p-10 ${
                      index % 2 === 0 ? "bg-surface-container" : "bg-surface-container-high"
                    }`}
                  >
                    <div className="corner-bracket-tl opacity-30 group-hover:opacity-100" />
                    <div className="corner-bracket-br opacity-30 group-hover:opacity-100" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <span className={labelClass(locale, "text-[10px] text-outline")}>
                        {card.tag}
                      </span>
                      <span className="text-4xl text-primary md:text-5xl">{card.symbol}</span>
                    </div>
                    <h3
                      className={
                        chinese
                          ? "font-pixel text-2xl tracking-[0.08em] text-primary-fixed-dim"
                          : "font-[family-name:var(--font-display)] text-2xl text-primary-fixed-dim"
                      }
                    >
                      {card.title}
                    </h3>
                    <p className={bodyClass(locale, "mt-4 text-sm text-on-surface-variant")}>
                      {card.description}
                    </p>
                    <div className="status-line mt-8 opacity-60" />
                  </m.div>
                ))}
              </div>
            </div>
          </m.section>

          <m.section
            className="flex flex-col md:h-[614px] md:flex-row"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <m.div whileHover={{ scale: 1.01 }} className="group relative min-h-[320px] flex-1 overflow-hidden">
              <m.img
                className="h-full w-full object-cover"
                alt="Xin Era battle scene"
                src={GALLERY_LEFT}
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <div className="absolute inset-0 bg-primary/10 transition-colors duration-500 group-hover:bg-primary/5" />
            </m.div>

            <m.div
              whileHover={{ scale: 1.01 }}
              className="group relative min-h-[320px] flex-1 overflow-hidden border-l border-primary/20"
            >
              <m.img
                className="h-full w-full object-cover"
                alt="Xin Era cathedral hall"
                src={GALLERY_RIGHT}
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,19,19,0.18),rgba(19,19,19,0.5))] transition-opacity duration-500 group-hover:opacity-90" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,rgba(19,19,19,0),rgba(19,19,19,0.78))]" />
              <div className="absolute inset-0 flex items-end justify-start p-6 md:p-10">
                <div className="relative max-w-[440px] overflow-hidden border border-primary/20 bg-stone-950/86 p-7 text-left shadow-[0_24px_60px_rgba(0,0,0,0.42)] backdrop-blur-sm md:p-9">
                  <div className="paper-texture absolute inset-0 opacity-[0.08]" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <div className="corner-bracket-tl opacity-60" />
                  <div className="corner-bracket-br opacity-60" />
                  <div className="relative">
                    <p className={labelClass(locale, "text-[10px] text-stone-500 md:text-xs")}>
                      {chinese ? "持续更新" : "Ongoing Archive"}
                    </p>
                    <h3
                      className={
                        chinese
                          ? "font-pixel text-3xl tracking-[0.08em] text-primary"
                          : "font-[family-name:var(--font-display)] text-3xl text-primary"
                      }
                    >
                      {copy.gallery.rightCard.title}
                    </h3>
                    <p className={bodyClass(locale, "mb-7 mt-4 text-sm text-stone-200")}>
                      {copy.gallery.rightCard.description}
                    </p>
                    <a
                      className={labelClass(
                        locale,
                        "inline-block border-b-2 border-primary pb-1 text-xs text-primary transition-all hover:border-white hover:text-white",
                      )}
                      href={copy.gallery.rightCard.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {copy.gallery.rightCard.action}
                    </a>
                  </div>
                </div>
              </div>
            </m.div>
          </m.section>

          <m.section
            id="access"
            className="bg-background px-5 py-24 md:px-10"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 border-b border-primary/10 pb-8">
                <h2 className={headingClass(locale, chinese ? "text-4xl md:text-5xl" : "text-4xl")}>
                  {copy.access.title}
                </h2>
                <p className={bodyClass(locale, "mt-4 max-w-3xl text-sm text-outline md:text-base")}>
                  {copy.access.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {copy.access.cards.map((card) => (
                  <m.a
                    key={card.title}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="group hover-amber-glow flex min-h-[280px] flex-col justify-between border border-outline-variant bg-surface-container-lowest p-7 transition-colors hover:border-primary"
                    href={card.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={labelClass(locale, "text-[10px] text-outline")}>
                        {card.tag}
                      </span>
                      <span className="text-primary opacity-40 transition-opacity group-hover:opacity-100">
                        {card.symbol}
                      </span>
                    </div>
                    <div className="mt-8">
                      <h3
                        className={
                          chinese
                            ? "font-pixel text-xl tracking-[0.08em] text-primary-container"
                            : "font-[family-name:var(--font-display)] text-[1.45rem] text-primary-container"
                        }
                      >
                        {card.title}
                      </h3>
                      <p className={bodyClass(locale, "mt-3 text-sm text-outline")}>
                        {card.description}
                      </p>
                    </div>
                    <div className="status-line mt-8" />
                  </m.a>
                ))}
              </div>
            </div>
          </m.section>

          <m.section
            className="relative overflow-hidden bg-surface-container-high px-5 py-20 md:px-10"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <img
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]"
              alt=""
              aria-hidden="true"
              src={DISPATCH_BACKGROUND}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(19,19,19,0.45),rgba(19,19,19,0.9))]" />
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <h2
                className={
                  chinese
                    ? "font-pixel text-3xl tracking-[0.08em] text-on-surface md:text-4xl"
                    : "font-[family-name:var(--font-display)] text-3xl text-on-surface md:text-4xl"
                }
              >
                {copy.dispatch.title}
              </h2>
              <p className={bodyClass(locale, "mx-auto mb-10 mt-5 max-w-3xl text-on-surface-variant")}>
                {copy.dispatch.description}
              </p>
              <div className="flex flex-col justify-center gap-4 md:flex-row">
                <m.a
                  whileHover={{ y: -3, scale: 1.01 }}
                  className={labelClass(
                    locale,
                    "brass-gradient inline-flex items-center justify-center px-8 py-4 font-bold text-on-primary",
                  )}
                  href={copy.dispatch.primaryHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.dispatch.primaryLabel}
                </m.a>
                <m.a
                  whileHover={{ y: -3 }}
                  className={labelClass(
                    locale,
                    "inline-flex items-center justify-center border border-primary/40 bg-surface-container-lowest px-8 py-4 text-primary",
                  )}
                  href={copy.dispatch.secondaryHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.dispatch.secondaryLabel}
                </m.a>
              </div>
            </div>
          </m.section>
        </main>

        <footer className="w-full border-t border-stone-800/50 bg-stone-950 px-5 py-12 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="flex max-w-xl flex-col gap-3">
                <div className="font-[family-name:var(--font-display)] text-lg uppercase tracking-widest text-stone-500">
                  {copy.brand}
                </div>
                <p className={bodyClass(locale, "text-sm text-stone-500")}>{copy.footer.note}</p>
              </div>

              <div className="flex flex-wrap gap-6">
                {copy.footer.links.map((item) => (
                  <a
                    key={item.label}
                    className={labelClass(
                      locale,
                      "text-[10px] text-stone-500 transition-colors duration-300 hover:text-stone-300 md:text-xs",
                    )}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-stone-800/80 pt-6 text-center">
              <p className={labelClass(locale, "mb-2 text-[10px] text-stone-600 md:text-xs")}>
                {copy.footer.filingLabel}
              </p>
              <a
                className={labelClass(
                  locale,
                  "inline-flex items-center justify-center text-[10px] text-stone-400 transition-colors duration-300 hover:text-primary md:text-xs",
                )}
                href={copy.footer.filingHref}
                target="_blank"
                rel="noreferrer noopener"
              >
                {copy.footer.filingNumber}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </LazyMotion>
  );
}
