"use client";

import { useEffect, useState } from "react";

import LandingPageShell from "./landing-page-shell";
import {
  resolveLocaleFromNavigator,
  type SupportedLocale,
  landingCopy,
} from "./i18n";

const STORAGE_KEY = "xinera-locale";

export default function LandingPage({
  initialLocale,
}: {
  initialLocale: SupportedLocale;
}) {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    const resolved = stored ?? resolveLocaleFromNavigator(window.navigator.languages);

    if (resolved && resolved !== locale) {
      setLocale(resolved);
    }
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = landingCopy[locale].htmlLang;
  }, [locale]);

  function handleLocaleChange(nextLocale: SupportedLocale) {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    setLocale(nextLocale);
  }

  return <LandingPageShell locale={locale} onLocaleChange={handleLocaleChange} />;
}
