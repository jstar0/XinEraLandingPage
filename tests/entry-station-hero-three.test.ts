import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import EntryStationHeroThree from "../components/home/entry-station-hero-three";
import { mapPointerToProjectedQuad } from "../components/home/projected-quad";

test("three hero demo renders a stable SSR scaffold", () => {
  const html = renderToStaticMarkup(
    React.createElement(EntryStationHeroThree, {
      imageAlt: "Xin Era entry station scene",
      imageSrc: "/images/landing/xinera-cathedral.png",
    }),
  );

  assert.match(html, /data-hero-grid-three="entry-station"/);
  assert.match(html, /data-grid-columns="24"/);
  assert.match(html, /data-grid-rows="14"/);
  assert.match(html, /rotateX\(12deg\)_rotateY\(-18deg\)_rotateZ\(-1\.9deg\)/);
  assert.match(html, /xinera-cathedral\.png/);
});

test("three hero maps pointer coordinates through the projected hero quad", () => {
  const quad = {
    bottomLeft: { x: 80, y: 360 },
    bottomRight: { x: 440, y: 400 },
    topLeft: { x: 100, y: 100 },
    topRight: { x: 500, y: 140 },
  };

  assert.deepEqual(mapPointerToProjectedQuad({ x: 100, y: 100 }, quad), {
    x: 0,
    y: 0,
  });
  assert.deepEqual(mapPointerToProjectedQuad({ x: 500, y: 140 }, quad), {
    x: 1,
    y: 0,
  });
  assert.deepEqual(mapPointerToProjectedQuad({ x: 440, y: 400 }, quad), {
    x: 1,
    y: 1,
  });
  assert.deepEqual(mapPointerToProjectedQuad({ x: 80, y: 360 }, quad), {
    x: 0,
    y: 1,
  });

  const center = mapPointerToProjectedQuad({ x: 270, y: 249 }, quad);

  assert.ok(center);
  assert.ok(center.x > 0.44 && center.x < 0.56);
  assert.ok(center.y > 0.44 && center.y < 0.56);
});
