import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockGTAOPass } from "../features/rendering/block-gtao-pass";
import { warmScene } from "../features/rendering/scene-warmup";

test("AO precompilation never replaces the live scene, even during cancellation", async () => {
  const scene = new THREE.Scene();
  const leaf = new THREE.MeshStandardMaterial({ alphaTest: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ transparent: true });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [leaf, glass]);
  scene.add(mesh);
  const originals = mesh.material;
  const pass = new BlockGTAOPass(scene, new THREE.PerspectiveCamera(), 4, 4);
  const previousTarget = new THREE.WebGLRenderTarget(1, 1);
  let target: THREE.WebGLRenderTarget | null = previousTarget;
  let finish!: () => void;
  const renderer = {
    shadowMap: { enabled: true },
    getRenderTarget: () => target,
    setRenderTarget: (value: THREE.WebGLRenderTarget | null) => {
      target = value;
    },
    compileAsync(
      proxy: THREE.Scene,
      _camera: THREE.Camera,
      targetScene: THREE.Scene,
    ) {
      assert.notEqual(proxy, scene);
      assert.equal(
        targetScene,
        scene,
        "fog and light counts must match the actual normal draw",
      );
      assert.equal(mesh.material, originals);
      assert.equal(target, pass.normalRenderTarget);
      assert.equal(this.shadowMap.enabled, false);
      const normals = (proxy.children[0] as THREE.Mesh)
        .material as THREE.MeshNormalMaterial[];
      assert.equal(
        normals.length,
        1,
        "transparent glass has no AO shader to warm",
      );
      assert.equal(normals[0].alphaTest, leaf.alphaTest);
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
  };
  const abort = new AbortController();
  const pending = pass.prepare(
    renderer as unknown as THREE.WebGLRenderer,
    abort.signal,
  );
  assert.equal(
    target,
    previousTarget,
    "restore target before returning to the event loop",
  );
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(mesh.material, originals);
  abort.abort();
  pass.dispose();
  finish();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(mesh.material, originals);
});

test("warmup uses actual offscreen and screen variants, uploads F0 once and preserves scene resources", async () => {
  const scene = new THREE.Scene();
  const color = new THREE.Texture();
  const f0 = new THREE.Texture();
  const geometry = new THREE.BoxGeometry();
  let sourceDisposed = false;
  geometry.addEventListener("dispose", () => {
    sourceDisposed = true;
  });
  const material = new THREE.MeshStandardMaterial({ map: color });
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.PerspectiveCamera();
  const occlusion = new BlockGTAOPass(scene, camera, 4, 4);
  const previousTarget = new THREE.WebGLRenderTarget(1, 1);
  const beautyTarget = new THREE.WebGLRenderTarget(1, 1);
  let target: THREE.WebGLRenderTarget | null = previousTarget;
  const compiled: {
    object: THREE.Object3D;
    material?: THREE.Material | THREE.Material[];
    target: THREE.WebGLRenderTarget | null;
  }[] = [];
  const uploaded: THREE.Texture[] = [];
  const output = { material: new THREE.RawShaderMaterial() };
  const shader = () => new THREE.ShaderMaterial();
  const effects = {
    occlusion,
    bloom: {
      materialHighPassFilter: shader(),
      separableBlurMaterials: [shader()],
      compositeMaterial: shader(),
      blendMaterial: shader(),
    },
    antialias: {
      _materialEdges: shader(),
      _materialWeights: shader(),
      _materialBlend: shader(),
    },
    output,
  } as unknown as Parameters<typeof warmScene>[4];
  const renderer = {
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { enabled: true },
    initTexture(texture: THREE.Texture) {
      uploaded.push(texture);
    },
    getRenderTarget: () => target,
    setRenderTarget: (value: THREE.WebGLRenderTarget | null) => {
      target = value;
    },
    async compileAsync(object: THREE.Object3D) {
      compiled.push({
        object,
        material: object instanceof THREE.Mesh ? object.material : undefined,
        target,
      });
    },
  };
  await warmScene(
    renderer as unknown as THREE.WebGLRenderer,
    scene,
    camera,
    beautyTarget,
    effects,
    new AbortController().signal,
    new Map([["stone", { normalMap: color, f0Map: f0 }]]),
  );
  assert.deepEqual(
    uploaded,
    [color, f0],
    "custom F0 must upload, shared textures only once",
  );
  assert.equal(
    compiled.find((entry) => entry.object === scene)?.target,
    beautyTarget,
  );
  assert.equal(
    compiled.find((entry) => entry.material === output.material)?.target,
    null,
  );
  assert.deepEqual(output.material.defines, {
    SRGB_TRANSFER: "",
    ACES_FILMIC_TONE_MAPPING: "",
  });
  assert.equal(target, previousTarget);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(sourceDisposed, false);
  occlusion.dispose();
});
