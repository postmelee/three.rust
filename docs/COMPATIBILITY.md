# 호환성 계약과 패키지 설계

작성: 2026-10-22. 아래는 구현 목표이며 현재 통과한 호환성 목록이 아니다.

## 1. import만 변경할 수 있는 조건

```js
// 기존
import * as THREE from 'three';

// 목표
import * as THREE from 'rthree';
```

**기술적으로 가능하다.** npm 이름은 외부 식별자이고, rthree가 같은 export와 관찰 가능한 동작을 제공하면 된다. 다만 이 한 줄이 일반적인 앱의 전체 의존성을 교체하지는 않는다. 초기 약속은 **Three.js 0.186.1과 명시적으로 테스트한 기능·환경에서의 소스 호환**이다.

| 호환성 종류 | 첫 목표 |
|---|---|
| 이름·메서드·인자 | 기존 JS 소스를 기반으로 보존 |
| 값·상태·반환값·이벤트 순서 | oracle와 시나리오 테스트로 검증 |
| 화면·재질·그림자 | 같은 WebGL 렌더러 기반으로 검증 |
| addon의 객체와 타입 identity | 패키지 내부를 한 모듈 그래프로 연결 |
| 타입 선언 | 대응하는 @types/three 버전과 선언 검증; 타입이 맞는다고 런타임 지원으로 판단하지 않음 |
| 임의 버전·deep import·서드파티 내부 접근 | 첫 alpha 보장 제외 |
| 성능 향상 | 별도 실측 결과로만 주장 |

기존 JS에서 그대로 실행되는 API는 **JS 유지**, Rust에서 실행되는 API는 **Rust 가속**, 미검증은 **미검증**, 지원하지 않는 것은 **미지원**으로 표시한다. JS 재수출만 성공한 상태를 Rust 포팅 완료라고 계산하지 않는다.

## 2. 패키지 경로와 단일 객체 그래프

