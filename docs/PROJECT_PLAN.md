# three.rust 프로젝트 계획

작성: 2026-10-22, Asia/Seoul. 아래 일정은 1인 집중 개발을 가정한 작업일 추정이며, 완료 약속이 아니다. 모든 성능 수치는 목표 또는 설명용 가정이다. 이번 조사에서는 소스를 읽었으며 브라우저 프로파일링·후보 엔진 빌드·벤치마크를 실행하지 않았다.

## 0. 실행 우선순위 — 2026-10-22 사용자 확정

개발 실행은 Codex Cloud에서 진행한다. 첫 성능 대상은 **데스크톱 브라우저의 공개 Three.js 예제**이며, 기린 사이트는 후속 실사용 fixture다. 목표는 이전 대화에서 정한 **지속적인 장면 상태와 계산을 Rust/Wasm 코어가 소유하는 구조**다. 공개 JS API 전체를 Rust 객체로 바꿀 필요는 없다.

M0에서 CPU transform/계층 장면, animation/skinning 장면, GPU 중심 대조 장면을 실제 측정하고 첫 포팅 영역을 선정한다. 유리한 결과만 남기지 않으며 작은 장면·정적 장면·동기화가 잦은 장면도 포함한다. 공식 예제를 옮기거나 수정했다면 원본 버전과 차이를 기록한다. 합성 microbenchmark만으로 M0를 완료하지 않는다.

M1과 M2를 이번 구현 범위로 연속 진행한다. M2는 선택한 영역에 지속 Rust 상태를 도입하고, 기존 JS API 경로에서 실행되는 최소 통합을 포함한다. standalone 수학 커널만으로 완료하지 않는다. 전체 코어 확대는 M3다.

클라우드의 소프트웨어 GPU/공유 CPU 결과와 실제 데스크톱 GPU 결과는 구분한다. 클라우드에서 측정한 WASM/CPU 결과는 공개하되 실제 데스크톱 GPU/FPS 개선을 주장하지 않는다. GPU 부재를 숨기지 않고 재현용 브라우저 harness를 제공한다.

이 절은 아래 최초 기린 중심 계획과 충돌하는 경우 우선한다. 구체 실행 계약과 초기 설정은 [CLOUD_SETUP.md](CLOUD_SETUP.md)를 따른다.

## 1. 제품 목표와 첫 성공 기준

**기존 Three.js 사용자가 익숙한 API를 유지하면서 실제 웹 프로젝트의 CPU 처리 시간을 줄인다.**

장기 방향은 장면의 지속 상태, 애니메이션, 변환 계층, 본 행렬, 가시성 판정, 렌더 목록을 Rust에서 일관되게 처리하는 것이다. 첫 버전은 이 전체를 기다리지 않고 측정 가능한 수직 단면부터 구현한다.

첫 공개 결과에는 다음이 있어야 한다.

1. 고정된 원본과 three.rust를 선택할 수 있는 동일 앱의 A/B 실행 경로.
2. 공개 Three.js 예제의 정상 크기 장면과 CPU/GPU 대조 장면에 대한 동작·화면 비교.
3. 애플리케이션 전체 CPU 작업 시간, 프레임 간격, GPU 시간(지원 시), 초기 로딩, 메모리의 원시 결과.
4. 무엇이 Rust 가속이고 무엇이 기존 JS 실행인지 나타내는 목록.
5. 개선이 없거나 느려지는 경우까지 포함한 결과와 재현 명령.

**첫 성능 가설:** 실제 앱에서 애니메이션·변환·본 행렬 계산이 충분한 CPU 비중을 차지한다면, 지속적인 Rust 상태와 배치 계산으로 전체 프레임 CPU 비용을 낮출 수 있다. 이 가설은 아직 검증되지 않았다.

## 2. 대상 프로젝트에서 확인한 사실

