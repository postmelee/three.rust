import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  createOwnedAnimation,
  createOwnedRenderer,
} from "/packages/rthree/owned.js";
import { descriptorFromFox } from "./descriptor.mjs";
const started = performance.now(),
  q = new URLSearchParams(location.search),
  variant = q.get("variant") || "original",
  count = Number(q.get("count") || 1),
  isStatic = q.has("static");
if (
  !["original", "owned-js", "owned-wasm"].includes(variant) ||
  ![1, 16].includes(count)
)
  throw Error("Unsupported comparison");
const loadStart = performance.now(),
  gltf = await new GLTFLoader().loadAsync("/work/assets/Fox.glb"),
  assetMs = performance.now() - loadStart;
if (gltf.animations.map((c) => c.name).join(",") !== "Survey,Walk,Run")
  throw Error("Unexpected clips");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x243041);
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x5b4832, 2));
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(3, 6, 4);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(42, 640 / 480, 0.1, 100);
const span = count === 1 ? 1 : 4;
const roots = Array.from({ length: count }, (_, i) =>
  new THREE.Matrix4()
    .compose(
      new THREE.Vector3(
        ((i % span) - (span - 1) / 2) * 2.7,
        0,
        (Math.floor(i / span) - (span - 1) / 2) * 2.7,
      ),
      new THREE.Quaternion(),
      new THREE.Vector3(0.015, 0.015, 0.015),
    )
    .toArray(),
);
const convertStart = performance.now(),
  converted = descriptorFromFox(THREE, gltf.scene, gltf.animations, roots),
  descriptor = converted.descriptor,
  conversionMs = performance.now() - convertStart;
let domain,
  adapter,
  rigs = [];
const initStart = performance.now();
if (variant === "original") {
  for (let i = 0; i < count; i++) {
    const model = clone(gltf.scene),
      group = new THREE.Group();
    group.matrixAutoUpdate = false;
    group.matrix.fromArray(roots[i]);
    group.add(model);
    scene.add(group);
    let mesh;
    model.traverse((o) => {
      if (o.isSkinnedMesh) mesh = o;
    });
    mesh.frustumCulled = false;
    // Equal conservative sorting/bounds policy; no implicit CPU skinning in either path.
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    mesh.boundingSphere = new THREE.Sphere(
      mesh.geometry.boundingSphere.center.clone(),
      Infinity,
    );
    const mixer = new THREE.AnimationMixer(model),
      actions = gltf.animations.map((c) => mixer.clipAction(c).play());
    rigs.push({ model, group, mesh, mixer, actions });
  }
} else {
  domain = await createOwnedAnimation(descriptor, {
    backend: variant.slice(6),
  });
  adapter = createOwnedRenderer(THREE, domain, {
    scene,
    geometry: converted.mesh.geometry,
    material: converted.mesh.material,
  });
}
const initMs = performance.now() - initStart;
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(640, 480);
document.body.append(renderer.domElement);
const gl = renderer.getContext(),
  debug = gl.getExtension("WEBGL_debug_renderer_info"),
  gpu = {
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
    timerQuery: !!gl.getExtension("EXT_disjoint_timer_query_webgl2"),
  };
let tick = 0,
  lastRead = null,
  readCount = 0,
  events = [];