첫 지원 후보 경로는 `rthree`, `rthree/addons/*`, `rthree/examples/jsm/*`다. 필요한 build 파일 경로는 검증된 별칭으로만 제공한다. `rthree/webgpu`, `rthree/tsl`, 임의 `src/*`는 초기 계약에서 제외한다. upstream은 이보다 넓은 [exports](https://github.com/mrdoob/three.js/blob/r186/package.json)를 제공하므로 부분 지원 사실을 명시한다.

로더나 서드파티 라이브러리가 내부에서 `from 'three'`를 실행할 수 있다. 앱만 rthree로 바꾸고 addon이 원본 three를 가져오면 서로 다른 생성자와 객체가 섞인다. `instanceof`, 클래스의 내부 구현 참조, 로더가 만드는 Mesh/Bone/Skeleton 때문에 문제가 생길 수 있다.

대응 방침:

1. rthree가 배포하는 addon은 빌드 시 rthree의 동일 코어를 참조하게 한다.
2. 외부 addon·라이브러리는 검증된 bundler alias 또는 import map으로 `three`를 rthree의 같은 URL/모듈로 해석한다. prefix 경로도 별도 처리한다.
3. original three와 rthree가 동시에 섞이는 의존성 그래프를 CI에서 검출한다.
4. React Three Fiber 등 대규모 생태계 호환은 별도의 fixture가 생기기 전까지 약속하지 않는다.

브라우저 import map의 목표 형태는 다음과 같다. 경로는 예정된 배포 구조를 설명하는 예시다.

```html
<script type="importmap">
{
  "imports": {
    "three": "/vendor/rthree/index.js",
    "rthree": "/vendor/rthree/index.js",
    "three/addons/": "/vendor/rthree/addons/",
    "rthree/addons/": "/vendor/rthree/addons/"
  }
}
</script>
```

이 방식은 앱의 `from 'three'`를 유지한 채 배포 설정만 교체하는 경험도 제공할 수 있다. 그러나 `./node_modules/three/build/three.module.js` 같은 직접 URL은 위 bare-specifier 매핑의 영향을 받지 않는다.

## 3. 기린 사이트에 필요한 실제 변경

- main.js의 직접 build 파일 import를 bare import로 통일한다.
- GLTFLoader, SkeletonUtils, BufferGeometryUtils의 node_modules 직접 경로를 addon 경로로 통일한다.
- index.html에서 엔진과 addon 경로를 함께 선택한다.
- build.mjs가 선택 엔진의 JS 모듈뿐 아니라 `.wasm`과 필요한 런타임 자산도 복사하게 한다. `new URL(..., import.meta.url)`로 참조하는 Wasm은 현재 상대 import 추적만으로 복사되지 않는다.
- 같은 경로 정리를 적용한 original 빌드도 비교 기준으로 사용한다. 엔진 교체 외 앱 로직·에셋·품질 차이가 없음을 diff로 확인한다.

이는 일회성 통합 작업이다. 정리 후 반복 A/B는 엔진 선택 설정만 바꿔 수행하는 것을 목표로 한다.

## 4. Wasm 초기화와 동기 API

Wasm 로딩·컴파일·인스턴스화는 초기화 단계가 필요하다. `new THREE.WebGLRenderer()`나 `mixer.update()`를 Promise로 바꾸면 기존 API와 달라진다.

브라우저 ESM 기본 진입점은 **top-level await로 Wasm 준비를 마친 뒤 import를 완료**하는 방안을 우선 검증한다. 그 뒤 생성자와 기존 메서드는 동기적으로 작동하게 한다. GPU context는 기존 renderer 생성 시 만들고, 모듈 초기화에서 만들지 않는다.

- 장점: 지원 ESM 환경에서는 사용자 코드에 init 호출을 추가하지 않을 수 있다.
- 비용: 모듈 평가가 지연되고 초기 로딩·실패 전파·번들러 지원이 계약에 들어온다.
- 검증 항목: static hosting의 Wasm URL/MIME, CSP, 캐시, offline 오류, base path, Vite 등의 실제 빌드, module cycle, SSR에서 DOM 접근 여부.
- CommonJS의 동기 require는 이 비동기 초기화 경로와 동일하게 지원한다고 약속하지 않는다. 첫 alpha는 브라우저 ESM을 대상으로 한다.
- 명시적 초기화가 필요한 환경에는 별도 진입점을 제공할 수 있지만, 그 경로는 추가 init 단계가 필요하다고 문서화한다.

조용히 JS fallback을 실행한 것을 Wasm 성능 결과로 발표하지 않는다. 벤치마크에는 `engine`, `backend`, `wasmActive`, `fallbackReason`, 가속 영역별 호출/노드 수를 기록한다. 성능 비교 모드는 Wasm 초기화 실패 시 실행을 실패 처리한다.

## 5. 동기화 의미가 가장 큰 구현 위험

Three.js 사용자는 메서드뿐 아니라 속성·배열·객체 참조를 직접 다룬다.

```js
mesh.position.x += 1;
mesh.rotation.y += 0.01;
mesh.matrix.elements[12] = 3;
mixer.update(dt);
parent.updateMatrixWorld(true);
head.getWorldPosition(target);
```

`position.x` 쓰기를 즉시 읽는 값, Euler/quaternion 연동, updateMatrixWorld(force), updateWorldMatrix, matrixAutoUpdate, matrixWorldAutoUpdate, parent 변경, clone/copy, 콜백 순서까지 다뤄야 한다. 프레임 마지막에만 dirty 상태를 보내는 구현은 기린의 facePose 동작과 맞지 않는다.

동기화는 원본이 값을 갱신하는 시점에 맞춘다. `matrixWorld`의 단순 접근이 원본에서 stale 값을 돌려주는 경우에는 임의로 최신 계산을 강제하지 않는다. 반대로 `mixer.update()`가 반환한 뒤 읽을 수 있는 애니메이션 결과와 그 과정의 이벤트는 원본과 같아야 한다.

| 경계 | 요구사항 |
|---|---|
| JS 속성 쓰기 | 기존 JS 관찰 값과 identity 유지; 한 객체의 변경을 합친다. |
| 명시적 matrix 갱신 | 관련 ancestor/subtree를 원본 의미대로 계산하고 결과 반영 |
| mixer.update 반환·이벤트 | 원본 시점에 관찰 가능한 pose를 제공; 이벤트 전후 state 검증 |
| getWorldPosition 등 | 원본 메서드의 갱신 규칙을 따라 필요한 범위만 flush |
| render·shadow·복수 pass | 이미 유효한 계산은 재사용; 콜백의 재변경은 검출 |
| 직접 mutable array 쓰기 | accessor만으로 추적할 수 없으므로 초기에는 보수적 동기화 또는 정확한 JS 경로 유지 |

Vector3 전체를 Proxy로 감싸거나 매번 Wasm getter를 부르는 방식은 API와 성능 비용을 함께 실험한 뒤 선택한다. 버퍼 복사를 없앴다는 주장은 실제 소유권과 memory.grow 이후 typed-array view 재생성까지 검증한 경우에만 한다. Rust 핸들은 generation을 포함해 해제 후 재사용 오류를 막고, 명시적 dispose/등록 해제와 GC 상호작용을 테스트한다.

## 6. 첫 호환성 검증 목록

| 영역 | 필수 시나리오 |
|---|---|
| 변환 | 부모/자식, reparent, 회전 순서, 비균일·음수 scale, force, 수동 matrix, 즉시 읽기 |
| 애니메이션 | idle/walk/run 가중치, timeScale, 루프 경계, quaternion 보간, 반복 update, 관련 이벤트 |
| skeleton | 복제된 모델의 독립 상태, bind/inverse-bind 행렬, boneMatrices, 얼굴 좌표, 그림자 pose |
| 로더·유틸 | GLTFLoader가 만드는 객체, SkeletonUtils.clone, BufferGeometryUtils, Box3.setFromObject |
| renderer | OrthographicCamera, PBR, alphaTest, shadow map, ACES, sRGB, compileAsync, resize, context loss |
| 예제 경로 | root/addons exports, 필요 시 Timer·SunLight 등 선택한 r186 예제의 실제 의존성 |

JS Number와 맞추는 CPU 수치 계산은 우선 f64를 기준으로 한다. GPU에 넘기는 기존 Float32Array 경계는 유지한다. f32·SIMD를 도입하면 정확도·메모리·성능 변화가 포함된 별도 모드로 비교한다. 단일 허용오차를 모든 좌표·각도에 적용하지 말고 값 범위와 기능별로 절대/상대 허용오차를 정한다.

완전히 보존할 수 없는 사용자 subclass override, monkey patch, 직접 배열 조작은 검출 가능한 경우 JS 경로로 보내고 진단한다. 검출 불가능한 동작까지 자동 fallback된다고 주장하지 않는다. 테스트되지 않은 기능은 미검증으로 남긴다.
