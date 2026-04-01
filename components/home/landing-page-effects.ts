import type { LandingPageCopy } from "./i18n";

type MagneticRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type SectionViewportSample = {
  height: number;
  href: string;
  top: number;
};

export function resolveMagneticTranslation(input: {
  clientX: number;
  clientY: number;
  maxOffsetX?: number;
  maxOffsetY?: number;
  rect: MagneticRect;
}) {
  const maxOffsetX = input.maxOffsetX ?? 8;
  const maxOffsetY = input.maxOffsetY ?? 6;
  const centerX = input.rect.left + input.rect.width / 2;
  const centerY = input.rect.top + input.rect.height / 2;
  const normalizedX = (input.clientX - centerX) / (input.rect.width / 2 || 1);
  const normalizedY = (input.clientY - centerY) / (input.rect.height / 2 || 1);
  const clampedX = Math.max(-1, Math.min(1, normalizedX));
  const clampedY = Math.max(-1, Math.min(1, normalizedY));
  const intensity = Math.min(1, Math.hypot(clampedX, clampedY));

  return {
    intensity,
    x: Number((clampedX * maxOffsetX).toFixed(2)),
    y: Number((clampedY * maxOffsetY).toFixed(2)),
  };
}

function isSectionHref(href: string) {
  return href.startsWith("#") && href.length > 1;
}

function normalizeHash(hash?: string | null) {
  if (!hash) {
    return null;
  }

  const startIndex = hash.indexOf("#");
  const candidate = (startIndex >= 0 ? hash.slice(startIndex) : hash).trim();

  if (!candidate.startsWith("#")) {
    return null;
  }

  const sectionId = candidate.slice(1).split(/[?&]/)[0]?.trim();
  return sectionId ? `#${sectionId}` : null;
}

export function resolveActiveNavHref(
  nav: Array<{ href: string }>,
  hash?: string | null,
) {
  const sectionHrefs = nav.map((item) => item.href).filter(isSectionHref);

  if (!sectionHrefs.length) {
    return null;
  }

  const normalizedHash = normalizeHash(hash);
  return normalizedHash && sectionHrefs.includes(normalizedHash)
    ? normalizedHash
    : sectionHrefs[0];
}

export function resolveScrollActiveNavHref(
  sections: SectionViewportSample[],
  viewportHeight: number,
) {
  if (!sections.length) {
    return null;
  }

  const focusLine = Math.max(120, viewportHeight * 0.45);
  const visibleSections = sections.filter((section) => {
    const bottom = section.top + section.height;
    return bottom > 0 && section.top < viewportHeight;
  });
  const candidates = visibleSections.length ? visibleSections : sections;
  const scored = [...candidates].sort((left, right) => {
    const leftCenter = left.top + left.height / 2;
    const rightCenter = right.top + right.height / 2;
    const leftDistance = Math.abs(leftCenter - focusLine);
    const rightDistance = Math.abs(rightCenter - focusLine);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return Math.abs(left.top - focusLine) - Math.abs(right.top - focusLine);
  });

  return scored[0]?.href ?? null;
}

function normalizeSignalToken(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createSignalBandItems(copy: LandingPageCopy) {
  const heroMark = normalizeSignalToken(copy.brand.replace(/\s+ARCHIVE$/, ""));
  const items = [
    heroMark,
    normalizeSignalToken(copy.hero.title),
    normalizeSignalToken(copy.metaLine),
    normalizeSignalToken(copy.hero.panelTitle),
    normalizeSignalToken(copy.access.title),
    normalizeSignalToken(copy.gallery.rightCard.title),
    ...copy.hero.routes.map((route) => normalizeSignalToken(route.title)),
  ];

  return items.filter((item, index) => item && item.length <= 20 && items.indexOf(item) === index);
}
