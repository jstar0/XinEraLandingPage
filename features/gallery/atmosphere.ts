import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

// Shared direction keeps the sky's sun, terrain shadows and water highlights aligned.
export const islandSun = new THREE.Vector3(-0.55, 0.48, 0.68).normalize();

export function createAtmosphere(
  scene: THREE.Scene,
  withOcean = true,
  sunDirection = islandSun,
) {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      night: { value: 0 },
      time: { value: 0 },
      sunDirection: { value: sunDirection },
      zenith: { value: new THREE.Color("#367ec4") },
      horizon: { value: new THREE.Color("#b8d0dc") },
    },
    vertexShader: `varying vec3 direction;
      void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 direction;
      uniform float night, time;
      uniform vec3 sunDirection, zenith, horizon;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
      }
      float fbm(vec2 p) {
        float n=0.0, a=0.5;
        for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=0.5;}
        return n;
      }
      void main() {
        vec3 d=normalize(direction);
        float elevation=max(d.y,0.0);
        vec3 day=mix(horizon,zenith,pow(elevation,0.45));
        float alignment=max(dot(d,sunDirection),0.0);
        day+=vec3(1.0,0.64,0.29)*pow(alignment,14.0)*0.25;
        day+=vec3(1.0,0.78,0.46)*smoothstep(0.99965,0.9999,alignment)*9.0;
        vec2 p=d.xz/(max(d.y,0.08)+0.18)*2.3+vec2(time*0.002,0.0);
        float cloud=smoothstep(0.57,0.79,fbm(p));
        cloud*=smoothstep(0.01,0.18,d.y);
        vec3 cloudColor=mix(vec3(0.56,0.62,0.67),vec3(1.35,1.22,1.04),fbm(p+0.15));
        day=mix(day,cloudColor,cloud*0.85);
        vec3 dark=mix(vec3(0.021,0.032,0.065),vec3(0.004,0.009,0.025),elevation);
        float stars=pow(hash(floor(d.xz/(max(d.y,0.02)+0.1)*650.0)),180.0)*smoothstep(0.05,0.3,d.y);
        dark+=stars*0.45*(1.0-cloud);
        gl_FragColor=vec4(mix(day,dark,night),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    skyMaterial,
  );
  sky.renderOrder = -2;
  scene.add(sky);

  const ocean = new Reflector(new THREE.PlaneGeometry(1800, 1800), {
    textureWidth: innerWidth < 700 ? 512 : 768,
    textureHeight: innerWidth < 700 ? 512 : 768,
    multisample: 0,
    clipBias: 0.001,
    shader: {
      name: "IslandOcean",
      uniforms: {
        color: { value: new THREE.Color() },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
        shoreMap: { value: null },
        time: { value: 0 },
        night: { value: 0 },
        sunDirection: { value: sunDirection },
        deep: { value: new THREE.Color("#164b5d") },
        shallow: { value: new THREE.Color("#5b9d8c") },
        haze: { value: new THREE.Color("#c7c5b6") },
      },
      vertexShader: `uniform mat4 textureMatrix;
        varying vec4 reflectionUv;
        varying vec3 worldPosition;
        void main() {
          reflectionUv=textureMatrix*vec4(position,1.0);
          worldPosition=(modelMatrix*vec4(position,1.0)).xyz;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse,shoreMap;
        uniform float time,night;
        uniform vec3 sunDirection,deep,shallow,haze;
        varying vec4 reflectionUv;
        varying vec3 worldPosition;
        float wave(vec2 p) {
          return sin(p.x*1.1+p.y*.7+time*.45)*.026
            +sin(p.x*.6-p.y*1.4+time*.37)*.02
            +sin(p.x*2.7+p.y*1.9-time*.6)*.007;
        }
        void main() {
          vec2 p=worldPosition.xz;
          float h=wave(p);
          vec3 n=normalize(vec3((h-wave(p+vec2(.07,0.0)))/.07,1.0,(h-wave(p+vec2(0.0,.07)))/.07));
          n.xz*=min(1.0,60.0/length(cameraPosition-worldPosition));
          n=normalize(n);
          vec3 eye=normalize(cameraPosition-worldPosition);
          float facing=max(dot(eye,n),0.0);
          float fresnel=.08+.84*pow(1.0-facing,3.0);
          vec2 uv=reflectionUv.xy/reflectionUv.w+n.xz*.04;
          vec3 reflected=texture2D(tDiffuse,uv).rgb;
          vec2 shoreUv=vec2((p.x+39.0)/78.0,1.0-(p.y+52.9)/105.8);
          float shore=texture2D(shoreMap,shoreUv).r;
          vec3 tint=mix(deep,shallow,shore*.55);
          tint*=mix(1.0,.16,night);
          float glint=pow(max(dot(reflect(-sunDirection,n),eye),0.0),220.0);
          vec3 result=mix(tint,reflected,fresnel)+vec3(1.0,.76,.44)*glint*2.2*(1.0-night);
          float distance=length(cameraPosition-worldPosition);
          result=mix(result,mix(haze,vec3(.014,.025,.05),night),smoothstep(100.0,750.0,distance)*.85);
          gl_FragColor=vec4(result,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.025;
  // AO's normal pass must not recursively render another reflection with override materials.
  const reflect = ocean.onBeforeRender;
  let reflectedAt = -Infinity;
  const reflectedView = new THREE.Matrix4();
  const reflectedProjection = new THREE.Matrix4();
  let reflecting = false;
  ocean.onBeforeRender = function (...args) {
    const [, renderScene, camera] = args;
    if (reflecting || renderScene.overrideMaterial) return;
    const now = performance.now();
    // Reusing a reflection from another camera pose makes it jump during motion.
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
  ocean.visible = withOcean;
  scene.add(ocean);
  const oceanMaterial = ocean.material as THREE.ShaderMaterial;
  let shore: THREE.Texture | undefined;
  return {
    setShore(texture: THREE.Texture) {
      shore = texture;
      oceanMaterial.uniforms.shoreMap.value = texture;
    },
    update(night: number, dt: number, moving: boolean) {
      skyMaterial.uniforms.night.value = night;
      oceanMaterial.uniforms.night.value = night;
      if (moving) {
        skyMaterial.uniforms.time.value += dt;
        oceanMaterial.uniforms.time.value += dt;
      }
    },
    dispose() {
      shore?.dispose();
      ocean.dispose();
      // Geometry and sky material are owned by the scene's normal cleanup.
    },
  };
}