소스 조사 기준: [livinglikeagiraffe.github.io, 4076ee1](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/tree/4076ee1ed787f13820ff6987a399f25845f6ae77). 실행 중인 공개 사이트가 이 커밋과 정확히 같은지는 별도 확인이 필요하다. 아래는 주요 파일 조사 결과이며 전체 API 감사는 M0에서 완료한다.

| 확인한 사항 | 설계·측정에 주는 의미 |
|---|---|
| package-lock의 Three.js는 0.186.1 | 최초 호환 기준을 정확히 이 버전으로 고정한다. 최신 버전 추종은 후속 과제다. |
| WebGLRenderer, OrthographicCamera, MeshStandardMaterial, 그림자, ACES 톤매핑 사용 | WebGL 경로를 유지하면 재질과 화질 비교의 변수를 줄일 수 있다. |
| 플레이어와 두 동료의 애니메이션, 가중치·재생 속도 변경 | AnimationMixer의 transform 트랙, 블렌딩, 본 행렬이 첫 조사 후보다. |
| facePose가 updateMatrixWorld(true)와 getWorldPosition을 호출 | render() 직전에만 동기화하면 늦다. 명시적 갱신과 읽기 경계를 보존해야 한다. |
| 모바일에서 30fps 제한, DPR·그림자 품질 축소, 나무 생략 | 30fps에서 30fps가 나와도 CPU 절감은 가능하다. 데스크톱·모바일을 서로 같은 작업량으로 취급하지 않는다. |
| 정적 메시 병합이 이미 존재 | 미최적화 앱을 가정하면 안 된다. 현재 최적화를 기준선에 유지한다. |
| 글 읽기 화면에서는 변경 없을 때 렌더링 생략 | 읽기 모드를 프레임 성능 표본에 섞지 않는다. 유휴 시 작업량은 별도 검증한다. |
| encounter.js가 Math.random()으로 동료 위치를 결정 | 재현용 seed/입력 기록이 필요하다. nature.js의 난수는 이미 seed가 있다. |
| bare import와 node_modules 파일 직접 import 혼용 | import map만 바꿔도 모든 코드가 교체되는 구조가 아니다. 경로 정리가 먼저 필요하다. |
| build.mjs가 상대 JS 의존성을 추적하고 vendor/three로 복사 | Wasm과 새 패키지의 배포 경로를 명시적으로 추가해야 한다. |

근거: [lockfile](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/package-lock.json), [main.js](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/main.js), [giraffe.js](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/giraffe.js), [companion.js](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/companion.js), [encounter.js](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/encounter.js), [static-meshes.js](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/static-meshes.js), [build.mjs](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/scripts/build.mjs).

GPU 부하와 애니메이션 CPU 계산 중 무엇이 지배적인지는 소스만으로 판단할 수 없다.

## 3. 초기 아키텍처

초기 선택은 **Three.js 0.186.1을 기반으로 한 제한적 포크 + Rust/Wasm 코어**다. 공개 객체·로더·재질·셰이더와 WebGL 제출 경로를 최대한 보존한다. 기존 패키지를 전역 monkey-patch하는 방식보다 변경 지점·버전·테스트를 명시적으로 관리하기 쉽다.

| 계층 | 초기 책임 | 후속 방향 |
|---|---|---|
| JS 공개 API | 기존 객체 identity, 속성, 이벤트, 메서드, 작은 수학 연산 | 변경 수집과 동기적 읽기 경계 유지 |
| 내부 브리지 | 핸들 등록, 변경 배치, 결과 반영, 수명 관리 | 중복 복사·할당 최소화 |
| Rust/Wasm | 프로파일로 선택한 대량 CPU 계산 | 애니메이션 → 변환 계층 → 본 행렬 → culling/정렬로 확대 |
| 기존 WebGL 렌더러 | 재질, 셰이더, 텍스처, 그림자, GPU 명령 | 측정이 정당화하면 CPU 준비 경계를 추가 교체 |

