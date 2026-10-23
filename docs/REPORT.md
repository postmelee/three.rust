# M0–M2 실험 보고서

2026-10-22. **Rust 포팅과 실제 렌더 경로 통합은 구현했지만, 이 환경에서
일반적인 제품 성능 개선을 입증하지 못했다.** 결과가 불리해도 모든 장면과
반복을 보존했다. 실험 범위는 Object3D 변환 서브트리이며 전체 Three.js
Rust 포팅/호환 또는 실제 데스크톱 GPU FPS 개선을 주장하지 않는다.

## 시작점과 실험 결정

기존 작업 디렉터리를 보존하고 bootstrap 98f59c5에서 독립 checkout과
codex/independent-m0-m2 브랜치를 생성했다. 이전 구현/ADR/측정은 사용하지
않았다. M0 commit c458d73에서 공개 소스·새 프로파일·기각 대안을 기록한
ADR을 먼저 커밋했고, 그 뒤 M1/M2를 구현했다.

npm three@0.186.1과 annotated r186 태그는 실제 커밋 9b4a2ac…로 일치한다.
원본 예제, SHA-256, 변경점, 라이선스는 fixtures/에 기록했다. 원본 크기
interactive cubes를 주 장면으로 사전 선정했고, 한 Soldier와 Monjori shader,
8개 정적 큐브와 10,000개/1,000그룹 계층 변형을 유지했다. 확대 변형은 원본
예제 결과가 아니며 비재귀 raycast가 그룹을 보도록 바뀌어 picking 부하도
원본과 다르다. A/B/C/D 간에는 동일한 변형을 사용한다.

M0 원본 큐브에서 변환 갱신 평균은 약 0.187ms, 전체 약 2.913ms였다.
따라서 해당 계산을 완전히 없애도 약 6.4%의 이론적 CPU 상한이며, 브리지
비용까지 고려하면 최초 계획의 20% 개선 목표는 이미 가능성이 낮았다.
스키닝/애니메이션의 작은 비용, raycast의 특수성, renderer 교체의 혼입
문제를 비교하여 변환 계층을 제한된 소유권 실험으로 선택했다.

## 본 측정

측정 구현 커밋: 9c12cba5d884d605debaba97002252b66f274f5f. 실제 JS/Wasm/lockfile 해시는 manifest에 있다.
7회 × 5장면 × 4엔진 = 140개 실행,
실행마다 60프레임 워밍업 + 180표본, 총 25,200표본.
엔진 시작 순서를 회전시키고 한 페이지씩 새로 실행했다. 같은 640×360, DPR 1,
seed 42, simulation tick 범위를 사용했다. 본 측정에는 이미지 캡처, V8
샘플링, GPU query, 브리지 단계 타이머를 넣지 않았다.

아래 CPU 단위는 ms이며 각 반복의 p50을 구한 뒤 그 중앙값을 표시한다.
변화율은 같은 반복 번호의 C/A를 먼저 계산한 값으로, 표의 중앙값끼리
나눈 값과 다를 수 있다. 양수는 **느려짐**이다. 7개 실행 단위 bootstrap은
탐색용 불확실성 표시이며 프레임 25,200개를 독립 표본으로 취급하지 않았다.

| 장면 | A 원본 p50 | B JS p50 | C Wasm p50 | D 배치 JS p50 | C/A paired 변화 (95% bootstrap) |
|---|---:|---:|---:|---:|---|
| 원본 크기 큐브 | 2.20 | 1.80 | 2.30 | 3.70 | 16.67% [-3.57, 35.29] |
| 원본 크기 Soldier | 0.70 | 0.70 | 0.70 | 0.70 | 0.00% [-14.29, 12.50] |
| 셰이더 대조군 | 0.10 | 0.10 | 0.10 | 0.10 | 0.00% [0.00, 0.00] |
| 작은 정적 변형 | 0.30 | 0.30 | 0.30 | 0.30 | 0.00% [0.00, 0.00] |
| 확대 계층 변형 | 16.50 | 16.60 | 20.80 | 19.90 | 25.73% [20.89, 34.13] |


전체 p50/p95/p99와 프레임 간격 p95는
[상세 표](../bench/results/m2-full/table.md), 반복별 통계와 paired 분포는
[analysis.json](../bench/results/m2-full/analysis.json), 원시 프레임은
[결과 디렉터리](../bench/results/m2-full/)에 있다. 느린 표본을 삭제하지 않았다.
A/B/C/D의 마지막 프레임 draw calls·triangles·program 수가 일치하는지도 확인했다.

