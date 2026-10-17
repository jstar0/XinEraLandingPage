import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  convertPixel,
  decodeNormal,
  decodeSpecular,
} from "../scripts/pbr/labpbr.mjs";
import manifest from "../public/xinera/pbr/manifest.json";
import runtime from "../public/xinera/pbr/runtime.json";

test("LabPBR normals reconstruct Z and flip DirectX Y without using AO as Z", () => {
  const up = decodeNormal(127.5, 0);
  assert.deepEqual(up, [0, 1, 0]);
  const forward = decodeNormal(127.5, 127.5);
  assert.deepEqual(forward, [0, -0, 1]);
  for (const red of [0, 127, 128, 255]) {
    for (const green of [0, 127, 128, 255]) {
      const normal = decodeNormal(red, green);
      assert.ok(normal.every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...normal) - 1) < 1e-9);
    }
  }
  const darkAo = convertPixel([128, 128, 0, 255], [100, 10, 0, 255]);
  const lightAo = convertPixel([128, 128, 255, 255], [100, 10, 0, 255]);
  assert.deepEqual(darkAo.slice(0, 3), lightAo.slice(0, 3));
  assert.equal(darkAo[3], 0);
  assert.equal(lightAo[3], 255);
});

test("LabPBR dielectric F0 is never metalness and perceptual smoothness is inverted once", () => {
  assert.equal(decodeSpecular(0, 10).roughness, 1);
  assert.equal(decodeSpecular(255, 10).roughness, 0);
  assert.equal(decodeSpecular(128, 10).roughness, 127 / 255);
  assert.equal(decodeSpecular(100, 229).f0, 229 / 255);
  assert.equal(decodeSpecular(100, 229).metalness, 0);
  assert.equal(decodeSpecular(100, 230).metalness, 1);
  assert.equal(decodeSpecular(100, 255).metalId, 255);
  const stone = convertPixel([128, 128, 240, 255], [101, 10, 0, 255]);
  assert.deepEqual(stone.slice(3), [240, 154, 0, 10, 10, 10]);
  const metal = convertPixel([128, 128, 255, 255], [255, 255, 0, 255]);
  assert.deepEqual(metal.slice(3, 6), [255, 0, 255]);
});

test("published PBR atlas checksums and compact runtime coverage agree with source manifest", () => {
  assert.equal(manifest.coverage.required, 349);
  assert.equal(manifest.coverage.matched, 246);
  assert.equal(runtime.textures.length, manifest.textures.length);
  const keys = new Set(runtime.textures.map(([key]) => key));
  assert.equal(keys.size, runtime.textures.length);
  assert.ok(keys.has("stone_bricks"));
  assert.ok(!keys.has("water_still"), "do not claim an unmatched pack texture");
  for (const [channel, atlas] of Object.entries(manifest.atlases)) {
    const bytes = readFileSync(
      new URL(`../public${atlas.url}`, import.meta.url),
    );
    assert.equal(bytes.length, atlas.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      atlas.sha256,
    );
    assert.equal(
      runtime.atlases[channel as keyof typeof runtime.atlases],
      atlas.url,
    );
  }
  assert.equal(
    manifest.coverage.matched + manifest.coverage.missing.length,
    manifest.coverage.required,
  );
});
