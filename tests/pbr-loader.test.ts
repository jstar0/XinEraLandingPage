import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import * as THREE from "three";
import { loadBlockPbr } from "../features/rendering/pbr-textures";
import runtime from "../public/xinera/pbr/runtime.json";

function browser(t: TestContext) {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const requests: string[] = [];
  const crops: unknown[][] = [];
  let closed = 0;
  function install(name: string, value: unknown) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  install("fetch", async (url: string) => {
    requests.push(url);
    return { ok: true, blob: async () => new Blob() };
  });
  install("createImageBitmap", async () => ({
    width: runtime.width,
    height: runtime.height,
    close: () => closed++,
  }));
  install("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args: unknown[]) => crops.push(args),
      }),
    }),
  });
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });
  return { requests, crops, closed: () => closed };
}

test("PBR loader shares three network requests and preserves data colors and tile orientation", async (t) => {
  const environment = browser(t);
  const handle = await loadBlockPbr(
    {
      tiles: [
        { tile: 0, texture: "minecraft:block/stone_bricks", kind: "stone" },
        { tile: 1, texture: "block/stone_bricks", kind: "stone" },
        { tile: 2, texture: "block/water_still", kind: "water" },
      ],
    },
    new AbortController().signal,
    32,
  );
  assert.equal(environment.requests.length, 3);
  assert.equal(
    environment.closed(),
    3,
    "decoded atlas bitmaps are released after cropping",
  );
  assert.equal(
    handle.textures.size,
    1,
    "same block reused, unmatched water omitted",
  );
  const maps = handle.textures.get("stone_bricks")!;
  assert.equal(maps.aoMap, maps.roughnessMap);
  assert.equal(maps.metalnessMap, maps.roughnessMap);
  const owned = new Set([maps.normalMap, maps.roughnessMap, maps.f0Map]);
  let disposed = 0;
  for (const texture of owned) {
    assert.ok(texture);
    assert.equal(texture.colorSpace, THREE.NoColorSpace);
    assert.equal(texture.flipY, false);
    assert.equal(texture.anisotropy, 8);
    texture.addEventListener("dispose", () => disposed++);
  }
  const entry = runtime.textures.find(([key]) => key === "stone_bricks")!;
  for (const crop of environment.crops) {
    assert.deepEqual(crop.slice(1), [
      (Number(entry[1]) % runtime.columns) * 16,
      Math.floor(Number(entry[1]) / runtime.columns) * 16,
      16,
      16,
      0,
      0,
      16,
      16,
    ]);
  }
  handle.dispose();
  handle.dispose();
  assert.equal(
    disposed,
    3,
    "one disposal per owned GPU texture, even for shared ORM",
  );
});

test("PBR loader closes successful atlases when another atlas fails", async (t) => {
  const environment = browser(t);
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    if (String(url).includes("normal")) throw new Error("network failed");
    return { ok: true, blob: async () => new Blob() } as Response;
  });
  await assert.rejects(
    loadBlockPbr(
      { tiles: [{ tile: 0, texture: "block/stone_bricks", kind: "stone" }] },
      new AbortController().signal,
      1,
    ),
    /network failed/,
  );
  assert.equal(environment.closed(), 2);
  assert.equal(environment.crops.length, 0);
});

test("aborted PBR requests and wholly unmatched scenes do not start downloads", async (t) => {
  const environment = browser(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadBlockPbr({ tiles: [] }, controller.signal, 1), {
    name: "AbortError",
  });
  const result = await loadBlockPbr(
    { tiles: [{ tile: 0, texture: "block/water_still", kind: "water" }] },
    new AbortController().signal,
    1,
  );
  assert.equal(result.textures.size, 0);
  assert.equal(environment.requests.length, 0);
  result.dispose();
});
