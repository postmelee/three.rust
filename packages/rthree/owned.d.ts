import type * as Three from "three";
export interface OwnedTrack {
  node: number;
  property: "position" | "quaternion" | "scale";
  times: readonly number[];
  values: readonly number[];
}
export interface OwnedDescriptor {
  parents: readonly number[];
  basePose: readonly (readonly number[])[];
  inverseBind: readonly (readonly number[])[];
  roots: readonly (readonly number[])[];
  clips: readonly { duration: number; tracks: readonly OwnedTrack[] }[];
}
export type OwnedCommand =
  | {
      type: "action";
      rig: number;
      clip: number;
      time?: number;
      weight?: number;
      timeScale?: number;
      paused?: boolean;
      loop?: "repeat" | "once";
    }
  | { type: "weight" | "seek"; rig: number; clip: number; value: number }
  | { type: "pause"; rig: number; clip: number; value: boolean }
  | { type: "root"; rig: number; value: readonly number[] }
  | { type: "pose"; rig: number; node: number; value: readonly number[] }
  | { type: "reparent"; rig: number; node: number; parent: number };
export interface OwnedSnapshot {
  pose: Float64Array;
  world: Float64Array;
  roots: Float64Array;
  actions: Float64Array;
  palette: Float32Array;
}
export interface OwnedDiagnostics {
  backend: "js" | "wasm";
  nodes: number;
  rigs: number;
  clips: number;
  revision: number;
  steps: number;
  wasmCalls: number;
  wasmMemoryBytes: number;
  commandBatches: number;
  commandBytes: number;
  readBytes: number;
  paletteBytes: number;
  rootBytes: number;
}
export interface OwnedAnimation {
  commands(list: readonly OwnedCommand[]): void;
  step(dt: number): void;
  snapshot(): OwnedSnapshot;
  diagnostics(): OwnedDiagnostics;
  dispose(): void;
}
export function createOwnedAnimation(
  descriptor: OwnedDescriptor,
  options?: {
    backend?: "js" | "wasm";
    wasmBytes?: BufferSource;
    wasmURL?: string | URL;
  },
): Promise<OwnedAnimation>;
export interface OwnedRenderer {
  render(renderer: Three.WebGLRenderer, camera: Three.Camera): void;
  sync(): void;
  onBeforeRender(callback: Three.Object3D["onBeforeRender"]): void;
  diagnostics(): {
    presentationMeshes: number;
    ordinaryBones: number;
    paletteConsumes: number;
    paddedPaletteBytes: number;
    appliedRevision: number;
  };
  dispose(): void;
}
export function createOwnedRenderer(
  three: typeof Three,
  domain: OwnedAnimation,
  options: {
    scene: Three.Scene;
    geometry: Three.BufferGeometry;
    material: Three.Material;
  },
): OwnedRenderer;
