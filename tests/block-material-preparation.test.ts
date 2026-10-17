import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import * as THREE from "three";
import {
  prepareBlockMaterials,
  prepareBlockMaterialsAsync,
} from "../features/gallery/block-materials";
import { nextPreparationTask } from "../features/rendering/prepare-budget";

function browser(t: TestContext, draw?: () => void) {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const crops: unknown[][] = [];
  const install = (name: string, value: unknown) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  };
  install("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args: unknown[]) => {
          crops.push(args);
          draw?.();
        },
      }),
    }),
  });
  install("scheduler", undefined);
  t.after(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });
  return { crops, install };
}

function fixture(indexed = true) {
  const geometry = new THREE.BufferGeometry();
  const uv: number[] = [];
  for (const tile of [2, 0, 2, 3]) {
    const column = tile % 2,
      row = Math.floor(tile / 2);
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
    ]) {
      uv.push((column * 20 + 2 + u * 16) / 40, (row * 20 + 2 + v * 16) / 40);
    }
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(36), 3),
  );
  if (indexed) geometry.setIndex(Array.from({ length: 12 }, (_, i) => i));
  const map = new THREE.Texture({ width: 40, height: 40 });
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.Texture({ width: 40, height: 40 });
  const material = new THREE.MeshStandardMaterial({
    map,
    emissiveMap,
    alphaTest: 0.35,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    emissive: 0x789abc,
  });
  material.alphaToCoverage = true;
  const mesh = new THREE.Mesh(geometry, material);
  const root = new THREE.Group();
  root.add(mesh);
  return { root, mesh, geometry, material, map, emissiveMap };
}

function snapshot(mesh: THREE.Mesh) {
  return {
    uv: Array.from(mesh.geometry.getAttribute("uv").array),
    index: Array.from(mesh.geometry.getIndex()!.array),
    groups: mesh.geometry.groups,
    materials: (mesh.material as THREE.MeshStandardMaterial[]).map(
      (material) => ({
        tile: material.userData.blockTextureTile,
        alphaTest: material.alphaTest,
        transparent: material.transparent,
        opacity: material.opacity,
        side: material.side,
        alphaToCoverage: material.alphaToCoverage,
        emissive: material.emissive.getHex(),
        maps: [material.map!, material.emissiveMap!].map((texture) => ({
          flipY: texture.flipY,
          colorSpace: texture.colorSpace,
          minFilter: texture.minFilter,
          magFilter: texture.magFilter,
          anisotropy: texture.anisotropy,
          width: (texture.image as HTMLCanvasElement).width,
          height: (texture.image as HTMLCanvasElement).height,
        })),
      }),
    ),
  };
}

for (const indexed of [true, false]) {
  test(`sync/async preserve first-seen tile order, every triangle and material channels (${indexed ? "indexed" : "non-indexed"})`, async (t) => {
    const environment = browser(t);
    const sync = fixture(indexed),
      async = fixture(indexed);
    prepareBlockMaterials(sync.root, 16);
    await prepareBlockMaterialsAsync(async.root, 16);
    assert.deepEqual(snapshot(async.mesh), snapshot(sync.mesh));
    const result = snapshot(async.mesh);
    assert.deepEqual(result.index, [0, 1, 2, 6, 7, 8, 3, 4, 5, 9, 10, 11]);
    assert.deepEqual(result.groups, [
      { start: 0, count: 6, materialIndex: 0 },
      { start: 6, count: 3, materialIndex: 1 },
      { start: 9, count: 3, materialIndex: 2 },
    ]);
    assert.deepEqual(
      result.materials.map((material) => material.tile),
      [2, 0, 3],
    );
    for (const material of result.materials) {
      assert.equal(material.alphaTest, 0.35);
      assert.equal(material.transparent, true);
      assert.equal(material.opacity, 0.62);
      assert.equal(material.side, THREE.DoubleSide);
      assert.equal(material.alphaToCoverage, false);
      assert.equal(material.emissive, 0x789abc);
      assert.equal(material.maps[0].colorSpace, THREE.SRGBColorSpace);
      for (const map of material.maps) {
        assert.equal(map.flipY, false);
        assert.equal(map.anisotropy, 8);
        assert.equal(map.magFilter, THREE.NearestFilter);
        assert.equal(map.minFilter, THREE.LinearMipmapLinearFilter);
        assert.equal(map.width, 16);
        assert.equal(map.height, 16);
      }
    }
    const expectedUvs = Array.from({ length: 4 }, () => [
      0, 0, 1, 0, 0, 1,
    ]).flat();
    result.uv.forEach((value, index) =>
      assert.ok(Math.abs(value - expectedUvs[index]) < 1e-6),
    );
    assert.deepEqual(
      environment.crops.slice(0, 6).map((crop) => crop.slice(1)),
      [
        [2, 22, 16, 16, 0, 0, 16, 16],
        [2, 22, 16, 16, 0, 0, 16, 16],
        [2, 2, 16, 16, 0, 0, 16, 16],
        [2, 2, 16, 16, 0, 0, 16, 16],
        [22, 22, 16, 16, 0, 0, 16, 16],
        [22, 22, 16, 16, 0, 0, 16, 16],
      ],
    );
  });
}

