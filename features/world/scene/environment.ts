import * as THREE from "three";

/** Broad sky irradiance provides gradients on stone and soft reflections on glass/water. */
export function createHeroEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 direction;void main(){
      vec3 d=normalize(direction);
      vec3 ground=vec3(.17,.12,.085), sky=vec3(.5,.62,.78);
      vec3 c=mix(ground,sky,smoothstep(-.3,.8,d.y));
      float cloud=pow(max(0.,dot(d,normalize(vec3(-.5,.8,.7)))),9.);
      float horizon=pow(1.-abs(d.y),5.);
      c+=vec3(.8,.72,.58)*cloud+vec3(.25,.21,.16)*horizon;
      gl_FragColor=vec4(c,1.);
    }`,
  });
  const geometry = new THREE.SphereGeometry(10, 32, 16);
  scene.add(new THREE.Mesh(geometry, material));
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(scene, 0.06, 0.1, 30);
  generator.dispose();
  geometry.dispose();
  material.dispose();
  return target;
}