D는 C와 동일한 스캔/버퍼/결과 반영 경로에서 수학만 JS로 수행한다.
C가 D보다 빠르더라도 이는 이 특정 배치 구현의 언어 효과이며 A 대비
제품 개선을 뜻하지 않는다. D를 최적의 JS 알고리즘이라고 주장하지 않는다.
B/A 차이에는 번들 구성, 훅 분기, JIT와 클라우드 잡음이 함께 들어 있다.
작은 장면의 0.1ms 부근 값과 비율은 타이머 해상도의 영향을 크게 받는다.

## 구현과 정확성

Rust가 f64 pose/parent/local/world/flag arena를 지속 보관하며, 배치 호출이
로컬 행렬과 부모-자식 world 행렬을 계산한다. Rust에서 JS Three를 호출하지
않는다. JS 공개 객체/배열은 그대로이고, 직접 변경을 스캔한 뒤 결과를
동일 배열에 쓴다. 이 비용과 메모리/할당 비용은 전체 CPU 측정에 포함된다.
카메라·SkinnedMesh·사용자 override는 원래 dispatch를 유지하며, 지원되는
하위 트리만 배치 처리한다. updateWorldMatrix와 동기 읽기 API, AnimationMixer,
본 팔레트, WebGL renderer/재질/셰이더는 기존 JS/GPU에 남아 있다.

- Rust native 5개 테스트, upstream 차등 9개 테스트 통과. 테스트 표본의
  최대 행렬 절대 오차 0. f64이고 f32/SIMD 근사 모드가 아니다.
- 직접 TRS/행렬 변경, pivot, 음수/비균일 scale, manual/world-auto/force,
  reparent/attach/remove, stale 및 동기 읽기, clone, 사용자 override,
  애니메이션 loop/finished 시점과 본 팔레트, arena growth/release 검증.
- JS compose/multiply를 호출하면 예외가 나도록 한 테스트에서 지원 경로가
  통과하고 Rust 내부 실행 카운터가 증가하여 실제 계산 대체를 확인했다.
- 5장면의 고정 12 tick A/A 및 A/B/C/D 캡처는 전 픽셀 일치. 별도 렌더
  콜백/다중 render 테스트도 통과했다. 캡처·차이 PNG와 수치 결과는
  [correctness](../bench/results/correctness/results.json)에 있다.
- 로컬 tarball을 /tmp 독립 소비자에 설치해 ESM, 초기화 실패/재시도,
  root/addon identity, runtime three 의존성 부재, NodeNext 타입, esbuild
  단일 코어 해석을 검증했다. npm 배포는 하지 않았다.
