import * as THREE from "three";
import { createCloudSystem } from "./clouds";
import { clamp, mix, ease, heroPosition } from "./motion";
import { disposeHeroObject, loadHeroModel } from "./hero-model";
import { createHeroEnvironment } from "./environment";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { createCelestial } from "./celestial";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { createBlockLights } from "../../gallery/block-lights";

/** Owns only the scene and animated styles inside this root; abort tears down all resources. */
export async function mountJourney(
  root: HTMLElement,
  parentSignal: AbortSignal,
) {
  if (parentSignal.aborted) return;
  const controller = new AbortController(),
    signal = controller.signal;
  const abort = () => controller.abort();
  parentSignal.addEventListener("abort", abort, { once: true });
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => {
    const el = root.querySelector<T>(s);
    if (!el) throw new Error(`Missing scene element ${s}`);
    return el;
  };
  let width = innerWidth,
    height = innerHeight,
    mobile = width < 700,
    progress = 0,
    nowSeconds = 0,
    lastTime = 0;

  let sceneBlend = 0,
    exploreFocusPending = false,
    frame = 0,
    visible = true,
    disposed = false;
  let pointer = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0 };
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const resetPointer = () => {
    pointer = { x: 0, y: 0 };
  };
  const effects: { dispose(): void }[] = [];
  const textures: THREE.Texture[] = [],
    resources: THREE.Scene[] = [],
    renderers: THREE.WebGLRenderer[] = [];
  const teardown = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    controller.abort();
    parentSignal.removeEventListener("abort", abort);
    effects.forEach((effect) => effect.dispose());
    for (const scene of resources) disposeHeroObject(scene);
    textures.forEach((t) => t.dispose());
    renderers.forEach((r) => {
      r.dispose();
    });
    root.classList.remove("is-enhanced");
    delete root.dataset.heroModel;
    root
      .querySelectorAll<HTMLElement>("[style]")
      .forEach((el) => el.removeAttribute("style"));
    root
      .querySelectorAll<HTMLElement>("[inert]")
      .forEach((el) => (el.inert = false));
  };
  signal.addEventListener("abort", teardown, { once: true });
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas: $<HTMLCanvasElement>("#sky-canvas"),
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderers.push(renderer);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const worldRenderer = new THREE.WebGLRenderer({
      canvas: $<HTMLCanvasElement>("#world-canvas"),
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderers.push(worldRenderer);
    worldRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    worldRenderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 140);
    camera.position.set(0, 0, 14.4);
    scene.background = new THREE.Color("#f0d5c2");
    scene.fog = new THREE.Fog("#eed9cf", 22, 75);
    resources.push(scene);
    const loader = new THREE.TextureLoader();
    async function texture(path: string) {
      const t = await loader.loadAsync(path);
      if (disposed || signal.aborted) {
        t.dispose();
        throw new DOMException("Cancelled", "AbortError");
      }
      textures.push(t);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }
    const [courtTex, hallTex] = await Promise.all([
      texture("/xinera/courtyard.jpg"),
      texture("/xinera/hall.jpg"),
    ]);
    let cathedral: THREE.Group | undefined;
    let heroLights: ReturnType<typeof createBlockLights> | undefined;
    let heroWater: { update(time: number): void } | undefined;
    let lastShadow = -1,
      shadowRotation = 0;
    const lightTarget = new THREE.Vector3();
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: Math.min(4, renderer.capabilities.maxSamples),
    });
    const composer = new EffectComposer(renderer, target);
    const environment = createHeroEnvironment(renderer);
    scene.environment = environment.texture;
    effects.push(environment);
    const basePass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.25,
      0.35,
      1.5,
    );
    const occlusion = new GTAOPass(scene, camera);
    occlusion.updateGtaoMaterial({
      radius: 0.18,
      thickness: 0.35,
      distanceFallOff: 1,
      samples: 8,
    });
    occlusion.updatePdMaterial({ radius: 3, rings: 2, samples: 8 });
    occlusion.blendIntensity = 0.3;
    const antialias = new SMAAPass();
    const output = new OutputPass();
    composer.addPass(basePass);
    composer.addPass(occlusion);
    composer.addPass(bloom);
    composer.addPass(antialias);
    composer.addPass(output);
    effects.push(basePass, occlusion, bloom, antialias, output, composer);
    const ambient = new THREE.HemisphereLight("#ffecd4", "#b69a7f", 1.25);
    const sunLight = new THREE.DirectionalLight("#ffc17c", 3.4);
    sunLight.position.set(12, 7, -20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunLight.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 65,
    });
    sunLight.shadow.normalBias = 0.012;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.radius = 3;
    sunLight.target.position.set(1.8, 0, 0);
    const fill = new THREE.DirectionalLight("#ffe0b5", 1.75);
    fill.position.set(-5, 5, 12);
    scene.add(ambient, sunLight, sunLight.target, fill);
    const letters = new THREE.Group();
    letters.position.z = -5.8;
    scene.add(letters);
    const response = await fetch("/xinera/letter-shapes.json", { signal });
    if (!response.ok) throw new Error("Cannot load hero lettering");
    const shapes: {
      points: [number, number][];
      holes: [number, number][][];
    }[] = await response.json();
    const letterScale = ((9.08 / 1024) * (14.4 + 5.8)) / 14.4;
    function pointsToVectors(points: [number, number][]) {
      return points.map(
        ([x, y]) =>
          new THREE.Vector2((x - 768) * letterScale, (512 - y) * letterScale),
      );
    }
    for (const c of shapes) {
      const s = new THREE.Shape(pointsToVectors(c.points));
      s.holes = c.holes.map((h) => new THREE.Path(pointsToVectors(h)));
      const m = new THREE.Mesh(
        new THREE.ExtrudeGeometry(s, {
          depth: 0.28,
          bevelEnabled: false,
          curveSegments: 1,
        }),
        [
          new THREE.MeshBasicMaterial({
            color: "#fff8de",
            toneMapped: false,
            fog: false,
          }),
          new THREE.MeshBasicMaterial({
            color: "#debea0",
            toneMapped: false,
            fog: false,
          }),
        ],
      );
      letters.add(m);
    }
    const clouds = createCloudSystem(scene);
    const celestial = createCelestial(scene);
    let night = document.documentElement.dataset.theme === "dark" ? 1 : 0;
    let nightFrom = night,
      nightTo = night,
      transitionTime = 2;
    const themeObserver = new MutationObserver(() => {
      const next = document.documentElement.dataset.theme === "dark" ? 1 : 0;
      if (next === nightTo) return;
      nightFrom = night;
      nightTo = next;
      transitionTime = 0;
      wake();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    signal.addEventListener("abort", () => themeObserver.disconnect(), {
      once: true,
    });
    const daySun = new THREE.Color("#ffc17c"),
      nightSun = new THREE.Color("#a8c8ff");
    const dayFog = new THREE.Color("#eed9cf"),
      nightFog = new THREE.Color("#152139");
    const dayCloud = new THREE.Color("#ffffff"),
      nightCloud = new THREE.Color("#b8c6e5");
    const dayLetter = new THREE.Color("#fff8de"),
      nightLetter = new THREE.Color("#9baac5");
    const dayFill = new THREE.Color("#ffe0b5"),
      nightFill = new THREE.Color("#aec8ef");
    const dayAmbient = new THREE.Color("#ffecd4"),
      nightAmbient = new THREE.Color("#a3b8de");
    const dayEdge = new THREE.Color("#debea0"),
      nightEdge = new THREE.Color("#485875");

    const typeDepth = 2.6,
      typeAnchor = new THREE.Vector3();

    const worldScene = new THREE.Scene(),
      worldCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    worldCamera.position.z = 1;
    const uniforms = {
      court: { value: courtTex },
      hall: { value: hallTex },
      aspect: { value: width / height },
      blend: { value: 0 },
      zoom: { value: 1 },
      focus: { value: new THREE.Vector2(0.5, 0.5) },
      drift: { value: new THREE.Vector2() },
    };
    const worldMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: `
 precision highp float;varying vec2 vUv;uniform sampler2D court;uniform sampler2D hall;uniform float aspect;uniform float blend;uniform float zoom;uniform vec2 focus;uniform vec2 drift;
 vec2 fitted(vec2 uv,float ar){vec2 size=vec2(1.);if(aspect>ar)size.y=ar/aspect;else size.x=aspect/ar;return (uv-.5)*size/zoom+focus+drift;}
 void main(){vec4 a=texture2D(court,fitted(vUv,1.888)),b=texture2D(hall,fitted(vUv,1.777));gl_FragColor=mix(a,b,blend);
 #include <colorspace_fragment>
 }`,
    });
    resources.push(worldScene);
    worldScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), worldMaterial),
    );

    function resize() {
      width = innerWidth;
      height = innerHeight;
      mobile = width < 700;
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      occlusion.setSize(Math.ceil(width * 0.8), Math.ceil(height * 0.8));
      worldRenderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = mobile ? 48 : 35;
      camera.updateProjectionMatrix();
      uniforms.aspect.value = width / height;
      if (cathedral) {
        cathedral.scale.setScalar(mobile ? 0.37 : 0.6);
        cathedral.position.set(mobile ? 0.1 : 2.1, mobile ? -2.3 : -1.6, 0);
      }
      letters.scale.setScalar(mobile ? 0.8 : 1);
      letters.position.x = mobile ? -1 : 0;
      letters.position.y = mobile ? -1.2 : 0;
      $("#hero-type").style.width = mobile
        ? "47%"
        : (height * 373) / 1024 + "px";
      renderer.shadowMap.needsUpdate = true;
      const halfY =
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (14.4 - typeDepth);
      typeAnchor.set(
        ((mobile ? 0.07 : 0.0677) * 2 - 1) * halfY * camera.aspect,
        (1 - 2 * (mobile ? 0.16 : 0.1172)) * halfY,
        typeDepth,
      );
      clouds.setMobile(mobile);
    }
    window.addEventListener("resize", resize, { signal });
    resize();
    function render(p: number) {
      const lightState =
        night < 0.001 ? "day" : night > 0.999 ? "night" : "changing";
      if (root.dataset.heroLight !== lightState)
        root.dataset.heroLight = lightState;
      const sceneChoice = root.dataset.scene === "hall" ? "hall" : "courtyard";
      const aperture = ease(0.43, 0.66, p),
        settle = ease(0.79, 1, p);
      const coordinates = heroPosition(p),
        pointerStrength =
          (1 - ease(0.25, 0.4, p)) * (mobile || !finePointer.matches ? 0 : 1);
      // Mobile keeps the same direction with a shorter horizontal leg.
      camera.position.set(
        coordinates[0] * (mobile ? 0.56 : 1) + mouse.x * 0.32 * pointerStrength,
        coordinates[1] * (mobile ? 0.72 : 1) + mouse.y * 0.18 * pointerStrength,
        coordinates[2],
      );
      camera.updateMatrixWorld();
      if (p < 0.68) {
        if (cathedral) {
          cathedral.rotation.set(
            0.04 + mouse.y * 0.012 * pointerStrength,
            -1.08 +
              Math.sin(nowSeconds * 0.1) * 0.065 +
              mouse.x * 0.045 * pointerStrength,
            0,
          );
          cathedral.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            for (const material of Array.isArray(object.material)
              ? object.material
              : [object.material])
              if (material instanceof THREE.MeshStandardMaterial)
                material.emissiveIntensity = mix(1.6, 2.8, night);
          });
        }
        clouds.meshes[0].material.color.copy(dayCloud).lerp(nightCloud, night);
        for (const object of letters.children) {
          const mesh = object as THREE.Mesh<
            THREE.ExtrudeGeometry,
            THREE.MeshBasicMaterial[]
          >;
          mesh.material[0].color.copy(dayLetter).lerp(nightLetter, night);
          mesh.material[1].color.copy(dayEdge).lerp(nightEdge, night);
        }
        ambient.intensity = mix(0.4, 0.45, night);
        scene.environmentIntensity = mix(0.38, 0.12, night);
        ambient.color.copy(dayAmbient).lerp(nightAmbient, night);
        sunLight.intensity = mix(4.6, 2.4, night);
        sunLight.color.copy(daySun).lerp(nightSun, night);
        scene.fog!.color.copy(dayFog).lerp(nightFog, night);
        (scene.background as THREE.Color).copy(dayFog).lerp(nightFog, night);
        fill.intensity = mix(0.85, 0.4, night);
        fill.color.copy(dayFill).lerp(nightFill, night);
        renderer.toneMappingExposure = mix(1.15, 1.05, night);
        const daylight = celestial.update(night, mobile);
        sunLight.position.copy(daylight.position);
        sunLight.intensity *= daylight.strength;
        clouds.update(nowSeconds);
        heroWater?.update(nowSeconds);
        if (cathedral) {
          lightTarget.copy(cathedral.position);
          lightTarget.y += 0.8;
          heroLights?.update(camera, lightTarget, night, 1 / 60);
        }
        if (
          cathedral &&
          (lastShadow < 0 ||
            transitionTime < 2 ||
            Math.abs(cathedral.rotation.y - shadowRotation) > 0.004 ||
            nowSeconds - lastShadow > 0.25)
        ) {
          renderer.shadowMap.needsUpdate = true;
          lastShadow = nowSeconds;
          shadowRotation = cathedral.rotation.y;
        }
        bloom.strength = mix(0.2, 0.32, night);
        composer.render();
      }
      $("#sky-scene").style.opacity = String(1 - ease(0.63, 0.68, p));
      $("#sky-scene").style.transform = "none";
      // Keep the approved scroll projection, but anchor the UI against pointer drift.
      const uiAnchor = typeAnchor.clone();
      uiAnchor.x += mouse.x * 0.32 * pointerStrength;
      uiAnchor.y += mouse.y * 0.18 * pointerStrength;
      const projected = uiAnchor.project(camera),
        copy = $("#hero-type");
      const scale = (14.4 - typeDepth) / (camera.position.z - typeDepth);
      copy.style.transformOrigin = "0 0";
      copy.style.transform = `translate3d(${(projected.x * 0.5 + 0.5) * width - width * (mobile ? 0.07 : 0.0677)}px,${(-projected.y * 0.5 + 0.5) * height - height * (mobile ? 0.16 : 0.1172)}px,0) scale(${scale})`;
      copy.style.opacity = String(1 - ease(0.44, 0.52, p));
      copy.inert = p > 0.4;
      const navOut = ease(0.17, 0.3, p);
      $("#hero-nav").style.opacity = String(1 - navOut);
      $("#hero-nav").style.transform = `translateY(${-navOut * 28}px)`;
      $("#hero-nav").inert = p > 0.3;
      const cue = $(".scroll-hint");
      cue.style.opacity = String(1 - ease(0.01, 0.12, p));
      cue.inert = p > 0.1;
      let left = mix(0.07, 0, ease(0.38, 0.66, p)),
        right = left,
        top = 0,
        bottom = 0;
      left = mix(left, mobile ? 0.07 : 0.06, settle);
      right = mix(right, mobile ? 0.07 : 0.4, settle);
      top = mix(top, mobile ? 0.05 : 0.08, settle);
      bottom = mix(bottom, mobile ? 0.47 : 0.1, settle);
      $("#view-window").style.clipPath =
        `inset(${top * 100}% ${right * 100}% ${bottom * 100}% ${left * 100}%)`;
      $("#view-window").style.transform =
        `translateY(${(1 - aperture) * height * 1.02}px)`;
      $("#view-window").inert = p < 0.63;
      // The photograph keeps one continuous crop while the image aperture opens.
      uniforms.zoom.value = mix(1.1, 1.025, aperture);
      uniforms.focus.value.set(mobile ? 0.405 : 0.5, 0.5);
      uniforms.drift.value.set(
        (1 - settle) * mouse.x * 0.002,
        (1 - settle) * mouse.y * 0.002,
      );
      uniforms.blend.value = sceneBlend;
      if (p > 0.245) worldRenderer.render(worldScene, worldCamera);
      const labelIn = ease(0.57, 0.67, p) * (1 - ease(0.76, 0.88, p));
      $("#world-title").style.opacity = String(labelIn);
      $("#world-title").style.transform =
        `translateY(${(1 - ease(0.57, 0.67, p)) * 24}px)`;
      $("#scene-tabs").style.opacity = String(labelIn);
      $("#scene-tabs").inert = labelIn < 0.8;
      if (exploreFocusPending && p >= 0.665) {
        exploreFocusPending = false;
        $(`[data-scene="${sceneChoice}"]`).focus({ preventScroll: true });
      }

      $("#world-caption").style.opacity = String(ease(0.85, 0.98, p));
      $("#world-caption").style.transform =
        `translateY(${(1 - ease(0.85, 0.98, p)) * 35}px)`;
      $("#world-caption").inert = p < 0.94;
    }

    function distance() {
      return root.offsetHeight - innerHeight;
    }
    function tick(time: number) {
      if (disposed || signal.aborted || !visible || document.hidden) {
        frame = 0;
        return;
      }
      const dt = Math.min(0.05, (time - (lastTime || time)) / 1000);
      lastTime = time;
      nowSeconds += dt;
      transitionTime = Math.min(2, transitionTime + dt);
      night = mix(nightFrom, nightTo, ease(0, 2, transitionTime));
      mouse.x = mix(mouse.x, pointer.x, 1 - Math.exp(-dt * 7));
      mouse.y = mix(mouse.y, pointer.y, 1 - Math.exp(-dt * 7));
      const target = root.dataset.scene === "hall" ? 1 : 0;
      sceneBlend = mix(sceneBlend, target, 1 - Math.exp(-dt * 7));
      if (Math.abs(sceneBlend - target) < 0.0001) sceneBlend = target;
      progress = mix(
        progress,
        clamp((scrollY - root.offsetTop) / distance()),
        1 - Math.exp(-dt * 9),
      );
      render(progress);
      frame = requestAnimationFrame(tick);
    }
    function wake() {
      if (
        !frame &&
        visible &&
        !document.hidden &&
        !signal.aborted &&
        !disposed
      ) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(root);
    signal.addEventListener("abort", () => observer.disconnect(), {
      once: true,
    });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          cancelAnimationFrame(frame);
          frame = 0;
          resetPointer();
        } else wake();
      },
      { signal },
    );
    window.addEventListener(
      "pointermove",
      (e) => {
        if (
          e.pointerType !== "mouse" ||
          !finePointer.matches ||
          mobile ||
          document.querySelector("dialog[open]")
        ) {
          resetPointer();
          return;
        }
        pointer = {
          x: clamp((e.clientX / width - 0.5) * 2, -1, 1),
          y: clamp(-(e.clientY / height - 0.5) * 2, -1, 1),
        };
      },
      { passive: true, signal },
    );
    document.addEventListener("pointerleave", resetPointer, { signal });
    window.addEventListener("blur", resetPointer, { signal });
    root.addEventListener(
      "click",
      (e) => {
        const target = e.target as Element;
        if (!target.closest("[data-enter-world]")) return;
        e.preventDefault();
        exploreFocusPending = true;
        resetPointer();
        window.scrollTo({
          top: root.offsetTop + distance() * 0.7,
          behavior: "smooth",
        });
      },
      { signal },
    );
    window.addEventListener(
      "wheel",
      () => {
        exploreFocusPending = false;
      },
      { passive: true, signal },
    );
    for (const canvas of [
      $<HTMLCanvasElement>("#sky-canvas"),
      $<HTMLCanvasElement>("#world-canvas"),
    ])
      canvas.addEventListener("webglcontextlost", () => teardown(), { signal });
    root.dataset.heroModel = "loading";
    void loadHeroModel(signal, renderer.capabilities.getMaxAnisotropy())
      .then(({ group: model, lights, water }) => {
        if (disposed || signal.aborted) {
          disposeHeroObject(model);
          return;
        }
        cathedral = model;
        heroLights = lights;
        heroWater = water;
        root.dataset.waterMeshes = String(water.count);
        root.dataset.lightSources = String(lights.count);
        scene.add(model);
        root.dataset.heroModel = "ready";
        resize();
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        root.dataset.heroModel = "fallback";
        console.warn(
          "Cathedral preview unavailable; keeping the poster.",
          error,
        );
      });
    root.classList.add("is-enhanced");
    resize();
    progress = clamp((scrollY - root.offsetTop) / distance());
    render(progress);
    wake();
  } catch (error) {
    teardown();
    throw error;
  }
}
