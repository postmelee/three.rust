# Fixed upstream examples

Sources: mrdoob/three.js **9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8**,
annotated tag r186 (tag object 48dd7be…). npm three@0.186.1 points to the
same commit. Exact SHA-256 and npm integrity are in provenance.json.
Original HTML/CSS in original/ is byte-for-byte upstream. MIT notice is
in ../vendor/three-examples/LICENSE. Shader retains Monjori/Mic attribution.
Soldier.glb is downloaded, hash checked, and excluded from git/package;
its asset rights are not relicensed as project MIT. Use the upstream example
asset for local reproduction; verify its separate redistribution rights before
redistributing it. No giraffe assets are used.

`node scripts/fixtures.mjs` makes the reviewable generated/ copies. Common
changes: local import resolution, seed 42 LCG, explicit frame scheduling,
fixed 1/60 animation delta, shader simulation time, exposed harness, fixed
640×360 DPR 1 in automated tests. GUI, materials, shadows and shaders remain.
These are deterministic replays, not unmodified original runtime timing.

- cubes: upstream webgl_interactive_cubes, original 2,000 meshes, rotating
  camera and center-pointer raycast. Primary normal-size performance fixture.
- skinning: upstream webgl_animation_skinning_blending, original one Soldier,
  walk state, ground/shadow/SunLight. No skinning clones added.
- shader: original Monjori full-screen fragment shader, GPU-oriented control;
  GPU dominance on actual hardware is **not established** by cloud timing.
- small: explicit 8-cube, camera-static variant; not an upstream example result.
- hierarchy: explicit 10,000-cube / 1,000 animated-group variant. Original
  nonrecursive raycast now sees groups and yields no mesh hits, making this a
  transform/render scalability experiment, **not an equivalent raycast load**.
  Preserve that distinction when interpreting measurements.

webgl_instancing_performance is source-reviewed only: its default is 1,000
instances with camera motion, not 1,000 independently animated Object3Ds.
It is not the transform baseline and was not executed in this experiment.

## Pipeline preparation fixture

`pipeline/` is a new synthetic articulated-cylinder workload using pinned Three.js
animation/skinning APIs. It is not an adaptation claimed as the original Soldier
example, uses no external asset, and is MIT project code. See
[the preparation protocol](../docs/PIPELINE_PREPARATION.md) for stage timing,
source hashes, ownership constraints and scope. The original examples above remain
unchanged.
