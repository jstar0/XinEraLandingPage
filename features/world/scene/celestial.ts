import * as THREE from "three";
import type { WorldTime } from "./world-time";

/** One sky and one orbital frame for the visible bodies and the incident light. */
export function createCelestial(scene: THREE.Scene) {
  const uniforms = {
    night: { value: 0 },
    warmth: { value: 0 },
    sunPosition: { value: new THREE.Vector3() },
    moonPosition: { value: new THREE.Vector3() },
    sunVisibility: { value: 1 },
    moonVisibility: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 180),
    new THREE.ShaderMaterial({
      uniforms,
      depthWrite: false,
      toneMapped: false,
      vertexShader: `varying vec3 worldPosition;
        void main(){vec4 p=modelMatrix*vec4(position,1.);worldPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `varying vec3 worldPosition;
        uniform float night, warmth, sunVisibility, moonVisibility;
        uniform vec3 sunPosition, moonPosition;
        void main(){
          vec3 ray=normalize(worldPosition-cameraPosition);
          float h=smoothstep(-.12,.4,ray.y);
          vec3 horizon=mix(vec3(.46,.63,.79),vec3(.78,.34,.16),warmth);
          vec3 zenith=mix(vec3(.12,.28,.48),vec3(.22,.24,.39),warmth);
          vec3 day=mix(horizon,zenith,h);
          vec3 dark=mix(vec3(.012,.018,.04),vec3(.003,.008,.022),h);
          vec3 color=mix(day,dark,night);
          float s=max(0.,dot(ray,normalize(sunPosition-cameraPosition)));
          float m=max(0.,dot(ray,normalize(moonPosition-cameraPosition)));
          color+=vec3(.45,.25,.065)*(pow(s,16.)*.7+pow(s,180.)*.7)*sunVisibility;
          color+=vec3(.08,.13,.23)*(pow(m,60.)*.45+pow(m,230.)*.4)*moonVisibility;
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.position.z = -75;
  scene.add(sky);
  function body(moon: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    const context = canvas.getContext("2d")!;
    context.fillStyle = moon ? "#9aaecb" : "#ffd76d";
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = moon ? "#e3edff" : "#fff5b4";
    context.fillRect(2, 2, 12, 12);
    context.fillStyle = moon ? "#b6c9e4" : "#fffedc";
    if (moon) {
      context.fillRect(3, 3, 4, 3);
      context.fillRect(9, 8, 4, 4);
      context.fillRect(4, 11, 3, 2);
    } else context.fillRect(4, 4, 8, 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 1.45),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        fog: false,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    mesh.material.color.setScalar(moon ? 1.1 : 1.25);
    mesh.name = moon ? "minecraft-moon" : "minecraft-sun";
    scene.add(mesh);
    return mesh;
  }
  const sun = body(false),
    moon = body(true);
  const starsGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  let seed = 41;
  for (let i = 0; i < 180; i++) {
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    positions.push((random() - 0.5) * 75, random() * 23 - 1, -38);
  }
  starsGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({
      color: "#dce8ff",
      size: 0.055,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  scene.add(stars);
  const lighting = { position: new THREE.Vector3(), strength: 1 };
  const skySun = new THREE.Vector3();
  const skyMoon = new THREE.Vector3();
  const frontSun = new THREE.Vector3();
  const frontMoon = new THREE.Vector3();
  return {
    update(
      time: WorldTime,
      mobile: boolean,
      camera: THREE.PerspectiveCamera,
      reveal = 1,
    ) {
      const { orbit, night, warmth } = time;
      const x = 8 * Math.sin(orbit);
      const y = 15 * Math.cos(orbit);
      skySun.set(x, y - 5, -20);
      skyMoon.set(-x, -y - 5, -20);
      if (mobile) {
        // Preserve the same left-to-right arc in the narrow strip between the
        // mobile navigation and wordmark, instead of bouncing in a side lane.
        const halfY = Math.tan(THREE.MathUtils.degToRad(48 / 2)) * 34.4;
        const place = (point: THREE.Vector3, phase: number) => {
          const altitude = Math.max(0, Math.cos(phase));
          point.x = Math.sin(phase) * halfY * camera.aspect * 0.84;
          point.y = (1 - 2 * (0.109 + (1 - altitude) * 0.0166)) * halfY;
        };
        place(skySun, orbit);
        place(skyMoon, orbit + Math.PI);
      }
      // Keep the visible bodies in the sky so architecture occludes them.
      // Project the same sky rays to the island's front for the incident light;
      // this preserves the approved front lighting without drawing a moon on a roof.
      const projection = (camera.position.z - 7.8) / (camera.position.z + 20);
      frontSun.lerpVectors(camera.position, skySun, projection);
      frontMoon.lerpVectors(camera.position, skyMoon, projection);
      sun.position.copy(skySun);
      moon.position.copy(skyMoon);
      const bodyScale = mobile
        ? (Math.tan(THREE.MathUtils.degToRad(24)) * 34.4 * 2 * 0.0284) / 1.45
        : 0.8;
      sun.scale.setScalar(bodyScale);
      moon.scale.setScalar(bodyScale);
      const sunVisible =
        THREE.MathUtils.smoothstep(Math.cos(orbit), 0.08, 0.3) *
        time.sunVisibility;
      const moonVisible = THREE.MathUtils.smoothstep(
        -Math.cos(orbit),
        0.08,
        0.3,
      );
      const appearance = THREE.MathUtils.clamp(reveal, 0, 1);
      sun.material.opacity = sunVisible * appearance;
      moon.material.opacity = moonVisible * appearance;
      // Keep visible bodies eligible for shader warmup even at zero opacity.
      sun.visible = sunVisible > 0.001;
      moon.visible = moonVisible > 0.001;
      uniforms.night.value = night;
      uniforms.warmth.value = warmth;
      uniforms.sunPosition.value.copy(sun.position);
      uniforms.moonPosition.value.copy(moon.position);
      uniforms.sunVisibility.value = sunVisible * appearance;
      uniforms.moonVisibility.value = moonVisible * appearance;
      stars.material.opacity =
        THREE.MathUtils.smoothstep(night, 0.35, 1) * 0.65;
      // The key light follows the body's projected ray, on the camera-facing side.
      lighting.position.copy(sunVisible >= moonVisible ? frontSun : frontMoon);
      lighting.strength = Math.max(sunVisible, moonVisible);
      return lighting;
    },
  };
}
