import * as THREE from "three";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";

type CutoutNormalMaterial = THREE.MeshNormalMaterial & {
  map: THREE.Texture | null;
  alphaMap: THREE.Texture | null;
};

/** Three r186's stock normal shader does not sample albedo alpha. */
export function createCutoutNormalMaterial(source: THREE.MeshStandardMaterial) {
  const material = new THREE.MeshNormalMaterial({
    blending: THREE.NoBlending,
  }) as CutoutNormalMaterial;
  material.map = source.map;
  material.alphaMap = source.alphaMap;
  material.alphaTest = source.alphaTest;
  material.opacity = source.opacity;
  material.side = source.side;
  material.normalMap = source.normalMap;
  material.normalMapType = source.normalMapType;
  material.normalScale.copy(source.normalScale);
  material.bumpMap = source.bumpMap;
  material.bumpScale = source.bumpScale;
  material.flatShading = source.flatShading;
  material.visible =
    source.visible && !source.transparent && !source.userData.excludeFromAO;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <uv_pars_fragment>",
        `#include <uv_pars_fragment>
        #include <map_pars_fragment>
        #include <alphamap_pars_fragment>
        #include <alphatest_pars_fragment>`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        #include <map_fragment>
        #include <alphamap_fragment>
        #include <alphatest_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "xinera-cutout-normal-v1";
  return material;
}

/**
 * Keep GTAO's built-in targets/denoiser, replacing only its normal/depth draw.
 * `_renderOverride` is the actual r186 hook (the published typings lag behind).
 * Temporary materials are restored even when WebGL compilation/rendering fails.
 */
export class BlockGTAOPass extends GTAOPass {
  // Present in r186; upstream declarations still omit this render target.
  declare normalRenderTarget: THREE.WebGLRenderTarget;
  private blockNormals = new Map<THREE.Material, THREE.MeshNormalMaterial>();
  private hiddenMaterial = new THREE.MeshNormalMaterial({ visible: false });

  private normalFor(source: THREE.Material) {
    if (!(source instanceof THREE.MeshStandardMaterial))
      return this.hiddenMaterial;
    let normal = this.blockNormals.get(source);
    if (!normal) {
      normal = createCutoutNormalMaterial(source);
      this.blockNormals.set(source, normal);
    }
    normal.visible =
      source.visible && !source.transparent && !source.userData.excludeFromAO;
    return normal;
  }

  /** Compile the exact cutout G-buffer variants before its first draw. */
  async prepare(renderer: THREE.WebGLRenderer, signal: AbortSignal) {
    signal.throwIfAborted();
    const proxy = new THREE.Scene();
    this.scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = (
        Array.isArray(node.material) ? node.material : [node.material]
      )
        .map((material) => this.normalFor(material))
        .filter((material) => material.visible);
      if (materials.length) proxy.add(new THREE.Mesh(node.geometry, materials));
    });
    const target = renderer.getRenderTarget();
    const shadows = renderer.shadowMap.enabled;
    let compiling: Promise<unknown>;
    try {
      renderer.shadowMap.enabled = false;
      renderer.setRenderTarget(this.normalRenderTarget);
      compiling = renderer.compileAsync(proxy, this.camera, this.scene);
    } finally {
      // No renderer/scene mutation is left in place across the asynchronous wait.
      renderer.setRenderTarget(target);
      renderer.shadowMap.enabled = shadows;
    }
    await compiling;
    signal.throwIfAborted();
  }

  _renderOverride(
    renderer: THREE.WebGLRenderer,
    _overrideMaterial: THREE.MeshNormalMaterial,
    renderTarget: THREE.WebGLRenderTarget,
    clearColor: THREE.ColorRepresentation,
    clearAlpha: number,
  ) {
    const color = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    const target = renderer.getRenderTarget();
    const override = this.scene.overrideMaterial;
    const background = this.scene.background;
    const shadows = renderer.shadowMap.autoUpdate;
    const shadowsEnabled = renderer.shadowMap.enabled;
    const changed: {
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
    }[] = [];
    try {
      this.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        changed.push({ mesh: node, material: node.material });
        node.material = Array.isArray(node.material)
          ? node.material.map((material) => this.normalFor(material))
          : this.normalFor(node.material);
      });
      this.scene.overrideMaterial = null;
      this.scene.background = null;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.enabled = false;
      renderer.setRenderTarget(renderTarget);
      renderer.autoClear = false;
      renderer.setClearColor(clearColor, clearAlpha);
      renderer.clear();
      renderer.render(this.scene, this.camera);
    } finally {
      for (const { mesh, material } of changed) mesh.material = material;
      this.scene.overrideMaterial = override;
      this.scene.background = background;
      renderer.shadowMap.autoUpdate = shadows;
      renderer.shadowMap.enabled = shadowsEnabled;
      renderer.autoClear = autoClear;
      renderer.setClearColor(color, alpha);
      renderer.setRenderTarget(target);
    }
  }

  dispose() {
    this.blockNormals.forEach((material) => material.dispose());
    this.blockNormals.clear();
    this.hiddenMaterial.dispose();
    super.dispose();
  }
}