test("async preparation gives queued events a real task before changing the scene", async (t) => {
  browser(t);
  const scene = fixture();
  let elapsed = 0;
  t.mock.method(performance, "now", () => (elapsed += 7));
  let eventRan = false;
  const event = new Promise<void>((resolve) =>
    setTimeout(() => {
      eventRan = true;
      assert.equal(
        scene.mesh.material,
        scene.material,
        "staged resources have not been attached",
      );
      resolve();
    }, 0),
  );
  const preparing = prepareBlockMaterialsAsync(scene.root, 1);
  assert.equal(eventRan, false);
  await preparing;
  await event;
  assert.equal(eventRan, true);
  assert.notEqual(scene.mesh.material, scene.material);
});

test("large vertex loops yield before completing the mesh and can abort before allocating textures", async (t) => {
  const environment = browser(t);
  const scene = fixture();
  const uv = new THREE.Float32BufferAttribute(
    new Float32Array(24_576).fill(0.1),
    2,
  );
  scene.geometry.setAttribute("uv", uv);
  const controller = new AbortController();
  let elapsed = 0,
    verticesRead = 0;
  t.mock.method(performance, "now", () => (elapsed += 7));
  const getX = uv.getX.bind(uv);
  t.mock.method(uv, "getX", (index: number) => {
    verticesRead++;
    return getX(index);
  });
  setTimeout(() => controller.abort(), 0);
  await assert.rejects(
    prepareBlockMaterialsAsync(scene.root, 1, controller.signal),
    { name: "AbortError" },
  );
  assert.ok(
    verticesRead > 0 && verticesRead < uv.count,
    "the task boundary must occur inside the vertex loop",
  );
  assert.equal(environment.crops.length, 0);
  assert.equal(scene.geometry.getAttribute("uv"), uv);
  assert.equal(scene.mesh.material, scene.material);
});

test("shared atlases reuse cropped tiles and originals are disposed once after commit", async (t) => {
  const environment = browser(t);
  const scene = fixture();
  const other = new THREE.Mesh(scene.geometry.clone(), scene.material);
  scene.root.add(other);
  let materialDisposals = 0,
    textureDisposals = 0;
  scene.material.addEventListener("dispose", () => materialDisposals++);
  scene.map.addEventListener("dispose", () => textureDisposals++);
  scene.emissiveMap.addEventListener("dispose", () => textureDisposals++);
  await prepareBlockMaterialsAsync(scene.root, 8);
  assert.equal(environment.crops.length, 6);
  assert.equal(materialDisposals, 1);
  assert.equal(textureDisposals, 2);
  const first = scene.mesh.material as unknown as THREE.MeshStandardMaterial[];
  const second = other.material as unknown as THREE.MeshStandardMaterial[];
  first.forEach((material, index) => {
    assert.equal(material.map, second[index].map);
    assert.equal(material.emissiveMap, second[index].emissiveMap);
  });
});

