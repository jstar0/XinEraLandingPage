import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  blockTextureKey,
  finishBlockMaterials,
} from "../features/rendering/block-materials";
import {
  BlockGTAOPass,
  createCutoutNormalMaterial,
} from "../features/rendering/block-gtao-pass";

function tileMaterial(tile: number, transparent = false) {
  const material = new THREE.MeshStandardMaterial({ transparent });
  material.userData.blockTextureTile = tile;
  return material;
}

test("MC texture namespaces share real PBR maps while preserving lamp emission", () => {
  assert.equal(blockTextureKey("minecraft:block/stone_bricks"), "stone_bricks");
  assert.equal(blockTextureKey("block/stone_bricks"), "stone_bricks");
  const normalMap = new THREE.Texture();
  const roughnessMap = new THREE.Texture();
  const stone = tileMaterial(0);
  const lamp = tileMaterial(1);
  const mask = (lamp.emissiveMap = new THREE.Texture());
  lamp.emissive.setRGB(1, 1, 1);
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), [stone, lamp]));
  const stats = finishBlockMaterials(
    root,
    {
      tiles: [
        { tile: 0, texture: "minecraft:block/stone_bricks", kind: "stone" },
        { tile: 1, texture: "block/sea_lantern", kind: "light" },
      ],
    },
    new Map([["stone_bricks", { normalMap, roughnessMap }]]),
  );
  assert.equal(stone.normalMap, normalMap);
  assert.equal(stone.roughnessMap, roughnessMap);
  assert.equal(
    stone.metalness,
    0,
    "a reflective dielectric must not become metal",
  );
  assert.equal(lamp.emissiveMap, mask);
  assert.equal(lamp.emissive.r, 1);
  assert.equal(stats.pbrMaterials, 1);
});

test("mixed source geometry preserves triangles and transform while glass/water stop casting solid shadows", () => {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.Float32BufferAttribute(
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 2, 1, 0, 2, 2, 0],
    3,
  );
  geometry.setAttribute("position", position);
  geometry.setIndex([0, 1, 2, 1, 3, 2, 3, 4, 5]);
  geometry.addGroup(0, 3, 0);
  geometry.addGroup(3, 3, 1);
  geometry.addGroup(6, 3, 2);
  const stone = tileMaterial(0),
    glass = tileMaterial(1, true),
    water = tileMaterial(2, true);
  const mesh = new THREE.Mesh(geometry, [stone, glass, water]);
  mesh.position.set(10, 2, -3);
  mesh.scale.set(-2, 2, 2);
  const root = new THREE.Group();
  root.add(mesh);
  finishBlockMaterials(root, {
    tiles: [
      { tile: 0, texture: "block/stone", kind: "stone" },
      { tile: 1, texture: "block/glass", kind: "glass" },
      { tile: 2, texture: "block/water_still", kind: "water" },
    ],
  });
  root.updateMatrixWorld(true);
  const triangles: number[] = [];
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    assert.equal(
      node.geometry.getAttribute("position"),
      position,
      "reuse attributes, do not duplicate vertex payloads",
    );
    assert.deepEqual(node.matrixWorld.elements, mesh.matrixWorld.elements);
    const indices = node.geometry.getIndex()!;
    for (let i = 0; i < indices.count; i++) triangles.push(indices.getX(i));
    const material = (node.material as THREE.MeshStandardMaterial[])[0];
    assert.equal(node.castShadow, material === stone);
    if (material === water) assert.equal(node.name, "water");
  });
  assert.deepEqual(triangles, [0, 1, 2, 1, 3, 2, 3, 4, 5]);
});

test("supplemental water tile zero cannot inherit the building's stone tile zero", () => {
  const material = tileMaterial(0, true);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  mesh.name = "water";
  finishBlockMaterials(mesh, {
    tiles: [{ tile: 0, texture: "block/stone", kind: "stone" }],
  });
  assert.equal(material.userData.blockKind, "water");
  assert.equal(mesh.castShadow, false);
  assert.equal(material.userData.excludeFromAO, true);
});

test("normal/depth cutouts keep the original alpha, UV transform and normal-map contract", () => {
  const material = tileMaterial(0);
  const map = (material.map = new THREE.Texture());
  map.offset.set(0.25, 0.5);
  material.alphaTest = 0.35;
  material.normalMap = new THREE.Texture();
  material.normalScale.set(0.5, -0.5);
  const normal = createCutoutNormalMaterial(material);
  assert.equal(normal.map, map);
  assert.equal(normal.alphaTest, 0.35);
  assert.equal(normal.normalMap, material.normalMap);
  assert.deepEqual(normal.normalScale, material.normalScale);
  material.transparent = true;
  assert.equal(createCutoutNormalMaterial(material).visible, false);
});

test("failed G-buffer drawing restores beauty materials, background and renderer state", () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#c0d0e0");
  const background = scene.background;
  const leaf = tileMaterial(0),
    glass = tileMaterial(1, true);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [leaf, glass]);
  scene.add(mesh);
  const originals = mesh.material;
  const camera = new THREE.PerspectiveCamera();
  const pass = new BlockGTAOPass(scene, camera, 4, 4);
  let clear = new THREE.Color("#123456"),
    alpha = 0.5;
  const originalTarget = new THREE.WebGLRenderTarget(1, 1);
  let target: THREE.WebGLRenderTarget | null = originalTarget;
  const renderer = {
    autoClear: true,
    shadowMap: { autoUpdate: true },
    getClearColor(out: THREE.Color) {
      return out.copy(clear);
    },
    getClearAlpha() {
      return alpha;
    },
    getRenderTarget() {
      return target;
    },
    setRenderTarget(next: THREE.WebGLRenderTarget | null) {
      target = next;
    },
    setClearColor(next: THREE.ColorRepresentation, nextAlpha = alpha) {
      clear = new THREE.Color(next);
      alpha = nextAlpha;
    },
    clear() {},
    render() {
      const materials = mesh.material as unknown as THREE.MeshNormalMaterial[];
      assert.equal(materials[0].isMeshNormalMaterial, true);
      assert.equal(materials[1].visible, false);
      throw new Error("WebGL context lost");
    },
  };
  assert.throws(
    () =>
      pass._renderOverride(
        renderer as unknown as THREE.WebGLRenderer,
        pass.normalMaterial,
        new THREE.WebGLRenderTarget(4, 4),
        0x7777ff,
        1,
      ),
    /context lost/,
  );
  assert.equal(mesh.material, originals);
  assert.equal(scene.background, background);
  assert.equal(renderer.autoClear, true);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(target, originalTarget);
  assert.equal(clear.getHexString(), "123456");
  assert.equal(alpha, 0.5);
  pass.dispose();
});
