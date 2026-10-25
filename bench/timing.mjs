// Browser-safe, bounded probe; run before warmup, never inside measured frames.
export function observeClock() {
  let previous = performance.now(), min = Infinity, positive = 0;
  const iterations = 100000;
  for (let i = 0; i < iterations; i++) {
    const now = performance.now();
    if (now > previous) { min = Math.min(min, now - previous); positive++; }
    previous = now;
  }
  return {
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    minPositiveDeltaMs: Number.isFinite(min) ? min : null,
    positiveDeltas: positive, iterations,
    meaning: 'Observed minimum clock increment, not accuracy or statistical confidence',
  };
}
export function timingPolicy(mode = 'ordinary') {
  if (!['ordinary', 'isolated'].includes(mode)) throw Error('Invalid timing mode');
  return { mode, probeVersion: 1 };
}
export function validateClock(clock, policy) {
  if (clock.crossOriginIsolated !== (policy.mode === 'isolated'))
    throw Error('Requested timing isolation was not observed');
  if (!(clock.minPositiveDeltaMs > 0) || !Number.isFinite(clock.minPositiveDeltaMs))
    throw Error('No usable clock increments observed');
}
