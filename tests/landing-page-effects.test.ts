import assert from "node:assert/strict";
import test from "node:test";

import { landingCopy } from "../components/home/i18n";

type EffectsModule = {
  createSignalBandItems: (copy: (typeof landingCopy)["zh-CN"]) => string[];
  resolveActiveNavHref: (
    nav: Array<{ href: string; label: string }>,
    hash?: string | null,
  ) => string | null;
  resolveScrollActiveNavHref: (
    sections: Array<{ height: number; href: string; top: number }>,
    viewportHeight: number,
  ) => string | null;
  resolveMagneticTranslation: (input: {
    clientX: number;
    clientY: number;
    maxOffsetX?: number;
    maxOffsetY?: number;
    rect: { height: number; left: number; top: number; width: number };
  }) => { intensity: number; x: number; y: number };
};

async function loadEffectsModule(): Promise<EffectsModule> {
  try {
    return await import("../components/home/landing-page-effects");
  } catch {
    return {
      createSignalBandItems: () => [],
      resolveActiveNavHref: () => null,
      resolveScrollActiveNavHref: () => null,
      resolveMagneticTranslation: () => ({ intensity: 0, x: 0, y: 0 }),
    };
  }
}

test("magnetic translation stays centered when the pointer is centered", async () => {
  const effects = await loadEffectsModule();
  const state = effects.resolveMagneticTranslation({
    clientX: 200,
    clientY: 140,
    rect: { height: 120, left: 100, top: 80, width: 200 },
  });

  assert.equal(state.x, 0);
  assert.equal(state.y, 0);
  assert.equal(state.intensity, 0);
});

test("magnetic translation pulls toward the pointer but remains restrained", async () => {
  const effects = await loadEffectsModule();
  const state = effects.resolveMagneticTranslation({
    clientX: 600,
    clientY: 40,
    maxOffsetX: 9,
    maxOffsetY: 7,
    rect: { height: 120, left: 100, top: 80, width: 200 },
  });

  assert.ok(state.x > 0, "expected x translation to move toward the pointer");
  assert.ok(state.y < 0, "expected y translation to move toward the pointer");
  assert.ok(state.x <= 9, "expected x translation to clamp at the configured maximum");
  assert.ok(Math.abs(state.y) <= 7, "expected y translation to clamp at the configured maximum");
  assert.ok(state.intensity > 0.5, "expected far pointer positions to still register as magnetic");
});

test("signal band items stay short, ordered, and deduplicated", async () => {
  const effects = await loadEffectsModule();
  const items = effects.createSignalBandItems(landingCopy["zh-CN"]);

  assert.ok(items.length >= 6, "expected a meaningful signal band set");
  assert.equal(items[0], "XIN ERA");
  assert.ok(items.includes("心纪元"), "expected the core world name to be present");
  assert.ok(items.includes("玩家入口矩阵"), "expected the access matrix label to be present");
  assert.equal(new Set(items).size, items.length, "expected the signal band base items to stay deduplicated");
  assert.ok(items.every((item) => item.length <= 20), "expected all signal phrases to remain compact");
});

test("active nav href follows internal section hashes and falls back to the first section", async () => {
  const effects = await loadEffectsModule();
  const nav = landingCopy["zh-CN"].nav;

  assert.equal(effects.resolveActiveNavHref(nav, "#access"), "#access");
  assert.equal(effects.resolveActiveNavHref(nav, "#missing"), "#core");
  assert.equal(effects.resolveActiveNavHref(nav, ""), "#core");
});

test("scroll active nav href follows the section closest to the viewport focus line", async () => {
  const effects = await loadEffectsModule();

  assert.equal(
    effects.resolveScrollActiveNavHref(
      [
        { href: "#core", top: 180, height: 680 },
        { href: "#access", top: 980, height: 640 },
      ],
      900,
    ),
    "#core",
  );

  assert.equal(
    effects.resolveScrollActiveNavHref(
      [
        { href: "#core", top: -420, height: 680 },
        { href: "#access", top: 220, height: 640 },
      ],
      900,
    ),
    "#access",
  );

  assert.equal(
    effects.resolveScrollActiveNavHref(
      [
        { href: "#core", top: -960, height: 1334 },
        { href: "#access", top: 380, height: 568 },
      ],
      740,
    ),
    "#access",
  );
});
