import * as THREE from "three";

/** One sky and one orbital frame for the visible bodies and the incident light. */
export function createCelestial(scene: THREE.Scene) {
  const uniforms = {
    night: { value: 0 },
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
        uniform float night, sunVisibility, moonVisibility;
        uniform vec3 sunPosition, moonPosition;
        void main(){
          vec3 ray=normalize(worldPosition-cameraPosition);
          float h=smoothstep(-.12,.4,ray.y);
          vec3 day=mix(vec3(.75,.30,.15),vec3(.19,.22,.33),h);
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
    mesh.material.color.setScalar(moon ? 1.1 : 3.2);
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
  return {
    update(night: number, mobile: boolean) {
      const orbit = night * Math.PI;
      const x = (mobile ? 5.1 : 12) * Math.cos(orbit) + 7 * Math.sin(orbit);
      const y = 12 * Math.cos(orbit);
      sun.position.set(x, y - 5, -20);
      moon.position.set(-x, -y - 5, -20);
      const sunVisible = THREE.MathUtils.smoothstep(sun.position.y, -6, 4);
      const moonVisible = THREE.MathUtils.smoothstep(moon.position.y, -6, 4);
      sun.material.opacity = sunVisible;
      moon.material.opacity = moonVisible;
      sun.visible = sunVisible > 0.001;
      moon.visible = moonVisible > 0.001;
      uniforms.night.value = night;
      uniforms.sunPosition.value.copy(sun.position);
      uniforms.moonPosition.value.copy(moon.position);
      uniforms.sunVisibility.value = sunVisible;
      uniforms.moonVisibility.value = moonVisible;
      stars.material.opacity =
        THREE.MathUtils.smoothstep(night, 0.35, 1) * 0.65;
      // The key light uses the very same location as the body visible in the sky.
      lighting.position.copy(night < 0.5 ? sun.position : moon.position);
      lighting.strength = Math.max(sunVisible, moonVisible);
      return lighting;
    },
  };
}
