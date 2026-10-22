# 실제 프로젝트 벤치마크 프로토콜

작성: 2026-10-22. **측정 계획이며 아직 결과는 없다.** 1차 질문은 “import 호환 경로의 three.rust가 데스크톱 공개 Three.js 예제의 실제 작업 시간을 줄이는가?”이다.

**사용자 확정 우선순위:** 공개 예제 중심으로 M0–M2를 진행한다. 아래 기린 replay는 후속 fixture다. CPU transform, animation/skinning, GPU 중심 대조 장면을 고정 버전에서 선정하고, 정상 크기·작은 장면·확장성 변형을 분리한다. 클라우드 소프트웨어 GPU 결과에는 실제 desktop GPU 성능 미검증 표시를 붙인다.

## 1. 비교군

| 이름 | 내용 | 용도 |
|---|---|---|
| A — original | 앱의 현재 최적화를 유지한 Three.js 0.186.1 | 주 기준선 |
| B — rthree JS | 같은 호환 패키지·계측·모듈 구조에서 Rust 계산을 비활성화 | 포크·브리지 준비 비용과 회귀 확인 |
| C — rthree Wasm | 동일 API·화면·WebGL 경로에서 Rust 계산 활성화 | 제품 효과: A와 비교, 구현 효과: B와 비교 |
| D — JS 구조 최적화 | 시간 여유가 생기면 동일 데이터 배치/계산 생략을 JS로 구현 | 언어와 자료구조 변화의 기여 분리 |
| E — Rust 배치 API | 앱을 배치형 API로 수정한 별도 실험 | 더 큰 개선 가능성, import-only 결과와 분리 |

A/B/C를 첫 측정의 필수로 한다. D/E 때문에 첫 결과를 늦추지 않는다. 이후 새 JS 최적화를 발견하면 A는 원래 비교 가능하도록 유지하고 A-optimized를 추가한다. 성능 주장은 어떤 기준과 비교했는지 표시한다.

## 2. 실사용 장면을 먼저 선정

### 기린 사이트

1. **산책 replay:** 동일 시작점, seed, 이동·달리기 입력, 카메라 경로. 원래 플레이어와 두 동료를 유지한다.
2. **얼굴 대화:** 접근·대화 시작·얼굴 추적·복귀. 동기적 본 좌표 읽기와 pose 정확성을 확인한다.
3. **시간대 전환:** 낮·노을·해질녘. 그림자와 조명/색상 변경을 유지한다.
4. **읽기 모드:** 기존 렌더링 정지가 유지되는지 확인한다. 이 구간을 active-render 평균 FPS에 포함하지 않는다.
5. **cold startup:** 모델·텍스처·셰이더·Wasm 초기화부터 첫 유효 프레임까지 별도 측정한다.

주 성능 지표의 대표 공개 예제는 M0에서 Rust 구현 전에 사전 지정한다. CPU 병목 여부와 상관없이 이 결과를 최종 보고서에 남긴다. 나머지는 회귀와 동작 검증을 겸한다.

### 공개 Three.js 예제