- [clean-checkout CI](https://github.com/postmelee/three.rust/actions/runs/39760603177)
  통과. 최초 Ubuntu 26.04/Playwright 설치 실패는 보존하고, Ubuntu 24.04로
  고정해 해결했다. 검증 범위는 [CI evidence](../bench/results/validation/ci.json).

정확성 결과는 해당 fixture/테스트 범위의 증거이며, 전체 upstream suite나
모든 addon의 호환 증명이 아니다. 수치 허용오차와 IEEE signed zero/NaN
등의 제한은 [호환성 문서](COMPATIBILITY.md)에 명시했다.

## 환경과 해석 한계

Intel Xeon Platinum 8573C 가상 머신, 보이는 vCPU 5개/CPU quota 4개 상당,
16GiB limit, Chromium 154.0.8037.57. 노출된 DRM/NVIDIA GPU 장치가 없고
실측 renderer는 ANGLE Vulkan SwiftShader Device (Subzero)다.
소프트웨어 렌더링은 같은 공유 CPU를 사용하므로 실제 GPU 결과가 아니다.

CPU 수치는 앱 update부터 renderer 반환까지 main-thread wall 시간이다.
GPU 완료 시간이나 OS on-CPU 사이클이 아니며 preemption/backpressure도
포함될 수 있다. rAF/주사율 때문에 CPU와 프레임 간격은 일대일 대응하지
않는다. 모바일 30fps를 일반 상한으로 가정하거나 FPS·전력 개선으로
환산하지 않았다.

본 측정은 고정 프레임 클라우드 프로토콜이다. 최초 제안의 foreground 실제
하드웨어 10초/30초 프로토콜, Safari/Firefox/모바일, 완전 cold-cache startup,
장기 GC/메모리/발열·전력, WebXR/context loss와 모든 addon은 미검증이다.
현재 heap/linear-memory/startup 값은 제한된 관측치이며 총 메모리나 사용자
최초 표시 시간을 뜻하지 않는다. 별도 단계/GPU/초기화 진단은 제품 표와
분리하여 보존한다.

## 재현과 다음 판단

[clean install 및 하드웨어 명령](CLOUD_SETUP.md)을 따른다.
```sh
npm ci
npm run fixtures
npm run build
npm test
npm run test:browser
npm run test:package
npm run bench:full
node bench/summarize.mjs bench/results/m2-full
node bench/analyze.mjs bench/results/m2-full
```

현재 결과로는 범용 import 교체를 성능 최적화로 권하지 않는다. 다음 실험은
더 많은 API를 서둘러 포팅하기보다 공개 객체 스캔/결과 반영을 줄일 수 있는
변경 추적과 더 넓은 Rust 소유 경계를 검토해야 한다. 별도 opt-in 배치 API를
쓴다면 import 호환 경로의 결과와 분리해야 한다. 실제 GPU가 있는 데스크톱
장비에서 같은 전체 경로를 재현하기 전에는 제품/FPS 우위를 주장하지 않는다.

## 별도 비용·GPU·초기화 진단

본 표본과 별도로 각 조합 1회, 30프레임 워밍업 + 60표본으로 단계 타이머와
GPU query를 켰다. 아래 수치는 성공한 배치들의 프레임당 평균이며,
변경 스캔/arena 동기화, 커널 호출, JS 배열 반영을 구분한다. 타이머 자체 비용과
소프트웨어 GPU query가 추가된 진단이므로 본 측정 표와 직접 차감하지 않는다.

| 장면 (C) | 스캔·동기화 ms | Rust 호출 ms | 배열 반영 ms | 검사 KiB/frame | 변경 저장 KiB/frame | 반영 KiB/frame |
|---|---:|---:|---:|---:|---:|---:|
| cubes | 0.458 | 0.178 | 0.154 | 766.4 | 0.0 | 500.5 |
| skinning | 0.047 | 0.005 | 0.005 | 26.0 | 4.1 | 17.0 |
| shader | 0.029 | 0.003 | 0.008 | 0.8 | 0.0 | 0.5 |
| small | 0.014 | 0.003 | 0.000 | 3.8 | 0.0 | 2.5 |
| hierarchy | 3.566 | 1.154 | 1.192 | 4211.7 | 15.6 | 2750.5 |

변경 저장량이 작아도 공개 JS 상태를 검사하고 행렬 배열을 반영하는 비용은
남는다. JS fallback/renderer/app 비용은 이 세 열 밖에 있지만 전체 프레임에는
포함된다. D의 동일 경로 단계 값도 원시 JSON에 보존했다.

GPU query는 EXT_disjoint_timer_query_webgl2로 비동기 조회하며
미완료/disjoint는 값으로 채우지 않았다. 이 값은 SwiftShader의 GL query 범위
경과 시간이며 실제 GPU 셰이더 시간이나 FPS 개선이 아니다. 유효 표본 수와
p50/p95는 [진단 summary](../bench/results/m2-diagnostic/summary.json)에 있다.

초기화는 큐브 장면을 엔진별 5개 새 browser context에서 측정했다.
프로세스 캐시는 공유되므로 cold-start 실험이 아니다. ready는 harness 준비,
first return은 첫 render 반환 시점이며 compositor 최초 표시 시점이 아니다.

| 엔진 | ready p50 ms | first render 반환 p50 ms | Wasm fetch p50 ms | compile/instantiate p50 ms |
|---|---:|---:|---:|---:|
| original | 306.90 | 394.80 | N/A | N/A |
| js | 307.80 | 403.00 | N/A | N/A |
| wasm | 280.30 | 381.60 | 9.20 | 1.20 |
| packed-js | 304.90 | 430.90 | N/A | N/A |

[초기화 원시 결과](../bench/results/startup/runs.json)와
[강제 renderer 플래그 없는 GPU probe](../bench/results/m0/unforced-gpu-probe.json)도
보존했다. 기본 probe도 SwiftShader를 반환해 노출된 하드웨어 GPU가 없음을
추가 확인했다. 물리 호스트 자체에 GPU가 없다는 의미는 아니다.

최종 패키지 재빌드 후에도 본 측정의 core.js, Wasm, runtime/packed bridge,
브라우저 harness와 lockfile 해시가 모두 일치함을
[runtime-artifact-match.json](../bench/results/validation/runtime-artifact-match.json)으로
확인했다. 이후 변경은 문서, 라이선스 포장, 하드웨어 viewport 옵션과 테스트
출력 경로이며 측정한 엔진 코드는 바뀌지 않았다. 라이브 데모의 A→C 전환,
Wasm 실행 및 Pause 동작도 [별도 검증](../bench/results/validation/demo.json)을 통과했다.
