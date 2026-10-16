import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

type WaterLevel = { height: number; area: number; positions: number[] };

/** Reflect only the source water's largest horizontal level; retain all original sides. */
export function createSceneWater(
  scene: THREE.Scene,
  model: THREE.Object3D,
  sunDirection: THREE.Vector3,
) {
  const levels = new Map<number, WaterLevel>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  model.updateWorldMatrix(true, true);
  model.traverse((node) => {
    // The export separates water, glass and ice; never infer water from transparency.
    if (!(node instanceof THREE.Mesh) || node.name !== "water") return;
    const geometry = node.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    if (!position) return;
    const count = index?.count ?? position.count;
    const end = Math.min(
      count,
      geometry.drawRange.start + geometry.drawRange.count,
    );
    const mirrored = node.matrixWorld.determinant() < 0;
    for (let offset = geometry.drawRange.start; offset + 2 < end; offset += 3) {
      // Accessors decode normalized quantized attributes, then the node transform
      // restores the export's scale and translation into world coordinates.
      const read = (target: THREE.Vector3, vertex: number) => {
        const i = index ? index.getX(vertex) : vertex;
        target.set(position.getX(i), position.getY(i), position.getZ(i));
        target.applyMatrix4(node.matrixWorld);
      };
      read(a, offset);
      read(b, offset + (mirrored ? 2 : 1));
      read(c, offset + (mirrored ? 1 : 2));
      const normal = ab.subVectors(b, a).cross(ac.subVectors(c, a));
      const twiceArea = normal.length();
      if (
        twiceArea < 1e-10 ||
        normal.y / twiceArea < 0.99999 ||
        Math.max(a.y, b.y, c.y) - Math.min(a.y, b.y, c.y) > 0.0001
      )
        continue;
      const height = (a.y + b.y + c.y) / 3;
      const key = Math.round(height * 10_000);
      let level = levels.get(key);
      if (!level) {
        level = { height, area: 0, positions: [] };
        levels.set(key, level);
      }
      level.area += twiceArea / 2;
      level.positions.push(a.x, a.z, b.x, b.z, c.x, c.z);
    }
  });
  let largest: WaterLevel | undefined;
  for (const level of levels.values())
    if (!largest || level.area > largest.area) largest = level;
  if (!largest) return { update() {}, dispose() {} };

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((largest.positions.length / 2) * 3);
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < largest.positions.length; i += 2) {
    minX = Math.min(minX, largest.positions[i]);
    maxX = Math.max(maxX, largest.positions[i]);
    minZ = Math.min(minZ, largest.positions[i + 1]);
    maxZ = Math.max(maxZ, largest.positions[i + 1]);
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  for (let i = 0; i < largest.positions.length / 2; i++) {
    // Reflector expects a local XY plane with +Z normal. Rotation below maps it
    // back to the exact source XZ triangles, including every hole and shoreline.
    positions[i * 3] = largest.positions[i * 2] - centerX;
    positions[i * 3 + 1] = centerZ - largest.positions[i * 2 + 1];
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const water = new Reflector(geometry, {
    textureWidth: innerWidth < 700 ? 512 : 768,
    textureHeight: innerWidth < 700 ? 512 : 768,
    multisample: 0,
    clipBias: 0.001,
    shader: {
      name: "SourceSceneWater",
      uniforms: {
        color: { value: new THREE.Color() },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
        sunDirection: { value: sunDirection.clone().normalize() },
        time: { value: 0 },
        night: { value: 0 },
        deep: { value: new THREE.Color("#205c69") },
        haze: { value: new THREE.Color("#b8d0dc") },
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 reflectionUv;
        varying vec3 worldPosition;
        void main() {
          reflectionUv=textureMatrix*vec4(position,1.0);
          worldPosition=(modelMatrix*vec4(position,1.0)).xyz;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time,night;
        uniform vec3 sunDirection,deep,haze;
        varying vec4 reflectionUv;
        varying vec3 worldPosition;
        float wave(vec2 p) {
          return sin(p.x*1.1+p.y*.7+time*.45)*.018
            +sin(p.x*.6-p.y*1.4+time*.37)*.013
            +sin(p.x*2.7+p.y*1.9-time*.6)*.005;
        }
        void main() {
          vec2 p=worldPosition.xz;
          float h=wave(p);
          vec3 n=normalize(vec3((h-wave(p+vec2(.07,0.0)))/.07,1.0,
            (h-wave(p+vec2(0.0,.07)))/.07));
          float distanceToEye=length(cameraPosition-worldPosition);
          n.xz*=min(1.0,60.0/max(distanceToEye,.001));
          n=normalize(n);
          vec3 eye=normalize(cameraPosition-worldPosition);
          float fresnel=.08+.80*pow(1.0-max(dot(eye,n),0.0),3.0);
          vec2 uv=clamp(reflectionUv.xy/reflectionUv.w+n.xz*.025,.001,.999);
          vec3 reflected=texture2D(tDiffuse,uv).rgb;
          vec3 tint=deep*mix(1.0,.16,night);
          float glint=pow(max(dot(reflect(-sunDirection,n),eye),0.0),220.0);
          vec3 result=mix(tint,reflected,fresnel)
            +vec3(1.0,.76,.44)*glint*1.8*(1.0-night);
          result=mix(result,mix(haze,vec3(.014,.025,.05),night),
            smoothstep(100.0,750.0,distanceToEye)*.85);
          gl_FragColor=vec4(result,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  water.name = "gallery-water-reflection";
  water.rotation.x = -Math.PI / 2;
  // The surface is static: wave normals never move vertices beyond source shores.
  water.position.set(centerX, largest.height + 0.002, centerZ);
  water.userData.sourceWater = {
    height: largest.height,
    area: largest.area,
    triangles: positions.length / 9,
    levels: levels.size,
  };
  scene.attach(water);
  const material = water.material as THREE.ShaderMaterial;
  const reflect = water.onBeforeRender;
  let reflectedAt = -Infinity;
  const reflectedView = new THREE.Matrix4();
  const reflectedProjection = new THREE.Matrix4();
  let disposed = false;
  let reflecting = false;
  water.onBeforeRender = function (...args) {
    const [, renderScene, camera] = args;
    if (disposed || reflecting || renderScene.overrideMaterial) return;
    const now = performance.now();
    // Track position, rotation and zoom; idle water can still update at 30 Hz.
    const cameraChanged =
      !reflectedView.equals(camera.matrixWorld) ||
      !reflectedProjection.equals(camera.projectionMatrix);
    if (!cameraChanged && now - reflectedAt < 1000 / 30) return;
    reflecting = true;
    try {
      reflect.apply(this, args);
      reflectedView.copy(camera.matrixWorld);
      reflectedProjection.copy(camera.projectionMatrix);
      reflectedAt = now;
    } finally {
      reflecting = false;
    }
  };
  return {
    update(night: number, dt: number, moving: boolean) {
      if (disposed) return;
      material.uniforms.night.value = night;
      if (moving) material.uniforms.time.value += dt;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      water.removeFromParent();
      water.dispose();
      geometry.dispose();
    },
  };
}