초기 계산 경로는 `기존 API 변경 → 필요한 시점에 일괄 동기화 → Rust 계산 → 기존 렌더러가 소비할 결과 반영`이다. 앱에서 관찰 가능한 각 시점의 값과 콜백 순서는 유지한다.

### 단계별 상태 소유권

- **M2:** 선정 영역의 지속적인 계산 상태를 Rust가 소유하고 JS 공개 객체와 동기화한다. 복사·읽기 경계 비용을 포함해 첫 이득 또는 퇴행을 측정한다. 전체 장면 엔진 포팅 완료라고 표현하지 않는다.
- **M3:** 선택한 transform/skeleton 영역의 계산 상태를 Rust가 소유한다. JS 객체는 호환 상태를 제공하며, 쓰기는 변경 배치로 전달하고 읽기·이벤트 시 필요한 결과를 반영한다. JS와 Rust가 각각 애니메이션과 행렬을 다시 계산하지 않도록 한다.
- **후속:** render list와 shadow pass까지 가져올 때에만 추가 순회 제거를 주장한다. 초기 JS 순회와 결과 복사는 존재하며 성능표에 포함한다.

Three.js에는 교체 가능한 단일 Engine 인터페이스가 없다. [WebGLRenderer](https://github.com/mrdoob/three.js/blob/r186/src/renderers/WebGLRenderer.js)는 장면 행렬 갱신 후 자체 projectObject·정렬·그림자 경로를 수행한다. [WebGLObjects](https://github.com/mrdoob/three.js/blob/r186/src/renderers/webgl/WebGLObjects.js)는 스킨 메시의 skeleton.update()도 호출한다. 외부에서 Rust 계산을 추가한 뒤 원본 render()만 호출하면 중복 계산이 생길 수 있다.

따라서 교체한 영역에는 프레임/상태 generation과 유효성 검사를 두고, 실제 원본 갱신을 우회하는 내부 통합이 필요하다. 전역적으로 matrixAutoUpdate를 끄는 것으로 해결하지 않는다. 명시적 force 갱신, 카메라, 그림자, 콜백과 다중 render 호출을 함께 검증한다.

### 첫 범위에서 미룰 것

자체 WebGPU 렌더러, wgpu 도입, TSL 포팅, 네이티브 창, WebXR, 멀티스레드/SharedArrayBuffer, 전체 수학 API의 Wasm 래핑은 첫 성능 검증 범위에서 미룬다. SIMD는 scalar 기준과 정확성이 확보된 다음 독립 실험으로 추가한다. 작고 빈번한 Vector3 호출을 일대일로 Wasm에 넘기는 것을 기본 전략으로 삼지 않는다.

## 4. 선행 구현 평가: 최대 반나절

이전 대화의 조사 결과를 참고하되, README의 수치나 drop-in 표현을 검증된 사실로 승계하지 않는다. 이번에 읽은 문서에서도 초기화·렌더러 변경 조건이 드러난다.

| 후보 | 이번에 확인한 방향 | M0에서 판단할 항목 |
|---|---|---|
| [WAMR3D](https://github.com/aymen94/wamr3d) | Rust 장면 코어, JS 객체 API, 자체 렌더러. 사용 예제에 init과 WebGPURenderer 초기화가 있다. | 데이터 구조·브리지 재사용, WebGL 실제 경로, 기린 기능 목록 충족 여부 |
| [eugenehp/threers](https://github.com/eugenehp/threers) | JS shim과 Rust 렌더러. 브라우저 예제는 initThreers와 비동기 renderer.create를 사용한다. | 현재 API 차이, 중복 갱신, 목표 앱의 재질·스키닝 일치 |
| [oneilltomhq/three-rs](https://github.com/oneilltomhq/three-rs) | 코어·WebGPU·노드 포팅, 원본 예제와 이미지 비교를 강조한다. | 수학·애니메이션·검증 도구의 선택적 재사용 |

세 후보 모두 소스·라이선스·선정 커밋을 확인하고, 가장 유망한 한 후보만 작은 장면으로 빌드한다. 기존 구현이 목표 API·WebGL 화면·빌드 재현성을 빠르게 충족하면 ADR로 기반 변경을 결정할 수 있다. 빌드가 오래 걸리거나 주요 격차가 크면 기본 포크 전략으로 진행한다. 후보 평가 때문에 기준선 측정과 첫 커널 구현을 지연시키지 않는다. 이 문서에서는 세 후보의 성능이나 완전 호환성을 보증하지 않는다.

## 5. 핵심 마일스톤

| 마일스톤 | 누적 작업일 목표 | 산출물 | 완료 조건 |
|---|---:|---|---|
| M0 — 실제 앱 기준선 | 1일 | 고정 소스·에셋 manifest, API 목록, 공개 예제 replay, CPU 프로파일, 후보 ADR | 정상 크기 장면의 병목·화면·품질 조건이 기록되고 A/A 반복 측정 오차를 안다. 포팅할 첫 작업을 선택한다. |
| M1 — import 호환 경로 | 2일 | 로컬 rthree 패키지, 동일 JS 코어 경로, addon 경로, Wasm 초기화 smoke, A/B 토글 | 선정한 공개 예제와 대조 장면이 같은 화면·행동으로 실행된다. 원본 three 객체 혼입이 없다. 이 단계는 가속 미구현으로 표시한다. |
| M2 — 첫 Rust 계산과 측정 | 3–5일 | 선택 커널, 브리지, 수치 oracle, 브라우저 결과 JSON | 실제 앱에서 Rust 경로가 실행되고, 복사·동기화 포함 전체 CPU 결과를 공개한다. 개선/동률/퇴행 중 어느 결과든 기록한다. |
| M3 — 연결된 CPU 코어 | 6–10일 | 가속 영역의 지속 상태, 애니메이션·변환·본 행렬 중 병목 경로 연결, 호환 회귀 테스트 | normal workload에서 중복 계산을 제거하고, 즉시 읽기·이벤트·그림자·clone이 통과한다. 추가 포팅은 M2의 개선 근거가 있을 때 진행한다. |
| M4 — 공개 alpha | 11–15일 | 소스, 설치 가능한 alpha, A/B 데모, 호환표, 원시 측정값, CI·기여 안내 | 별도 환경에서 재현하고 데스크톱 Chromium 및 실제 모바일 브라우저에서 smoke를 완료한다. 지원 기기·제약·느린 사례를 공개한다. |

**첫 비교 수치는 3–5작업일, 제한된 공개 alpha는 약 2–3주를 목표로 한다.** 전체 Three.js 호환 기간을 이 일정으로 약속하지 않는다. 첫 커널의 선택과 호환 비용에 따라 M3/M4를 재산정한다.

### 계속 투자할 판단 기준

M0에서 후보 계산이 전체 프레임 CPU의 일부에 불과하면 예상 상한을 먼저 계산한다. CPU 시간의 20%를 차지하는 부분을 2배 빠르게 해도 전체 CPU 시간은 10%만 줄어든다. 일반식은 `새 CPU 비율 = (1 - p) + p / s`이며 브리지의 추가 비용이 더해진다. 이 식을 GPU와 겹쳐 실행되는 실제 프레임 시간에 그대로 적용하지 않는다.

M2의 제안 기준은 사전 선정된 공개 예제의 정상 크기 장면에서 지정된 CPU p50 또는 p95를 **20% 이상 줄이는 것**이다. 이는 목표이지 보장 수치가 아니다. 프레임 간격 p95가 5% 넘게 악화되지 않고, 화면·동작이 같아야 한다. A/A의 잡음이 이 차이와 비슷하면 판단을 보류하고 측정 조건을 개선한다. 로딩·메모리 허용 증가는 M0에서 절대값 기준으로 정하고, 임계값을 결과를 본 뒤 유리하게 바꾸지 않는다.

- 실제 앱의 개선과 정확성이 확인되면 인접한 CPU 경로로 확대한다.
- 커널만 빨라지고 전체 앱은 느리면 브리지·중복 계산을 한 차례 개선한 뒤 재측정한다.
- 실사용 앱이 GPU 병목이면 해당 앱에서 FPS 개선이 없음을 기록한다. 다른 CPU 중심 실제 예제를 추가할 수 있지만 기린 결과도 그대로 공개한다.
- 많은 복제 객체에서만 개선되면 확장성 결과로 발표한다. 원래 사이트의 속도 개선으로 표현하지 않는다.
- 의미 있는 실사용 이득이 없으면 코어 확대를 중단하고 결과·호환 기반을 연구 alpha로 공개하거나 특정 연산 라이브러리로 범위를 줄인다.

## 6. 첫 구현 이슈 목록

| 순서 | 이슈 | 완료 증거 |
|---|---|---|
| 1 | 대상 커밋·three 0.186.1·에셋 버전 고정 | manifest와 깨끗한 설치 재현 |
| 2 | 공개 예제의 import 경로와 엔진 선택 통일 | 같은 앱 소스로 original/rthree 두 빌드 |
| 3 | seed·입력 replay·품질·렌더링 정지 구간 분리 | A/A 결과와 같은 pose의 스크린샷 |
| 4 | 프레임 CPU와 세부 구간 측정 | animation/transform/skeleton/submit/동기화 구간 표 |
| 5 | 가속 후보와 재사용 기반 ADR | 소요·성능 상한·호환 비용을 설명한 결정문 |
| 6 | rthree ESM 초기화와 단일 객체 그래프 | root/addons/loader/clone의 identity 테스트 |
| 7 | 첫 Rust 커널과 JS oracle | 동일 입력 수치 비교, release Wasm, 명시적 실행 증거 |
| 8 | 실제 앱 비교와 병목 재측정 | 원시 표본·스크린샷·요약 보고서 |

예정 디렉터리는 `crates/scene-core`, `crates/wasm-bridge`, `packages/rthree`, `fixtures/giraffe`, `fixtures/three-examples`, `bench`, `docs`로 둔다. 현재 생성된 것은 기획 문서뿐이다.

## 7. 공개 프로젝트 운영

신규 코드의 라이선스는 MIT를 우선 제안한다. 실제 LICENSE는 권리자와 재사용 범위를 확정하여 작성하고, Three.js 및 재사용 프로젝트의 copyright·license를 보존한다. 원본 버전, 가져온 파일, 패치 목록, 지원 API, 미지원 사항을 별도 관리한다.

이 앱의 [ASSETS.md](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io/blob/4076ee1ed787f13820ff6987a399f25845f6ae77/ASSETS.md)는 일부 프로젝트 사진이 CC0가 아니고 주 기린 에셋의 CC BY 정확한 버전이 미기재라고 명시한다. 기존 사이트의 사용 허가를 엔진 저장소의 재배포 허가로 간주하지 않는다. 재현 harness와 엔진 코드는 공개하고, 에셋은 확인된 재배포 조건·출처 manifest 또는 사용자가 제공하는 로컬 경로로 연결한다.

CI는 Rust 수치 테스트, JS API 호환 테스트, 브라우저 기능·이미지 비교, Wasm 패키지 배포 smoke를 담당한다. 공유 CI 장비의 FPS를 릴리스 성능 판정 기준으로 삼지 않는다. 고정 장비의 정기 성능 결과와 raw JSON을 함께 보관한다.

alpha 전에 npm 이름 점유·유사 프로젝트 혼동을 확인한다. `rthree`가 불가능하면 scoped package를 사용하며 공개 API 설계는 동일하게 유지한다. 버전 지원은 `three.rust 버전 → 기준 Three.js 버전 → 검증한 addon/앱`의 표로 관리한다.
