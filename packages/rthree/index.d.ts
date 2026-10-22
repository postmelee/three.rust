// Declarations from @types/three 0.186.0; runtime baseline three 0.186.1.
export * from 'three';
import type { Object3D } from 'three';
export function init(options?: {wasmBytes?: BufferSource; wasmURL?: string | URL}): Promise<void>;
export function release(root: Object3D): void;
export function diagnostics(): {backend:string;wasmActive:boolean;wasmCalls:number;wasmNodes:number;batches:number;nodes:number;uploadedBytes:number;materializedBytes:number;arenas:number;wasmMemoryBytes:number;syncMs:number;kernelMs:number;readMs:number};
export function configureDiagnostics(options?: {timings?:boolean}):void;
export function resetDiagnostics():void;