test("abort frees staged materials and both texture channels without touching a disposed scene", async (t) => {
  const controller = new AbortController();
  const scene = fixture();
  const uv = scene.geometry.getAttribute("uv"),
    index = scene.geometry.getIndex();
  let scheduled = false;
  const environment = browser(t, () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      controller.abort();
      scene.root.remove(scene.mesh);
      scene.geometry.dispose();
      scene.material.dispose();
      scene.map.dispose();
      scene.emissiveMap.dispose();
    }, 0);
  });
  let elapsed = 0;
  t.mock.method(performance, "now", () => (elapsed += 7));
  const disposedMaterials: THREE.Material[] = [],
    disposedTextures: THREE.Texture[] = [];
  t.mock.method(
    THREE.Material.prototype,
    "dispose",
    function (this: THREE.Material) {
      disposedMaterials.push(this);
    },
  );
  t.mock.method(
    THREE.Texture.prototype,
    "dispose",
    function (this: THREE.Texture) {
      disposedTextures.push(this);
    },
  );
  await assert.rejects(
    prepareBlockMaterialsAsync(scene.root, 8, controller.signal),
    { name: "AbortError" },
  );
  await nextPreparationTask();
  assert.equal(scene.root.children.length, 0);
  assert.equal(scene.mesh.material, scene.material);
  assert.equal(scene.geometry.getAttribute("uv"), uv);
  assert.equal(scene.geometry.getIndex(), index);
  assert.equal(scene.geometry.groups.length, 0);
  assert.equal(
    environment.crops.length,
    2,
    "one color and one emission texture staged before interruption",
  );
  assert.equal(
    disposedMaterials.length,
    2,
    "caller disposed original; generator disposed its one unattached clone",
  );
  assert.equal(
    disposedTextures.length,
    4,
    "caller disposed two sources; generator disposed its two cropped maps",
  );
  assert.equal(new Set(disposedMaterials).size, 2);
  assert.equal(new Set(disposedTextures).size, 4);
});

test("invalid later mesh rolls back staged resources and preserves original geometry", (t) => {
  browser(t);
  const valid = fixture(),
    invalid = fixture();
  invalid.geometry.getAttribute("uv").setXY(1, 0.1, 0.1);
  valid.root.add(invalid.mesh);
  const uv = valid.geometry.getAttribute("uv");
  const disposedMaterials: THREE.Material[] = [],
    disposedTextures: THREE.Texture[] = [];
  t.mock.method(
    THREE.Material.prototype,
    "dispose",
    function (this: THREE.Material) {
      disposedMaterials.push(this);
    },
  );
  t.mock.method(
    THREE.Texture.prototype,
    "dispose",
    function (this: THREE.Texture) {
      disposedTextures.push(this);
    },
  );
  assert.throws(
    () => prepareBlockMaterials(valid.root, 8),
    /Invalid block atlas triangle/,
  );
  assert.equal(valid.mesh.material, valid.material);
  assert.equal(valid.geometry.getAttribute("uv"), uv);
  assert.equal(disposedMaterials.length, 3);
  assert.equal(disposedTextures.length, 6);
  assert.ok(!disposedMaterials.includes(valid.material));
  assert.ok(!disposedTextures.includes(valid.map));
});

test("preparation tasks use scheduler.yield when available and abort promptly while waiting", async (t) => {
  const environment = browser(t);
  let yielded = 0;
  environment.install("scheduler", {
    yield: async () => {
      yielded++;
    },
  });
  await nextPreparationTask();
  assert.equal(yielded, 1);
  environment.install("scheduler", {
    yield: () => new Promise<void>(() => {}),
  });
  const controller = new AbortController();
  const pending = nextPreparationTask(controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(nextPreparationTask(controller.signal), {
    name: "AbortError",
  });
});
