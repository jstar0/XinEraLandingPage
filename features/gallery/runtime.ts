import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BlockGTAOPass } from "../rendering/block-gtao-pass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { GalleryPlace, GallerySettings, IslandView } from "./content";
import { prepareBlockMaterialsAsync } from "./block-materials";
import { warmScene } from "../rendering/scene-warmup";
import { createAtmosphere, islandSun } from "./atmosphere";
import { sceneTours } from "./scene-tours";
import { createSceneWater } from "./scene-water";
import { createBlockLights, readBlockLights } from "./block-lights";
import {
  finishBlockMaterials,
  type BlockMaterialDefinitions,
} from "../rendering/block-materials";
import { createHeroEnvironment } from "../world/scene/environment";
import { loadBlockPbr } from "../rendering/pbr-textures";
import { nextPreparationTask } from "../rendering/prepare-budget";
import { modelAsset } from "@/lib/model-assets";
import { requestGalleryModel } from "./model-request";

export type IslandController = {
  view: (view: IslandView) => void;
  pause: () => void;
  reveal: () => void;
};

export async function mountIsland(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  settings: () => GallerySettings,
  unavailable: () => void,
  onTourPause: () => void,
  place: GalleryPlace = "volcano",
  onPreparing: () => void = () => {},
  modelBytes?: Promise<ArrayBuffer>,
): Promise<IslandController | undefined> {
  if (signal.aborted) return;
  const modelRequest = modelBytes ?? requestGalleryModel(place, signal);
  // A rejected request must remain handled if WebGL initialization fails first.
  void modelRequest.catch(() => {});
  const mark = (stage: string, detail?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      performance.mark(`gallery:${place}:${stage}`, { detail });
    } else if (["start", "parsed", "first-frame"].includes(stage)) {
      performance.mark(`gallery:${place}:${stage}`);
    }
  };
  mark("start");
  const island = place === "volcano";
  const interior = place === "hall";
  const cathedral = interior || place === "courtyard";
  const tours = sceneTours[place];
  function sampleTour(
    route: IslandView,
    phase: number,
    eye: THREE.Vector3,
    target: THREE.Vector3,
  ) {
    tours[route].eye.getPointAt(((phase % 1) + 1) % 1, eye);
    tours[route].target.getPointAt(((phase % 1) + 1) % 1, target);
  }
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.5),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const environment = createHeroEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(cathedral ? 55 : 43, 1, 0.1, 2500);
  const firstTarget = new THREE.Vector3();
  sampleTour("coast", 0, camera.position, firstTarget);
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  canvas.dataset.interactive = "false";
  canvas.dataset.frame = "preparing";
  controls.target.copy(firstTarget);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = island ? 12 : interior ? 0.5 : 1;
  controls.maxDistance = island ? 150 : interior ? 9 : 45;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = cathedral ? Math.PI * 0.8 : Math.PI / 2 - 0.025;
  controls.autoRotateSpeed = 0.28;
  controls.zoomSpeed = 0.65;
  controls.rotateSpeed = 0.5;
  // Leave one-finger page scrolling available; two fingers rotate/zoom the model.
  controls.touches.ONE = null;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  canvas.style.touchAction = "pan-y";
  controls.update();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const daylight = new THREE.Color("#a9bfcb"),
    moonlight = new THREE.Color("#111d30");
  scene.background = daylight.clone();
  scene.fog = new THREE.Fog(daylight, island ? 42 : 18, island ? 220 : 95);
  const ambient = new THREE.HemisphereLight("#b8cce0", "#8e866c", 1.05);
  const sun = new THREE.DirectionalLight("#ffdb9c", 4.2);
  const sunDirection =
    place === "courtyard"
      ? new THREE.Vector3(0.65, 0.48, 0.45).normalize()
      : place === "west"
        ? new THREE.Vector3(0.65, 0.48, -0.45).normalize()
        : islandSun;
  sun.position.copy(sunDirection).multiplyScalar(65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(
    innerWidth < 700 ? 1024 : 2048,
    innerWidth < 700 ? 1024 : 2048,
  );
  Object.assign(sun.shadow.camera, {
    left: -34,
    right: 34,
    top: 34,
    bottom: -34,
    far: 160,
  });
  if (!island)
    Object.assign(sun.shadow.camera, {
      left: -20,
      right: 20,
      top: 20,
      bottom: -20,
    });
  sun.shadow.normalBias = island ? 0.012 : 0.005;
  sun.shadow.bias = -0.00015;
  sun.shadow.radius = 2.5;
  const moon = new THREE.DirectionalLight("#a8c5f0", 0);
  moon.position.set(25, 40, -35);
  const skyFill = new THREE.DirectionalLight("#b6d4e8", 1.2);
  skyFill.position.set(25, 24, 40);
  scene.add(ambient, sun, moon, skyFill);
  const lavaLight = new THREE.PointLight("#ff842e", 0, 12, 2);
  lavaLight.position.set(0.93, 6.4, -5.34);
  scene.add(lavaLight);

  const windowLights: THREE.PointLight[] = [];
  if (interior) {
    for (const [color, x, y, z] of [
      ["#75a7ff", -7.8, 2.7, 0.1],
      ["#ffb46f", -4.6, 3.4, 0.1],
      ["#ac9aff", -1.5, 2.8, 0.1],
    ] as const) {
      const light = new THREE.PointLight(color, 7, 9, 1.3);
      light.position.set(x, y, z);
      scene.add(light);
      windowLights.push(light);
    }
  }
  const atmosphere = createAtmosphere(scene, island, sunDirection);
  let sceneWater: ReturnType<typeof createSceneWater> | undefined;

  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, target);
  const basePass = new RenderPass(scene, camera);
  const occlusion = new BlockGTAOPass(scene, camera);
  occlusion.updateGtaoMaterial({
    radius: 0.4,
    thickness: 0.7,
    distanceFallOff: 1,
    samples: 8,
  });
  occlusion.updatePdMaterial({ radius: 4, rings: 2, samples: 8 });
  occlusion.blendIntensity = 0.4;
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.15, 0.45, 1.1);
  const antialias = new SMAAPass();
  const output = new OutputPass();
  composer.addPass(basePass);
  composer.addPass(occlusion);
  composer.addPass(bloom);
  composer.addPass(antialias);
  composer.addPass(output);

  let frame = 0,
    disposed = false,
    prepared = false,
    inView = true,
    previous = 0,
    night = 0;
  let tourPhase = 0;
  let wasTouring = settings().touring && !reduced.matches;
  const tourEye = new THREE.Vector3();
  const tourTarget = new THREE.Vector3();
  let flight:
    | {
        fromEye: THREE.Vector3;
        fromTarget: THREE.Vector3;
        eye: THREE.Vector3;
        path: THREE.CubicBezierCurve3;
        target: THREE.Vector3;
        progress: number;
      }
    | undefined;
  let blockLights: ReturnType<typeof createBlockLights> | undefined;
  let pbr: Awaited<ReturnType<typeof loadBlockPbr>> | undefined;
  const emissiveMaterials: THREE.MeshStandardMaterial[] = [];
  const resize = new ResizeObserver(() => {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height || disposed) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    occlusion.setSize(Math.ceil(width * 0.75), Math.ceil(height * 0.75));
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    },
    { rootMargin: "100px" },
  );
  observer.observe(canvas);
  function release(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    controls.enabled = false;
    canvas.dataset.interactive = "false";
    canvas.dataset.frame = "disposed";
    cancelAnimationFrame(frame);
    observer.disconnect();
    resize.disconnect();
    document.removeEventListener("visibilitychange", schedule);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("keydown", keyboard);
    signal.removeEventListener("abort", dispose);
    controls.dispose();
    atmosphere.dispose();
    environment.dispose();
    sceneWater?.dispose();
    release(scene);
    pbr?.dispose();
    sun.shadow.map?.dispose();
    composer.passes.forEach((pass) => pass.dispose());
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    dispose();
    if (!signal.aborted) unavailable();
  }
  function keyboard(event: KeyboardEvent) {
    if (!controls.enabled) return;
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    pauseTour();
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === "ArrowLeft") spherical.theta -= 0.12;
    if (event.key === "ArrowRight") spherical.theta += 0.12;
    if (event.key === "ArrowUp") spherical.phi -= 0.09;
    if (event.key === "ArrowDown") spherical.phi += 0.09;
    if (event.key === "+" || event.key === "=") spherical.radius *= 0.88;
    if (event.key === "-") spherical.radius *= 1.12;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi,
      controls.minPolarAngle,
      controls.maxPolarAngle,
    );
    spherical.radius = THREE.MathUtils.clamp(
      spherical.radius,
      controls.minDistance,
      controls.maxDistance,
    );
    camera.position
      .copy(controls.target)
      .add(offset.setFromSpherical(spherical));
    controls.update();
  }
  function schedule() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (prepared && controls.enabled && !disposed && inView && !document.hidden)
      frame = requestAnimationFrame(render);
  }
  function render(time: number, firstFrame = false) {
    if (!prepared || disposed || (!firstFrame && (!inView || document.hidden)))
      return;
    const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0.016;
    previous = time;
    const options = settings();
    const targetNight = options.night ? 1 : 0;
    night = reduced.matches
      ? targetNight
      : THREE.MathUtils.damp(night, targetNight, 3.4, dt);
    const lightState =
      Math.abs(night - targetNight) < 0.005
        ? targetNight
          ? "night"
          : "day"
        : "changing";
    if (canvas.dataset.light !== lightState) canvas.dataset.light = lightState;
    (scene.background as THREE.Color).copy(daylight).lerp(moonlight, night);
    (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
    atmosphere.update(night, dt, !reduced.matches);
    sceneWater?.update(night, dt, !reduced.matches);
    ambient.intensity = THREE.MathUtils.lerp(
      interior ? 1.3 : 1.65,
      interior ? 0.65 : 0.7,
      night,
    );
    sun.intensity = 4.2 * (1 - night);
    moon.intensity = 1.1 * night;
    skyFill.intensity = 1.2 * (1 - night);
    scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.13, night);
    lavaLight.intensity = island ? 9 * night : 0;
    windowLights.forEach((light) => {
      // Colored daylight falls through the windows; glass is not a night lamp.
      light.intensity = 3.5 * (1 - night) + 0.2 * night;
    });
    bloom.strength = 0.22 + night * 0.12;
    emissiveMaterials.forEach((material) => {
      material.emissiveIntensity = 1.6 + night * 0.6;
    });
    const touring = options.touring && !reduced.matches;
    if (touring && !wasTouring && !flight)
      beginFlight(options.route, tourPhase);
    wasTouring = touring;
    canvas.dataset.touring = String(touring);
    if (touring && !flight) {
      tourPhase = (tourPhase + dt / tours[options.route].duration) % 1;
      sampleTour(options.route, tourPhase, camera.position, controls.target);
    }
    canvas.dataset.tourPhase = tourPhase.toFixed(4);
    if (flight) {
      flight.progress = reduced.matches
        ? 1
        : Math.min(1, flight.progress + dt / 2.8);
      const t = flight.progress * flight.progress * (3 - 2 * flight.progress);
      flight.path.getPoint(t, camera.position);
      controls.target.lerpVectors(flight.fromTarget, flight.target, t);
      if (flight.progress === 1) {
        flight = undefined;
        canvas.dataset.transition = "idle";
      }
    }
    controls.autoRotate = false;
    controls.enableDamping = !reduced.matches && !flight && !touring;
    controls.update(dt);
    blockLights?.update(camera, controls.target, night, dt);
    composer.render(dt);
    if (controls.enabled) frame = requestAnimationFrame(render);
  }
  signal.addEventListener("abort", dispose, { once: true });
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("keydown", keyboard);
  document.addEventListener("visibilitychange", schedule);
  function pauseTour() {
    flight = undefined;
    canvas.dataset.transition = "idle";
    onTourPause();
    wasTouring = false;
  }
  function beginFlight(route: IslandView, phase: number) {
    sampleTour(route, phase, tourEye, tourTarget);
    canvas.dataset.view = route;
    canvas.dataset.transition = "moving";
    const from = camera.position.clone();
    const first = from.clone().lerp(tourEye, 0.2);
    const second = from.clone().lerp(tourEye, 0.8);
    if (!interior && from.distanceTo(tourEye) > 5) {
      // Lift transfers above the island's 9.21-unit peak instead of cutting through a ridge.
      first.y = second.y = Math.max(
        island ? 22 : cathedral || place === "west" ? 12 : 8,
        from.y,
        tourEye.y,
      );
    }
    flight = {
      fromEye: from,
      fromTarget: controls.target.clone(),
      eye: tourEye.clone(),
      path: new THREE.CubicBezierCurve3(from, first, second, tourEye.clone()),
      target: tourTarget.clone(),
      progress: 0,
    };
  }
  controls.addEventListener("start", pauseTour);
  try {
    const sceneName = cathedral ? "cathedral" : place;
    // Sidecars and optional fluid geometry are independent downloads. Start
    // them together so the main scene never waits on a serial metadata chain.
    const loadBytes = async (url: string) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Gallery asset unavailable: ${url}`);
      return response.arrayBuffer();
    };
    const loadDefinitions = async () => {
      const response = await fetch(
        `/xinera/gallery/${sceneName}-materials.json`,
        { signal },
      );
      if (!response.ok)
        throw new Error("Gallery material definitions unavailable");
      return (await response.json()) as BlockMaterialDefinitions;
    };
    const definitionsPromise = loadDefinitions();
    const pbrPromise = definitionsPromise
      .then((definitions) =>
        loadBlockPbr(
          definitions,
          signal,
          renderer.capabilities.getMaxAnisotropy(),
        ),
      )
      .then((loaded) => {
        if (signal.aborted || disposed) {
          loaded.dispose();
          return;
        }
        pbr = loaded;
        canvas.dataset.pbr = "ready";
      })
      .catch((error: unknown) => {
        if (signal.aborted) throw error;
        // Supplementary surface detail must never turn a complete world into
        // an error screen when an individual material asset is unavailable.
        canvas.dataset.pbr = "fallback";
        console.warn(
          "Gallery PBR textures unavailable; using base materials",
          error,
        );
      });
    const shorePromise = island
      ? new THREE.TextureLoader()
          .loadAsync("/xinera/gallery/volcano-shore.png")
          .then((shore) => {
            if (signal.aborted || disposed) shore.dispose();
            else atmosphere.setShore(shore);
          })
      : Promise.resolve();
    const [bytes, definitions, lightData, waterBytes] = await Promise.all([
      modelRequest,
      definitionsPromise,
      readBlockLights(`/xinera/gallery/${sceneName}-lights.json`, signal),
      cathedral
        ? loadBytes(modelAsset("gallery/cathedral-water").url)
        : Promise.resolve(null),
      shorePromise,
      pbrPromise,
    ]);
    if (signal.aborted || disposed) return;
    onPreparing();
    mark("dependencies-ready");
    // Let React paint the preparation state before GLB parsing starts work.
    await nextPreparationTask(signal);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const model = await loader.parseAsync(bytes, "/xinera/gallery/");
    if (signal.aborted || disposed) {
      release(model.scene);
      return;
    }
    scene.add(model.scene);
    if (waterBytes) {
      const waterModel = await loader.parseAsync(
        waterBytes,
        "/xinera/gallery/",
      );
      if (signal.aborted || disposed) {
        release(waterModel.scene);
        return;
      }
      model.scene.add(waterModel.scene);
    }
    mark("parsed");
    await prepareBlockMaterialsAsync(
      model.scene,
      renderer.capabilities.getMaxAnisotropy(),
      signal,
    );
    mark("tile-materials");
    model.scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        if (material instanceof THREE.MeshStandardMaterial) {
          if (/lava/i.test(node.name + material.name)) {
            material.emissive.set("#ff9d48");
            material.emissiveMap = material.map;
          }
          if (material.emissiveMap) {
            material.emissive.set("#ffffff");
            material.emissiveIntensity = 1.6;
            emissiveMaterials.push(material);
          }
        }
      }
    });
    const materialStats = finishBlockMaterials(
      model.scene,
      definitions,
      pbr?.textures,
    );
    mark("physical-materials");
    canvas.dataset.blockMaterials = String(materialStats.materials);
    canvas.dataset.pbrMaterials = String(materialStats.pbrMaterials);
    canvas.dataset.waterMeshes = String(materialStats.waterMeshes);
    if (signal.aborted || disposed) return;
    blockLights = createBlockLights(scene, lightData);
    canvas.dataset.lightSources = String(lightData.sources.length);
    blockLights.update(camera, controls.target, 0, 1);
    if (!island)
      sceneWater = createSceneWater(scene, model.scene, sunDirection);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    composer.setSize(canvas.clientWidth, canvas.clientHeight);
    occlusion.setSize(
      Math.ceil(canvas.clientWidth * 0.75),
      Math.ceil(canvas.clientHeight * 0.75),
    );
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    mark("scene-ready");
    await warmScene(
      renderer,
      scene,
      camera,
      composer.readBuffer,
      { occlusion, bloom, antialias, output },
      signal,
      pbr?.textures,
    );
    mark(
      "compiled",
      renderer.info.programs?.map(({ id, name }) => ({ id, name })),
    );
    if (signal.aborted || disposed) return;
    prepared = true;
    // Draw the complete scene, including postprocessing, before the shared
    // arrival can reveal it. Camera input and touring remain paused until
    // the clouds have left the viewer.
    render(performance.now(), true);
    mark(
      "first-frame",
      renderer.info.programs?.map(({ id, name }) => ({ id, name })),
    );
    if (signal.aborted || disposed) return;
    // The terrain and sun position are fixed; orbiting does not require rebuilding the shadow map.
    renderer.shadowMap.autoUpdate = false;
    canvas.dataset.view = "coast";
    canvas.dataset.transition = "idle";
    canvas.dataset.frame = "ready";
    return {
      pause: pauseTour,
      reveal() {
        if (disposed) return;
        controls.enabled = true;
        wasTouring = settings().touring && !reduced.matches;
        canvas.dataset.interactive = "true";
        schedule();
      },
      view(value) {
        if (disposed || !controls.enabled) return;
        tourPhase = 0;
        beginFlight(value, 0);
      },
    };
  } catch (error) {
    dispose();
    if (!signal.aborted) throw error;
  }
}