첫 후보는 [webgl_animation_skinning_blending](https://github.com/mrdoob/three.js/blob/r186/examples/webgl_animation_skinning_blending.html)이다. 기존 애니메이션 코드와 모델을 유지하고 engine 경로 및 공통 계측만 변경한다. r186 예제가 사용하는 Timer, SunLight addon 등도 의존성 목록에 포함한다.

정적/렌더링 중심 대조군 후보는 [webgl_performance](https://github.com/mrdoob/three.js/blob/r186/examples/webgl_performance.html)이다. 현재 r186 소스는 GLTF와 환경 텍스처를 사용하는 장면이므로 이름만 보고 CPU 다중 객체 테스트로 취급하지 않는다. 성능 검증 전에 필요한 기능·에셋 조건을 확인한다.

별도 확장성 실험은 스키닝 모델 1/10/50개 또는 transform 노드 1천/1만개 등으로 증가시킨다. 이 결과는 원본 예제나 실제 기린 사이트의 성능 수치와 별도 표에 둔다. 인스턴싱·그림자 축소·모델 변경을 한쪽에만 적용하지 않는다.

## 3. 동일한 입력과 화면 유지

- 앱/엔진 커밋, lockfile, Rust toolchain, 빌드 옵션, 브라우저·OS·GPU·기기, 에셋 hash를 manifest에 저장한다.
- production JS와 release Wasm을 사용한다. 디버그 빌드와 릴리스 빌드를 비교하지 않는다.
- 똑같은 viewport, 실제 drawing buffer 크기, DPR, 그림자 크기·방식, antialias, 색공간, 톤매핑, 텍스처, 모델·LOD를 고정한다.
- 모바일 품질과 데스크톱 품질은 각각 별도 프로필이다. 브라우저 화면 크기와 pointer 판별이 앱의 mobile 분기를 바꾸므로 실제 적용 프로필을 결과에 저장한다.
- 난수 seed와 입력 replay를 동일하게 한다. 로딩 완료, 텍스처 준비와 shader 준비 후 warm 측정을 시작한다. 현재 앱의 시작 처리 외에 비동기로 추가되는 자원이 없는지도 확인한다.
- 성능 반복에서는 정해진 simulation tick과 동일 입력으로 같은 수의 작업을 수행한다. 실제 wall-clock dt 기반 UX replay는 별도로 실행한다. 엔진별 FPS 차이 때문에 애니메이션 시간이 달라진 화면을 비교하지 않는다.
- correctness용 고정 pose 캡처와 performance 실행을 분리한다. 스크린샷·readPixels·장시간 tracing이 성능 측정 구간에 들어가지 않게 한다.

수치 비교는 변환 행렬·본 행렬·카메라·이벤트를 포함한다. 시각 비교는 동일 기기에서 원본과의 pixel diff 및 차이 이미지를 함께 검토한다. 안티앨리어싱 오차 허용 범위는 A/A 캡처로 먼저 정하며, 잘못된 얼굴 pose나 빠진 그림자가 전체 이미지에서 작은 비중이라는 이유로 통과하지 않도록 관심 영역도 확인한다.

## 4. 측정 지표

| 지표 | 측정 의미와 주의점 |
|---|---|
| 프레임 CPU 작업 ms p50/p95/p99 | 실제 update 시작부터 render 반환까지. JS↔Wasm 변경 수집·복사·결과 반영을 모두 포함 |
| 세부 CPU 구간 | app update, animation, transforms, skeleton, renderer submit, bridge. 중첩 구간은 합산하지 않음 |
| rAF 간격과 실제 render 간격 | 브라우저 callback과 앱의 30fps 제한을 구분. 두 분포를 따로 저장 |
| FPS·긴 프레임 비율 | 표시 주사율/앱 제한을 함께 표시. 목표 주기의 1.5배 초과를 예시 지연 프레임 기준으로 사전 고정 |
| GPU pass ms | WebGL2 timer query 지원 시 비동기 결과 수집; unavailable/disjoint 표본은 유효 숫자처럼 사용하지 않음 |
| draw calls·triangles·프로그램 수 | 작업량과 렌더링 누락을 점검하는 보조 지표. GPU 시간으로 해석하지 않음 |
| cold/warm startup | navigation→첫 유효 화면, Wasm fetch/compile/init, asset load, shader compile을 분리 |
| 메모리·GC | 지원 도구에서 JS heap, Wasm 선형 메모리·사용량, 프로세스·GPU 추정치를 구분. 서로 겹치는 항목을 합산하지 않음 |
| 실행 경로 | wasmActive, backend, fallback 사유, 계산한 노드/본 수, bridge 호출 수·전달 바이트 |

`performance.now()`로 `renderer.render()` 전후를 재면 CPU 호출/제출 시간이며 GPU 완료 시간이 아니다. [EXT_disjoint_timer_query](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query)는 파이프라인을 정지시키지 않고 GPU 명령 시간을 측정하는 확장이며 WebGL2에서는 `EXT_disjoint_timer_query_webgl2`를 확인한다. 결과가 아직 없으면 다음 프레임에서 조회하고 disjoint 여부를 검사한다. 미지원은 `N/A`로 남긴다. `gl.finish()`로 CPU를 기다리게 한 시간을 일반 프레임 수치로 사용하지 않는다.

CPU와 GPU가 겹쳐 동작하므로 둘의 시간은 단순 합산하지 않는다. GPU 시간이 그대로라도 CPU 감소로 main-thread 여유가 생길 수 있지만, 이를 FPS나 배터리 개선으로 자동 해석하지 않는다. 발열·전력 주장은 별도 장시간 실측이 필요하다.

## 5. 짧고 재현 가능한 실행 절차

1. M0에서 A/A를 최소 5회 반복하여 계측 오버헤드·환경 변동을 확인한다. 저비용 타이머를 기본으로 하고 자세한 프로파일링은 별도 실행한다.
2. A/B/C 각각 같은 초기 상태로 시작한다. 앱 인스턴스는 독립적으로 재시작하고 한 번에 하나만 foreground에서 실행한다. 같은 화면에 두 엔진을 동시에 띄워 측정하지 않는다.
3. 자원 준비 후 **10초 warm-up + 30초 측정**을 기본으로 한다. GC나 드문 stutter를 판단할 때만 별도의 긴 실행을 추가한다.
4. 최소 **7개의 paired 반복**으로 실행 순서를 교차/무작위화한다. 전원 모드·배터리·열 상태·다른 앱 부하를 통제하고 기록한다.
5. 반복별 p50/p95/p99와 상대 변화율을 계산한다. 모든 프레임을 독립 표본으로 합쳐 신뢰도를 부풀리지 않는다. paired 실행 단위 bootstrap 등으로 불확실성을 표시한다.
6. 가시성 변경, 창 이동, 컨텍스트 소실, 에셋 미완료는 사전에 정한 무효 사유로 기록한다. 느린 표본을 임의 삭제하지 않는다.
7. startup은 warm 측정과 분리하여 엔진별 최소 5회 측정한다. HTTP cache와 Wasm compile cache의 상태를 기록하며 완전 초기화가 불가능하면 그 사실을 적는다.
8. 데스크톱 Chromium부터 시작하고, 실제 모바일 브라우저 및 Safari/Firefox로 지원·회귀 검증을 넓힌다. 사용한 실기기 정보가 없으면 모바일 성능 검증 완료라고 쓰지 않는다.

headless 브라우저는 correctness CI에 사용할 수 있다. 대표 성능 수치는 실제 GPU를 사용하는 foreground 브라우저에서 구한다. 일반 CI VM이나 에뮬레이터의 수치로 실기기 우위를 주장하지 않는다.

## 6. 모바일 30fps 제한의 처리

**주 결과는 원래 제한을 유지한다.** 목표 주기는 약 33.3ms이며 desktop 60Hz의 약 16.7ms와 구분한다. 30fps가 유지돼도 CPU 8ms→5ms 같은 개선은 의미 있는 결과다. 이 숫자는 설명용 예시이며 실측이 아니다.

상한 때문에 차이가 가려지는지 확인하려면 별도의 진단 모드에서 양쪽의 앱 30fps 제한만 동일하게 해제한다. 브라우저 rAF의 VSync 제한은 여전히 남으므로 “무제한 FPS”라고 부르지 않는다. 낮은 DPR 진단은 CPU 병목 구분에만 사용하며 원래 화질 결과를 대체하지 않는다.

## 7. 결과 파일과 공개 형식

예정 구조:

```text
bench/results/<date>/<device>/<scenario>/
  manifest.json
  runs.json
  frames.jsonl
  summary.csv
  screenshots/
  report.md
```

보고서 표에는 A/B/C의 CPU p50·p95, 실제 render 간격 p95, 지연 프레임 비율, GPU 시간 또는 N/A, 초기 로딩, 메모리, 화면 검증 결과를 넣는다. 실측 전 숫자칸을 임의 값으로 채우지 않는다.

목표 판정은 PROJECT_PLAN의 M2 기준에 따른다. “Rust 3배” 같은 표현 대신 **기기·브라우저·장면·기준 엔진·지표·불확실성**을 붙인다. 커널 배수, 전체 CPU 감소율, FPS 변화율은 서로 다른 수치로 보고한다. 결과가 없거나 측정 불가능한 항목도 명시한다.