const submit = (commands) => {
  for (let i = 0; i < commands.length; i += 256)
    domain.commands(commands.slice(i, i + 256));
};
function reset() {
  tick = 0;
  readCount = 0;
  lastRead = null;
  events = [];
  if (domain) {
    submit(
      roots.flatMap((root, rig) => [
        { type: "root", rig, value: root },
        ...descriptor.clips.map((_, clip) => ({
          type: "action",
          rig,
          clip,
          time: 0,
          weight: isStatic ? 0 : Number(clip === 1),
          paused: isStatic,
        })),
      ]),
    );
    domain.step(0);
  } else
    for (const r of rigs) {
      r.group.matrix.fromArray(roots[rigs.indexOf(r)]);
      r.group.matrixWorldNeedsUpdate = true;
      r.actions.forEach((a, clip) => {
        a.reset().play();
        a.weight = isStatic ? 0 : Number(clip === 1);
        a.paused = isStatic;
      });
      r.mixer.update(0);
    }
  updateCamera(0);
}
function updateCamera(t) {
  const angle = 0.45 + Math.sin(t / 120) * 0.22,
    d = count === 1 ? 5.4 : 17;
  camera.position.set(
    Math.sin(angle) * d,
    count === 1 ? 2.1 : 10,
    Math.cos(angle) * d,
  );
  camera.lookAt(0, count === 1 ? 0.7 : 0, 0);
}
function inputs() {
  const t = tick % 600,
    commands = [];
  let weights = [0, 1, 0];
  if (t >= 180 && t < 300) weights = [0, 1 - (t - 180) / 120, (t - 180) / 120];
  else if (t >= 300 && t < 420) weights = [0, 0, 1];
  else if (t >= 420 && t < 480) weights = [0, 0, 0];
  else if (t >= 480) weights = [1, 0, 0];
  const paused = (t >= 120 && t < 180) || (t >= 420 && t < 480);
  for (let rig = 0; rig < count; rig++) {
    const root = roots[rig].slice();
    root[12] += 0.35 * Math.sin(t / 55);
    root[14] += 0.15 * Math.cos(t / 65);
    if (domain) {
      commands.push({ type: "root", rig, value: root });
      for (let clip = 0; clip < 3; clip++) {
        commands.push(
          { type: "weight", rig, clip, value: weights[clip] },
          { type: "pause", rig, clip, value: paused },
        );
        if (t === 420 || t === 480 || t === 0)
          commands.push({ type: "seek", rig, clip, value: 0 });
      }
    } else {
      const r = rigs[rig];
      r.group.matrix.fromArray(root);
      r.group.matrixWorldNeedsUpdate = true;
      r.actions.forEach((a, clip) => {
        a.weight = weights[clip];
        a.paused = paused;
        if (t === 420 || t === 480 || t === 0) a.time = 0;
      });
    }
  }
  if (domain) submit(commands);
  updateCamera(t);
  return t;
}
function evaluate() {
  if (!isStatic) {
    if (domain) domain.step(1 / 60);
    else for (const r of rigs) r.mixer.update(1 / 60);
  }
  tick++;
}
function step() {
  if (!isStatic) inputs();
  evaluate();
}
function draw() {
  if (adapter) adapter.render(renderer, camera);
  else renderer.render(scene, camera);
}
function snapshot() {
  if (domain) return domain.snapshot();
  scene.updateMatrixWorld(true);
  const pose = [],
    world = [],
    palette = [],
    actions = [],
    root = [];
  for (const r of rigs) {
    r.mesh.skeleton.update();
    for (const b of r.mesh.skeleton.bones) {
      pose.push(
        ...b.position.toArray(),
        ...b.quaternion.toArray(),
        ...b.scale.toArray(),
      );
      world.push(...b.matrixWorld.elements);
    }
    palette.push(
      ...r.mesh.skeleton.boneMatrices.subarray(
        0,
        r.mesh.skeleton.bones.length * 16,
      ),
    );
    root.push(...r.group.matrix.elements);
    for (const a of r.actions)
      actions.push(a.time, a.weight, a.timeScale, Number(a.paused), 0);
  }
  return { pose, world, palette, actions, roots: root };
}
function read() {
  lastRead = snapshot();
  readCount++;
  return lastRead;
}
function frame() {
  step();
  if (tick % 60 === 0) read();
  draw();
}
function numeric() {
  const s = snapshot();
  return {
    ...Object.fromEntries(
      ["pose", "world", "palette", "actions", "roots"].map((k) => [
        k,
        Array.from(s[k]),
      ]),
    ),
    camera: [
      ...camera.matrixWorld.elements,
      ...camera.projectionMatrix.elements,
    ],
  };
}
function pixels() {
  const p = new Uint8Array(640 * 480 * 4);
  gl.readPixels(0, 0, 640, 480, gl.RGBA, gl.UNSIGNED_BYTE, p);
  return Array.from(p);
}
reset();
const shaderStart = performance.now();
await renderer.compileAsync(scene, camera);
draw();
const shaderMs = performance.now() - shaderStart;
window.__fox = {
  variant,
  count,
  domain,
  adapter,
  renderer,
  gpu,
  descriptor,
  reset,
  frame,
  draw,
  numeric,
  pixels,
  get tick() {
    return tick;
  },
  startup: {
    assetMs,
    conversionMs,
    initMs,
    shaderMs,
    totalMs: performance.now() - started,
  },
  poison() {
    if (!domain) throw Error("Owned only");
    const fail = () => {
      throw Error("Upstream animation/bone/palette recomputation");
    };
    THREE.AnimationMixer.prototype.update = fail;
    THREE.Bone.prototype.updateMatrixWorld = fail;
    THREE.Skeleton.prototype.update = fail;
  },
  async measure({ warmup = 600, samples = 1800, mode = "render" }) {
    const raw = [],
      invalid = [];
    let hidden = false;
    const visibility = () => {
      if (document.visibilityState !== "visible") hidden = true;
    };
    document.addEventListener("visibilitychange", visibility);
    reset();
    for (let i = 0; i < warmup; i++) {
      await new Promise(requestAnimationFrame);
      frame();
    }
    reset();
    const diagnosticsBefore = domain?.diagnostics() ?? null;
    const began = performance.now();
    try {
      for (let i = 0; i < samples; i++) {
        const raf = await new Promise(requestAnimationFrame),
          start = performance.now();
        if (mode === "render") {
          frame();
          raw.push({ start, raf, cpu: performance.now() - start });
        } else {
          if (!isStatic) inputs();
          const inputEnd = performance.now();
          evaluate();
          const evaluated = performance.now();
          if (adapter) adapter.sync();
          else {
            scene.updateMatrixWorld();
            for (const r of rigs) r.mesh.skeleton.update();
          }
          const copied = performance.now();
          read();
          const readEnd = performance.now();
          draw();
          const end = performance.now();
          raw.push({
            start,
            raf,
            cpu: end - start,
            inputCommands: inputEnd - start,
            evaluate: evaluated - inputEnd,
            copy: copied - evaluated,
            read: readEnd - copied,
            render: end - readEnd,
          });
        }
      }
    } finally {
      document.removeEventListener("visibilitychange", visibility);
    }
    if (hidden || document.visibilityState !== "visible")
      invalid.push("hidden-page");
    if (gl.isContextLost()) invalid.push("context-lost");
    return {
      raw,
      durationMs: performance.now() - began,
      invalid,
      readCount,
      diagnosticsBefore,
      gpu,
      draws: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      startup: this.startup,
      diagnostics: domain?.diagnostics() ?? null,
      adapter: adapter?.diagnostics() ?? null,
      final: numeric(),
    };
  },
};
document.querySelector("#status").textContent =
  `Fox · ${variant} · ${count} rig(s) · play/pause/weights/stop/root/camera/snapshot replay`;
if (!q.has("manual")) {
  const loop = () => {
    frame();
    requestAnimationFrame(loop);
  };
  loop();
}
