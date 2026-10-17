import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/** Minecraft 64 × 64 texture net, in pixel coordinates. +Z is the face. */
export function skinBox(
  width: number,
  height: number,
  depth: number,
  u: number,
  v: number,
  inflate = 0,
) {
  const geometry = new THREE.BoxGeometry(
    width + inflate,
    height + inflate,
    depth + inflate,
  );
  const rectangles = [
    [u + depth + width, v + depth, depth, height],
    [u, v + depth, depth, height],
    [u + depth, v, width, depth],
    [u + depth + width, v, width, depth],
    [u + depth, v + depth, width, height],
    [u + depth * 2 + width, v + depth, width, height],
  ];
  const uv = geometry.getAttribute("uv");
  rectangles.forEach(([x, y, w, h], face) => {
    const top = 1 - y / 64,
      bottom = 1 - (y + h) / 64;
    // BoxGeometry's bottom is viewed from underneath; reverse its V direction.
    const coords =
      face === 3
        ? [
            [x / 64, bottom],
            [(x + w) / 64, bottom],
            [x / 64, top],
            [(x + w) / 64, top],
          ]
        : [
            [x / 64, top],
            [(x + w) / 64, top],
            [x / 64, bottom],
            [(x + w) / 64, bottom],
          ];
    coords.forEach(([a, b], index) => uv.setXY(face * 4 + index, a, b));
  });
  return geometry;
}

export async function mountSkin(
  canvas: HTMLCanvasElement,
  src: string,
  slim: boolean,
  signal: AbortSignal,
  state: {
    preparing: () => void;
    ready: () => void;
    failed: () => void;
  },
) {
  if (signal.aborted) return;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  camera.position.set(36, 24, 65);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 16, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 45;
  controls.maxDistance = 100;
  controls.minPolarAngle = 0.6;
  controls.maxPolarAngle = Math.PI / 2 + 0.12;
  function keyboard(event: KeyboardEvent) {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
        "Home",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (event.key === "Home") {
      camera.position.set(36, 24, 65);
    } else {
      const orbit = new THREE.Spherical().setFromVector3(
        camera.position.clone().sub(controls.target),
      );
      if (event.key === "ArrowLeft") orbit.theta -= 0.12;
      if (event.key === "ArrowRight") orbit.theta += 0.12;
      if (event.key === "ArrowUp") orbit.phi -= 0.08;
      if (event.key === "ArrowDown") orbit.phi += 0.08;
      if (event.key === "+") orbit.radius -= 4;
      if (event.key === "-") orbit.radius += 4;
      orbit.phi = THREE.MathUtils.clamp(
        orbit.phi,
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      orbit.radius = THREE.MathUtils.clamp(
        orbit.radius,
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3().setFromSpherical(orbit));
    }
    controls.update();
  }
  canvas.addEventListener("keydown", keyboard);
  scene.add(new THREE.HemisphereLight(0xfff8e8, 0x9e9b95, 2.4));
  const sun = new THREE.DirectionalLight(0xffe5c4, 3.2);
  sun.position.set(-25, 50, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -28,
    right: 28,
    top: 38,
    bottom: -28,
    near: 0.1,
    far: 150,
  });
  sun.shadow.normalBias = 0.08;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xe7f0ff, 1.4);
  rim.position.set(20, 35, -25);
  scene.add(rim);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 15, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xc5bca5, roughness: 1 }),
  );
  pedestal.position.y = -0.75;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  let frame = 0;
  let texture: THREE.Texture | undefined;
  let disposed = false;
  const observer = new ResizeObserver(resize);
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    state.failed();
    dispose();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("keydown", keyboard);
    delete canvas.dataset.ready;
    controls.dispose();
    const disposedMaterials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => disposedMaterials.add(material));
      }
    });
    disposedMaterials.forEach((material) => material.dispose());
    texture?.dispose();
    sun.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    signal.removeEventListener("abort", dispose);
  }
  signal.addEventListener("abort", dispose, { once: true });
  canvas.addEventListener("webglcontextlost", contextLost);
  observer.observe(canvas);
  resize();
  try {
    texture = await new THREE.TextureLoader().loadAsync(src);
    if (signal.aborted || disposed) {
      texture.dispose();
      dispose();
      return;
    }
    state.preparing();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const base = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      alphaTest: 0.1,
    });
    const overlay = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      alphaTest: 0.1,
      transparent: true,
    });
    const avatar = new THREE.Group();
    const part = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      uv: number[],
      outer: number[],
      rotation = 0,
    ) => {
      const group = new THREE.Group();
      group.position.set(x, y, 0);
      group.rotation.z = rotation;
      const mesh = new THREE.Mesh(skinBox(w, h, d, uv[0], uv[1]), base);
      const layer = new THREE.Mesh(
        skinBox(w, h, d, outer[0], outer[1], h === 8 ? 1 : 0.5),
        overlay,
      );
      mesh.castShadow = layer.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh, layer);
      avatar.add(group);
    };
    part(8, 8, 8, 0, 28, [0, 0], [32, 0]);
    part(8, 12, 4, 0, 18, [16, 16], [16, 32]);
    part(4, 12, 4, -2, 6, [0, 16], [0, 32]);
    part(4, 12, 4, 2, 6, [16, 48], [0, 48]);
    const w = slim ? 3 : 4;
    part(w, 12, 4, -(4 + w / 2), 18, [40, 16], [40, 32], -0.045);
    part(w, 12, 4, 4 + w / 2, 18, [32, 48], [48, 48], 0.045);
    scene.add(avatar);
    await renderer.compileAsync(scene, camera);
    if (signal.aborted || disposed) {
      dispose();
      return;
    }
    function render() {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }
    render();
    if (disposed || signal.aborted) return;
    canvas.dataset.ready = "true";
    state.ready();
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}
