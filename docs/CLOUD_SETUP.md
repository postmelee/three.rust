# Codex Cloud 초기 설정과 실행 계약

저장소: https://github.com/postmelee/three.rust

## 실행 환경

Codex Cloud에서 이 저장소를 연결한 전용 환경을 만든다. Linux의 Node.js/npm, Rust/rustup/Cargo, Chromium을 사용할 수 있어야 한다. setup 단계에서 의존성과 wasm32-unknown-unknown target, 고정된 browser automation 패키지 및 Chromium을 준비한다. 개발 에이전트가 컴파일·테스트할 때 네트워크가 끊겨도 동작하도록 의존성을 미리 받는다.

초기 setup 명령은 `bash scripts/cloud-setup.sh`다. 아직 package.json/Cargo.toml이 없다면 도구만 확인한다. M1에서 manifest/lockfile을 추가하면서 이 스크립트를 실제 clean build로 검증하고 필요한 설치를 고정한다. setup에 비밀키를 넣지 않는다.

필요한 외부 출처는 GitHub/공식 Three.js 코드, npm registry, crates.io와 Rust 공식 배포, Playwright 공식 브라우저 배포다. 관리형 환경의 네트워크 정책을 따르고 인증 자료를 출력하지 않는다.

클라우드 GPU 존재 여부는 시작 시 확인한다. Chromium WebGL renderer가 SwiftShader/llvmpipe면 CPU와 기능 검증에 사용하되 결과에 software renderer로 표시한다. 이후 실제 데스크톱에서 그대로 실행할 수 있는 harness를 제공한다.

## M0 — 구현 전에 측정

1. Three.js 0.186.1과 공개 예제 원본 커밋을 고정한다.
2. 공개 예제 최소 2개를 실행한다. transform/계층 CPU 후보와 animation/skinning 후보를 조사하고, GPU-heavy 대조 장면을 추가한다. 라이선스와 에셋 재현성을 고려해 구체 예제를 선정한다.
3. 정상 크기 예제, 작은/정적 장면, 별도 확장성 변형을 구분한다. render 이전 CPU, render submission, matrix/animation/skeleton 후보 비용, rAF 간격을 측정한다. 지원 시 GPU timer query를 추가한다.
4. 고정 seed와 simulation 입력, warm-up, 반복별 원시 데이터 및 환경을 저장한다. 비용이 과도하면 smoke와 full protocol을 분리하되 smoke를 최종 수치로 포장하지 않는다.
5. 기존 구현 WAMR3D/threers/three-rs는 짧게 비교하고 재사용 여부를 기록한다. 문서 주장과 실행으로 확인한 결과를 구분한다.
6. ADR로 첫 Rust 포팅 대상을 결정한다. 기대 가능한 전체 이득과 bridge 비용, 호환 위험을 적는다. 성능 결과가 좋지 않아도 기록하고 M1/M2 구현과 검증을 진행한다.

## M1 — 호환 경로

로컬 설치 가능한 ESM rthree 패키지, original/JS-compat/Wasm 엔진 선택, 단일 코어 객체 그래프, addon 경로, 필요한 브라우저 초기화와 정상 출력 검증을 구현한다. 최소 한 공개 예제를 앱 로직 변경 없이 엔진 경로 선택만 바꾸어 실행한다. 지원/미지원 API를 표로 기록한다. 재수출만 있는 단계는 acceleration 없는 단계로 표시한다.

## M2 — 첫 지속 Rust 코어 통합

M0에서 선정한 subsystem에 Rust 지속 상태와 배치 계산을 도입한다. 기존 THREE API에서 실제 Wasm 코드가 실행되고 기존 JS의 같은 계산을 불필요하게 반복하지 않도록 renderer 경계를 통합한다. 읽기/쓰기/force 업데이트의 동작을 보존한다. 완전 호환이 어려운 경우 좁은 검증 범위와 fallback을 명확히 한다.

Rust native tests, JS oracle/differential tests, 브라우저 이미지/수치 비교, 실제 Wasm 활성화 검사, A/B/C 비교를 실행한다. 원시 데이터와 summary를 남기고, 개선·동률·퇴행을 모두 보고한다. 결과가 별로여도 구현과 실험의 가치는 보존한다.

## 이번 작업의 최종 산출물

- 계획/초기 설정/실행 방법 문서와 재현 가능한 lockfile.
- M0 프로파일 및 선정 ADR, 근거가 되는 공개 예제와 원시 결과.
- M1 rthree 호환 경로 및 브라우저 예제.
- M2 실제 Rust/Wasm 구현, 통합, 정확성 테스트와 A/B/C 결과.
- README의 실제 지원 범위·실행 명령·성능 한계 갱신.
- 기능/테스트/benchmark smoke CI와 리뷰 가능한 구현 diff. npm 배포는 포함하지 않는다.

참고 공식 문서: [Codex Cloud CLI](https://learn.chatgpt.com/docs/developer-commands#codex-cloud). 실제 원격 실행 ID와 결과는 실행 후 기록한다. 이 문서는 실행을 준비한 사실만 나타내며 클라우드 작업 완료 증거는 아니다.
