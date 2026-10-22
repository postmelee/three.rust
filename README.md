# three.rust

Three.js의 JavaScript API를 유지하면서, 반복적인 CPU 장면 계산을 Rust/WebAssembly로 옮기는 오픈소스 프로젝트 제안입니다.

**현재 상태: 저장소 초기 설정. Codex Cloud에서 M0–M2 구현을 진행할 계획이며, 아직 성능 결과는 없습니다.** `rthree`는 npm 패키지명 후보이며 이름 확보 여부는 확인하지 않았습니다.

첫 목표는 Three.js **0.186.1**을 기준으로 데스크톱 공개 예제를 우선 측정하고, 이후 [Living Like a Giraffe](https://github.com/livinglikeagiraffe/livinglikeagiraffe.github.io)를 실행하고, 동일한 화면·동작을 유지한 상태에서 CPU 시간과 프레임 안정성의 변화를 재현 가능하게 공개하는 것입니다.

목표 사용법은 다음과 같습니다. 아직 실행 가능한 패키지는 아닙니다.

```js
import * as THREE from 'rthree';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
// 검증된 API 범위에서는 기존 애플리케이션 코드를 유지한다.
```

- [프로젝트 계획과 마일스톤](docs/PROJECT_PLAN.md)
- [호환성 계약과 패키지 설계](docs/COMPATIBILITY.md)
- [실제 프로젝트 성능 비교 방법](docs/BENCHMARKS.md)

초기 전략은 버전을 고정한 Three.js 소스를 기반으로 WebGL 렌더러·로더·재질을 재사용하고, 프로파일에서 확인한 계산을 Rust로 교체하는 것입니다. 범용 전체 재작성, 자체 WebGPU 렌더러, 네이티브 Rust API는 첫 검증 범위에 포함하지 않습니다.

프로젝트명은 **three.rust**, 패키지명은 **rthree(가칭)**로 구분합니다. 공개 시 Three.js와 독립된 프로젝트임을 표시하고, 재사용 코드와 예제 에셋의 출처·라이선스를 보존합니다.

- [Codex Cloud 초기 설정 및 M0–M2 실행 계약](docs/CLOUD_SETUP.md)
