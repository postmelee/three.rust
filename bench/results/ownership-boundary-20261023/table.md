# CPU boundary diagnostic

Milliseconds per tick, derived from block averages. No rendering; no frame-tail or product claim.

| Rigs × bones | Boundary demand | JS | Wasm | Wasm run-median range |
|---|---|---:|---:|---:|
| 1 × 24 | retained | 0.0136 | 0.0105 | 0.0066–0.0133 |
| 1 × 24 | batch | 0.0187 | 0.0138 | 0.0102–0.0203 |
| 1 × 24 | fragmented | 0.0219 | 0.0137 | 0.0083–0.0180 |
| 1 × 24 | snapshot | 0.0324 | 0.0177 | 0.0141–0.0253 |
| 16 × 24 | retained | 0.1611 | 0.0763 | 0.0744–0.0883 |
| 16 × 24 | batch | 0.1745 | 0.0852 | 0.0805–0.1045 |
| 16 × 24 | fragmented | 0.1817 | 0.0959 | 0.0922–0.1411 |
| 16 × 24 | snapshot | 0.2406 | 0.1802 | 0.1447–0.3756 |
| 64 × 24 | retained | 0.6168 | 0.3036 | 0.2936–0.3291 |
| 64 × 24 | batch | 0.6438 | 0.3227 | 0.3131–0.4911 |
| 64 × 24 | fragmented | 0.6982 | 0.3685 | 0.3586–0.3914 |
| 64 × 24 | snapshot | 0.8956 | 0.5648 | 0.5273–0.5819 |
| 64 × 96 | retained | 2.4809 | 1.2341 | 1.2000–1.3095 |
| 64 × 96 | batch | 2.4937 | 1.2966 | 1.2367–1.4823 |
| 64 × 96 | fragmented | 2.5616 | 1.3391 | 1.2941–1.3806 |
| 64 × 96 | snapshot | 3.4694 | 2.2027 | 2.0867–2.4098 |
