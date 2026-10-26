import assert from 'node:assert/strict';

// Evaluated in the page only during correctness work, outside any timing/profile.
export async function captureViewerSnapshot() {
 const THREE = window.THREE, viewer = window.VIEWER.app.viewer;
 viewer.render();
 const numeric = [], objects = [], identityFailures = [];
 const numbers = values => numeric.push(...values);
 const inspect = (root, prefix) => root.traverse(object => {
  if (!(object instanceof THREE.Object3D) || !(object.position instanceof THREE.Vector3) || !(object.matrixWorld instanceof THREE.Matrix4)) identityFailures.push(prefix + ':' + object.name + ':transform');
  if (object.geometry && !(object.geometry instanceof THREE.BufferGeometry)) identityFailures.push(prefix + ':' + object.name + ':geometry');
  const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
  for (const material of materials) if (!(material instanceof THREE.Material)) identityFailures.push(prefix + ':' + object.name + ':material');
  objects.push({ scene: prefix, name: object.name, type: object.type, visible: object.visible, children: object.children.length,
   mesh: Boolean(object.isMesh), skinned: Boolean(object.isSkinnedMesh), morphs: object.morphTargetInfluences?.length ?? 0,
   geometry: object.geometry ? { attributes: Object.fromEntries(Object.entries(object.geometry.attributes).map(([name, value]) => [name, { count: value.count, itemSize: value.itemSize, normalized: value.normalized }])), indexCount: object.geometry.index?.count ?? 0 } : null,
   materials: materials.map(material => ({ type: material.type, name: material.name, transparent: material.transparent, opacity: material.opacity, side: material.side, wireframe: Boolean(material.wireframe), color: material.color?.toArray() ?? null, transmission: material.transmission ?? null, thickness: material.thickness ?? null, roughness: material.roughness ?? null, metalness: material.metalness ?? null })) });
  numbers(object.position.toArray()); numbers(object.quaternion.toArray()); numbers(object.scale.toArray()); numbers(object.matrix.elements); numbers(object.matrixWorld.elements);
  if (object.skeleton) { if (!(object.skeleton instanceof THREE.Skeleton) || !object.skeleton.bones.every(bone => bone instanceof THREE.Bone)) identityFailures.push(prefix + ':' + object.name + ':skeleton'); numbers(object.skeleton.boneMatrices); }
  if (object.morphTargetInfluences) numbers(object.morphTargetInfluences);
 });
 inspect(viewer.scene, 'main'); inspect(viewer.axesScene, 'axes');
 for (const camera of [viewer.activeCamera, viewer.defaultCamera, viewer.axesCamera]) { numbers(camera.matrixWorld.elements); numbers(camera.matrixWorldInverse.elements); numbers(camera.projectionMatrix.elements); }
 const bounds = new THREE.Box3().setFromObject(viewer.content, true);
 numbers(bounds.min.toArray()); numbers(bounds.max.toArray()); numbers(viewer.controls.target.toArray());
 if (!numeric.every(Number.isFinite)) throw Error('Viewer snapshot contains nonfinite numerical outputs');
 const renderers = {};
 for (const [name, renderer] of [['main', viewer.renderer], ['axes', viewer.axesRenderer]]) {
  if (!(renderer instanceof THREE.WebGLRenderer)) identityFailures.push(name + ':renderer');
  const gl = renderer.getContext(), canvas = renderer.domElement;
  const pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const colors = new Set(); for (let i = 0; i < pixels.length; i += 4) colors.add(pixels[i] * 16777216 + pixels[i + 1] * 65536 + pixels[i + 2] * 256 + pixels[i + 3]);
  renderers[name] = { width: canvas.width, height: canvas.height, colors: colors.size, png: canvas.toDataURL('image/png'),
   pixelSha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels)), value => value.toString(16).padStart(2, '0')).join(''),
   quality: { pixelRatio: renderer.getPixelRatio(), antialias: gl.getContextAttributes().antialias, alpha: gl.getContextAttributes().alpha,
    toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, shadowEnabled: renderer.shadowMap.enabled, shadowType: renderer.shadowMap.type },
   work: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, lines: renderer.info.render.lines, points: renderer.info.render.points }, frame: renderer.info.render.frame };
 }
 const actions = viewer.mixer ? viewer.clips.map(clip => {
  const action = viewer.mixer.existingAction(clip);
  return action ? { name: clip.name, present: true, time: action.time, weight: action.weight, effectiveWeight: action.getEffectiveWeight(), timeScale: action.timeScale, effectiveTimeScale: action.getEffectiveTimeScale(), enabled: action.enabled, paused: action.paused, running: action.isRunning(), scheduled: action.isScheduled() } : { name: clip.name, present: false };
 }) : [];
 return { numeric, objects, renderers, actions, mixerTime: viewer.mixer?.time ?? null, identityFailures, axesCameraUpIdentity: viewer.axesCamera.up === viewer.defaultCamera.up,
  controlsCameraIdentity: viewer.controls.object === viewer.defaultCamera, revision: THREE.REVISION,
  diagnostics: THREE.diagnostics?.() ?? null, clips: viewer.clips.map(clip => clip.name),
  state: { grid: viewer.state.grid, environment: viewer.state.environment, background: viewer.state.background, playbackSpeed: viewer.state.playbackSpeed },
  bootstrap: globalThis.__rthreeViewerBootstrap ? { initCalls: globalThis.__rthreeViewerBootstrap.initCalls, appStarts: globalThis.__rthreeViewerBootstrap.appStarts, phase: globalThis.__rthreeViewerBootstrap.phase, error: globalThis.__rthreeViewerBootstrap.error } : null };
}

export function compareViewerSnapshots(reference, actual, { strict = true } = {}) {
 const differences = [];
 if (reference.numeric.length !== actual.numeric.length) differences.push({ field: 'numericLength', reference: reference.numeric.length, actual: actual.numeric.length });
 let maxAbsoluteDifference = 0, numericFailures = 0;
 for (let i = 0; i < Math.min(reference.numeric.length, actual.numeric.length); i++) {
  const a = reference.numeric[i], b = actual.numeric[i], delta = Math.abs(a - b);
  if (!Number.isFinite(a) || !Number.isFinite(b) || delta > 1e-10 + 1e-12 * Math.abs(a)) numericFailures++;
  if (Number.isFinite(delta)) maxAbsoluteDifference = Math.max(maxAbsoluteDifference, delta);
 }
 if (numericFailures) differences.push({ field: 'numeric', count: numericFailures, maxAbsoluteDifference });
 for (const field of ['objects', 'clips', 'state', 'actions']) if (JSON.stringify(reference[field]) !== JSON.stringify(actual[field])) differences.push({ field });
 for (const name of ['main', 'axes']) for (const field of ['width', 'height', 'pixelSha256', 'quality', 'work']) {
  if (JSON.stringify(reference.renderers[name][field]) !== JSON.stringify(actual.renderers[name][field])) differences.push({ field: name + '.' + field });
 }
 if (strict) assert.deepEqual(differences, [], 'Viewer fixed-state equivalence failed');
 return { strict, equal: !differences.length, differences, maxAbsoluteDifference, numericValues: reference.numeric.length };
}
