# Task #49 native content gate correction and network diagnostic

This note preserves the failed gates; it does not convert their status into a pass. The original assets, application source, native cache policy, renderer quality and default camera remain unchanged.

## Failed capture inputs

Both `task49-viewer-bistro-correctness-001` and `task49-viewer-chess-correctness-001` used clean tooling `fbeb5b2a327e5ebd5eb5eebbaa09a453c5b1bdd4`, candidate `85e2c5d500edb0b92ea4ecb997087fded3fed45b`, and native preparation `task49-viewer-external-003`. The two executable JS files and CSS file in preparation 003 match preparation 002 byte for byte. No browser profile or primary CPU timing was taken during these correctness captures.

Bistro completed native import, source material checks, 405 decoded material images, 13 authored clips, natural autoplay/play-all motion, fresh native reload, and both fixed-pose within-route A/A checks in all five routes. Each route then failed the strict request-failure gate on `net::ERR_ABORTED`. The first r176 route recorded 1,221 HTTP-200 responses (407 resources times three), 1,098 completed request events and 123 failed events. Every failed content URL also had a completed request. The raw events lacked request IDs and timestamps, so neither the failed request's owner nor its exact phase is established. The native Viewer enables `THREE.Cache`; reload can reuse cached loader inputs while the native validator fetches again. This source fact is not an explanation of the cancellations.

Chess also observed an aborted BIN request without any reload. Its gate stopped earlier on inappropriate source-association equality checks, described below. Therefore reload is not necessary for the observed cancellation, but the cause is still unconfirmed. No event is filtered or relabeled as successful in the next diagnostic.

All five Bistro and five Chess contexts closed without an observed context-loss, OOM or crash. Their failed statuses and partial states, validators, screenshots, served hashes and events remain intact.

## Why association index equality is not the source contract

The fixed installed GLTFLoader sources are:

| Three.js | SHA-256 | Bytes | Relevant function starts |
| --- | --- | ---: | --- |
| 0.176.0 | `28f2eeae9b289aa0607ebb3249257cb2ad0715f2b23a40e0d3b4f867895e251f` | 114,450 | `_getNodeRef` 2871; `_loadNodeShallow` 4324; `loadTextureImage` 3309 |
| 0.186.1 | `131c0f78c01d19368ae495caa65b3adaa10487810a36a05bb5901b769a35ac16` | 117,570 | `_getNodeRef` 2849; `_loadNodeShallow` 4339; `loadTextureImage` 3287 |

The r176 clone path associates cloned meshes with the same mapping object; `_loadNodeShallow` then writes the node index into that mapping. Chess has 49 authored mesh nodes but its r176 association-number set contains only 15 values. r186 copies the mapping for multiply referenced meshes before writing the node index, yielding 49 values. These internal mapping numbers cannot stand in for actual node instances. The next gate checks each uniquely named authored node's actual instance, parent/child relationship, mesh and primitive/material relation, geometry attribute/index counts, and static local transform. Every source node in these two pinned assets has a nonempty unique name; the gate asserts this prerequisite. Native animated targets are checked through their complete fixed-pose cross-route numerical oracle rather than against a static source pose during playback.

Both GLTFLoader versions cache textures by source image URI (or buffer view) and sampler. Chess's 43 texture definitions refer to 33 images with equivalent aliases, and the loader creates 33 texture objects. All 33 images were decoded in the failed capture; the missing association numbers refer to aliases, not evidence of missing images. The corrected gate requires every authored material map slot to retain the proper image, sampler, texture coordinate channel, offset, scale, rotation, orientation and transfer function. Raw representative texture indices remain recorded. Missing slots, changed UVs/samplers and changed material factors still fail.

Color-space identifiers also require semantic interpretation. The pinned KTX2 linear data maps carry `srgb-linear`, while JPEG data maps can use the empty NoColorSpace identifier. In r176 `ColorManagement.getTransfer` lines 97–101, NoColorSpace maps to LinearTransfer; its LinearSRGB space also declares LinearTransfer. The gate compares required linear/sRGB transfer semantics and preserves the raw color-space identifier. It does not edit KTX2 metadata or apply a color correction.

## Diagnostic change

The next fresh capture adds passive CDP metadata only: request ID, initiator stack, timestamp/wall time, frame/loader identity, HTTP response status/cache metadata, loading-finished bytes, and loading-failed cancellation flags. Browser-clock markers identify navigation, initial load/ready, native autoplay/play-all, reload/ready, fixed poses, final checks and closure. Phase-at-receipt labels are not treated as exact causal attribution; the timestamps and initiating stacks remain available. No response body is read through CDP, no request/cache policy is overridden, and the original strict requestfailed check remains.

Node tests cover duplicate request URLs with distinct IDs, retained canceled failures, missing page clocks, valid source aliases, and mutations removing a node/primitive/map slot or changing hierarchy, static transform, UV/sampler/transfer, image readiness, authored channels, transmission, volume or specular values. The combined adapter/oracle/content/network suite passed 22/22 after the correction. New logs and source proofs are in `work/task49-viewer-node-005`.

## Bounded independent snapshot evidence

The failed Bistro gate excludes unsuccessful routes from its official cross-route comparison list. A separate diagnostic compared its already completed raw fixed snapshots without changing their gate status: r176 packaging and both r186 candidate routes match at both 0.75 and 1.5 seconds, including 74,619 numerical values and both renderer images. r176-to-r186 differences remain migration evidence, with main-image changes and maximum numerical differences about `1.8e-7` and `1.9e-7`. The diagnostic is retained in `work/task49-viewer-node-004/bistro-001-independent-snapshots.json` and does not override the transport failure.

The default far camera shows conspicuous bright speckling on Bistro walls and roofs in both the native r176 and pure r186 views. Exact candidate image agreement is not a visual-fidelity certification. The source conversion README's DirectX normal-map warning is retained, but no causal connection to the speckling has been established. No asset, normal map, material or default camera is repaired to make this check pass.

## Completed original-r176 diagnostics 002

The fresh original-r176-only captures `task49-viewer-bistro-transport-diagnostic-002` and `task49-viewer-chess-transport-diagnostic-002` used clean tooling `3d7453d5a509ac93212a31fd1cc2678e89d77c2b` and native preparation 003. They exercised the corrected relationship contract and passive CDP observation. No candidate engine was selected in these original-r176 routes. Both reached the unchanged strict requestfailed check and failed there; neither failed gate is replaced by the observations below.

Bistro retained all 1,297 original node instances, 1,284 static source transforms plus 13 animated targets, 132 materials, 405 attached image/slot relationships and 13 clips. Chess retained all 49 original node instances and static source transforms, 15 materials and 71 authored map slots; 43 texture definitions correctly alias 33 decoded images. The native source relationship checks and completed within-route fixed-image/numeric A/A checks passed. No context loss, OOM or crash was observed.

The new request IDs and initiating stacks separate the cancellations from later validator requests:

| Content | Initial native loader | Initial validator | Reload validator |
| --- | --- | --- | --- |
| Bistro | 407 requests: 298 finished, 109 canceled | 407 finished | 407 finished |
| Chess | Two FileLoader requests: one finished, one canceled; 33 ImageLoader requests finished | 35 finished | No reload |

Every canceled content request had an HTTP-200 response and a subsequent CDP `loadingFailed` with `canceled: true` and `net::ERR_ABORTED`; no CORS or blocked reason was recorded. The initiating frame in the unchanged original bundle is `assets/index-_rZ_swZ7.js`, zero-based line 43, column 132222. Its surrounding code is the pinned r176 FileLoader path from `fetch` through `response.body.getReader()` and a new ReadableStream. The pinned FileLoader does not contain an AbortController call. This identifies the requesting path, not the cancellation mechanism.

For example, Bistro BIN request `50955.13` started at CDP time `110900.917322` and canceled at `110901.686743`. Its distinct initial validator request `50955.426` began at `110903.572121`, and reload validator request `50955.834` at `110921.994556`. Chess BIN request `51324.13` started at `110977.795495` and canceled at `110977.917785`; its validator request `51324.48` began at `110978.449084`. These are CDP monotonic seconds, not wall-clock timestamps or performance measurements. In these observations cancellation preceded the same URL's validator request and did not occur during reload, fixed-pose checks or browser closure. A separately canceled favicon request is retained and distinguished from content requests.

Native cache entries exist for canceled loader URLs, but their presence is not a complete-body checksum. Some Bistro KTX2 cache ArrayBuffers have zero length after the native worker-transfer path; zero length is not reinterpreted as missing content or verified full delivery. Request IDs, timestamps, initiating stacks, native state, validator reports, fixed snapshots and raw failures remain in the two 002 directories. Commands and preparation records are in `work/task49-viewer-node-006`.

## Completed single-file probe 001

The separate `task49-viewer-transport-probe-001` used clean tooling `42121c8ff9bc4e83a65991072a03d9514ce5823c`, the unchanged original-r176 bootstrap and native preparation 003. It loaded no app scene and created no renderer, profile or primary timing window. Its single allowlisted payload was the original A Beautiful Game BIN: 10,829,440 bytes, SHA-256 `727eea28752b2b0c35cad89e726f0bc6a1800c3fa8696867ccf3d0c39933f5fb`.

| Trial | Reader | Complete expected bytes/hash | Payload terminal |
| --- | --- | --- | --- |
| 1 | Native fetch | Matched | One loadingFinished |
| 2 | Original r176 FileLoader | Matched | One loadingFinished |
| 3 | Original r176 FileLoader | Matched | One loadingFinished |
| 4 | Native fetch | Matched | One loadingFinished |

All four trials used distinct fresh query URLs and lacked preexisting Three cache entries. Payload cancellations, Page/helper errors and blocked external requests were absent. Source/file integrity remained unchanged and the owned browser closed. The bounded probe reports body verification and strict transport success; it does not qualify the full app or change either 002 gate failure.

All four responses were HTTP 200 with `Transfer-Encoding: chunked`, `Cache-Control: no-store`, MIME `application/octet-stream`, and no Content-Length. FileLoader's additional progress observer ended at loaded 10,829,440, total 0 and lengthComputable false. Returned byte length, in-page SHA-256, callback/digest times, progress observations, selected headers and complete CDP terminal evidence are retained. The diagnostic omits scene creation and parallel model/image work and adds a progress observer relative to native App.view. It did not reproduce a complete payload together with a canceled request. Therefore it neither establishes the original cancellation's cause nor supports missing Content-Length as that cause. Commands and logs are in `work/task49-viewer-node-007`.

## Why a narrow Playwright route does not bypass local CDP pauses

The installed Playwright Core is locked to 1.56.1 by `package-lock.json`, with registry artifact `https://registry.npmjs.org/playwright-core/-/playwright-core-1.56.1.tgz` and integrity `sha512-hutraynyn31F+Bifme+Ps9Vq59hKuUCz7H1kDOcBs+2oGguKkWTU50bBWrtz34OUWmIwpBTWDxaRPXrIXkgvmQ==`. The following evidence was read from that installed Apache-2.0 package; the corresponding upstream version is [Playwright v1.56.1](https://github.com/microsoft/playwright/tree/v1.56.1).

`lib/client/network.js`, `RouteHandler.prepareInterceptionPatterns` at line 637, retains regular-expression matchers but maps function predicates to a catch-all `**/*`. `lib/server/dispatchers/browserContextDispatcher.js` at line 252 enables the context interceptor whenever any matchers exist. Its request callback at line 72 continues a nonmatching request with `isFallback: true` after interception. In `lib/server/chromium/crNetworkManager.js`, `_updateProtocolRequestInterceptionForSession` sends:

```js
const cachePromise = info.session.send("Network.setCacheDisabled", { cacheDisabled: enabled });
// When interception is enabled:
fetchPromise = info.session.send("Fetch.enable", {
  handleAuthRequests: true,
  patterns: [{ urlPattern: "*", requestStage: "Request" }]
});
```

Consequently, excluding the local origin in a public route regex would not remove local requests from CDP Fetch pauses. Replacing the interception stack would introduce additional session, cache and remote-policy changes, so it was not selected as the next one-condition experiment. These are source observations for the pinned version, not a claim about future Playwright implementations.

## Whole-app response-framing diagnostic

An explicitly opt-in `diagnosticContentLength=true|false` tool path has been prepared for the original-r176 A Beautiful Game native App.view load. Explicit false selects the current default chunked transport with the same extra diagnostic observations as true; omitting the option retains the ordinary gate behavior. Only successful allowlisted mounted-content GET/HEAD responses receive a Content-Length equal to the verified served buffer length, naturally selecting explicit-length framing instead of chunked framing. Default server behavior, application/asset bytes, native loader/validator, renderer settings, Playwright interception, remote deny/mirror rules and strict requestfailed checks remain unchanged. No cancellation is filtered or waived.

The prepared observation records actual selected response headers with request IDs and timestamps, asserts the intended framing for every original resource, and retains the normal structure/material/image checks. After fixed-state screenshots it attempts SHA-256 on already retained native BIN ArrayBuffers without fetching replacement data or transferring the buffers. Missing, non-ArrayBuffer, zero-length/detached or digest-unavailable entries remain explicitly unavailable; a completed but mismatched checksum fails. This cannot substitute for a successful request terminal or prove a cancellation mechanism.

The seven changed source/test modules passed syntax checks; the focused content/network/probe suite passed 15/15, and the standalone server test passed seven checks. The server test confirmed unchanged default chunked framing, exact opted-in GET/HEAD lengths and body hashes, content-only scope, remote deny/mirror behavior, invalid option rejection, and the existing mutation/source guards. Logs are in `work/task49-viewer-node-008`, with standalone evidence in `work/task49-viewer-content-length-server-node-001`. No test failed in this validation pass.

The browser diagnostic has not yet executed. After the tool is committed/frozen, a new default-framing capture and a new Content-Length capture will use that same tool and the same diagnostic observations. Proposed fresh outputs are `work/task49-viewer-chess-default-framing-diagnostic-001` and `work/task49-viewer-chess-content-length-diagnostic-001`; none of the existing results will be overwritten. This matched pair prevents a later intermittent default success from being attributed to the header alone. Even a successful capture would establish an association with response framing under this workload, not an underlying Chromium/Playwright cause or a rendering-speed advantage.


### Completed framing pair

Both fresh original-r176 whole-app captures used clean tooling `ecf353ed9cfecdf7a0d2070ef7d84b769053b352` and native preparation003. `task49-viewer-chess-default-framing-diagnostic-001` and `task49-viewer-chess-content-length-diagnostic-001` each passed the actual-header assertions for 70 responses covering all 35 original resources. The former observed chunked/no-length framing; the latter observed exact-length/no-chunked framing. Both retained the native BIN as 10,829,440 bytes with the expected SHA-256. Both nevertheless failed the unchanged strict gate on the original BIN request's `net::ERR_ABORTED`. Source integrity and completed feature/fixed-state checks were preserved. Response length did not resolve this failure; these observations do not establish its underlying mechanism.

### Prospective local-interception diagnostic

The next explicit pair uses a deny-only local proxy in both arms, with only the exact experiment HTTP origin bypassing it. Chromium's [pinned proxy documentation](https://chromium.googlesource.com/chromium/src/+/312b6bf/net/docs/proxy.md) specifies scheme/host/port bypass rules and the ordered subtraction of implicit loopback exceptions. The proxy never resolves or forwards a destination. A separate browser test must demonstrate direct expected-origin delivery, blocked other-loopback/unknown HTTP/HTTPS requests, and exact locally mirrored bytes before an app capture.

`proxy-playwright` retains Playwright's catch-all interception. `proxy-cdp-remote` uses a page CDP Fetch handler for HTTPS only, serving the same exact mirrored allowlist and rejecting unknown requests; all other nonlocal destinations encounter the deny proxy. Cache remains explicitly disabled, matching the existing Playwright route mode, and service workers stay blocked. Local HTTP responses are no longer paused by Fetch in the second arm. The original app, asset bytes, native cache setting, validator and strict request-failure gate remain unchanged. Browser proxy/interception configuration and captured pause/denial events are recorded. The diagnostic is restricted to the original-r176 Chess load and is not a replacement protocol for historical primary timing.

The control with the same proxy is necessary because proxy launch configuration is itself an intervention. A passing remote-only arm would establish a bounded usable configuration and an association with this interception arrangement, not prove a Chromium implementation cause. Unknown-worker/subframe behavior is not qualified by a page-session test; the deny-only proxy prevents outbound forwarding if such a request escapes the page handler, and a missing dependency must still fail readiness.


### Completed interception diagnostics and next content gate

Clean tooling `6e9e857748ec0c5380430026b7c24ca8bf6726f3` passed the separate actual-Chrome guard test: both modes delivered exact local and mirrored payload hashes, rejected unknown HTTP/HTTPS and another loopback port, and observed zero connections at the second loopback sentinel. The remote-only mode recorded no local Fetch pauses. This test result omitted its own tool-SHA field; the execution record identifies the clean checkout and command, and the test source remains in that commit. It is not a complete worker/popup/network-policy qualification.

The original Chess whole-app sequence then produced:

| Fresh capture | Network condition | Strict outcome |
| --- | --- | --- |
| `chess-proxy-playwright-diagnostic-001` | Same Playwright routing plus deny proxy | Pass |
| `chess-proxy-cdp-diagnostic-001` | Remote-only CDP plus deny proxy | Pass |
| `chess-default-framing-diagnostic-002` | Existing default, no proxy | Fail: initial BIN ERR_ABORTED |
| `chess-proxy-playwright-diagnostic-002` | Repeat Playwright plus deny proxy | Fail: initial BIN ERR_ABORTED |
| `chess-proxy-cdp-diagnostic-002` | Repeat remote-only CDP plus deny proxy | Pass |

All results retain source/structure/material/fixed-image/numeric evidence and the expected complete cached BIN hash. Playwright-plus-proxy is intermittent, so the proxy itself is not established as a remedy. Two remote-only successes support testing that explicit configuration further; they do not prove the cancellation mechanism or relabel any earlier failure.

The next prospective five-route gates extend only the explicit `proxy-cdp-remote` mode to both pinned contents. Original chunked framing, app/asset bytes, native validator, dual renderers, authored clips/materials and strict failure criteria remain. Each route uses its own browser with only its exact local origin bypassing the deny proxy. Any new failure stays visible. No historical Robot capture is reinterpreted under these settings.

If these gates pass, a separate larger-content profile path will preserve the native first Bistro clip without stop/play reconstruction, discover and then freeze each actual GUI listener set, and repeat native/observer image/numerical checks. Every fresh run must pass the source-derived feature contract and strict request/console gate. Profiles remain uninstrumented sampling; static Chess and default grid-off/DPR1 quality stay intact. Full profile protocols will be committed after smoke discovery and before full captures, with exact asset/preparation/runtime hashes and this transport/browser lifecycle explicit. Their sampled CPU weights will not be pooled with the earlier Robot primary timing or used as FPS evidence.


### Extended guarded HTTP failure and native ZIP investigation

The five-route `task49-viewer-chess-guarded-correctness-001` used clean tool `5d1f3bc42d1b78d1fa1b1ada84bbe5d0150c6b11`. Original-r176 and prepared-Wasm passed, while external-r176, pure-r186 and prepared-JS failed the same strict initial BIN cancellation check. Completed source/readiness/fixed states and failures remain. Remote-only interception is therefore not established as a reliable solution across this app matrix; the earlier two successes do not qualify the HTTP loading path. No further repeated run is selected to replace this mixed outcome.

The unchanged Viewer already supports local ZIP files: its native file input invokes `SimpleDropzone._onSelect`, `_loadZip`, then `App.load(fileMap)` and `App.view`, with original GLTFLoader/validator and file-map URL resolution. This is a separate supported input workflow, not a repaired asset or relaxed HTTP gate. The next gates use that workflow through `setInputFiles` and preserve the failed HTTP experiment. For animated fixed-history checks, a fresh native page and ZIP reimport replace the earlier in-place HTTP reload; this difference is explicit and is not claimed as another in-place reload test.

The shared container preparation uses the pinned Editor fflate library to write standard stored ZIP entries. Every original referenced file and relative path is unchanged and verified after streaming decode; exact upstream notices and a provenance record are included. Viewer continues to use its own unchanged zip-js decoder. The prepared Chess ZIP has 37 entries (35 assets, one original notice, one provenance record), 29,815,683 bytes, SHA-256 `3c4d6428af22f7e093a70a9bb0ee68266818f13c11559513eb8131c6afee2461`. Bistro has 410 entries (407 assets, two original notices, one provenance record), 546,368,051 bytes, SHA-256 `f1a2bcf7049544081bb3a09586ef8802532a59ca1536029a72cb6ab03ba71141`. Neither ZIP is performance or import-success evidence merely because it exists.

Preparation manifests truthfully record dirty tooling at base `5d1f3bc42d1b78d1fa1b1ada84bbe5d0150c6b11` and the exact preparation-source hash. The finalized helper and focused tests are preserved in `d8cef95bcc906b7e20a248c3f8b3193fcffdfcbd`; browser gates run from its separate clean checkout. An initial Chess preparation selected notices by repository pin too broadly and stopped before ZIP creation. That failure remains in `task49-editor-chess-zip-001`; preparation002 uses exact pinned notice URL identity and retains the notice-selection regression test.

The ZIP gate verifies preparation/entry/archive hashes before input and again after the routes, checks source-derived node/material/decoded-texture/clip relationships, retains dual hardware-renderer image/numerical A/A, and still rejects any failed request or console error. It records that File/Blob input has no mounted HTTP payload requests rather than fabricating HTTP completion coverage. Ordinary Playwright remote mirror/deny policy and chunked server defaults are unchanged; no experimental proxy or remote-only guard is selected for ZIP gates.


### Native ZIP results and cross-page image stability

The two five-route native ZIP gates used clean tooling `d8cef95bcc906b7e20a248c3f8b3193fcffdfcbd` and frozen runtime `85e2c5d500edb0b92ea4ecb997087fded3fed45b`. Neither used the experimental proxy. Original files, native loader/validator behavior and strict error criteria were retained.

`task49-viewer-bistro-zip-correctness-001` passed all five route-local gates and all nine required packaging/same-version cross-route comparisons. Main and axes images and numerical values match at both fixed poses; material/texture comparisons also pass. All thirteen authored clips remain, with play-all confined to functional checks. The three r176→r186 migration comparisons are separate: the two images differ, numerical maxima are approximately `1.80378e-7` and `1.92961e-7`, and material records agree. This is correctness evidence, not CPU headroom or fidelity certification.

`task49-viewer-chess-zip-correctness-001` passed all five route-local gates, including within-route image/numerical A/A and native source relationships, but failed the strict pure-r186→candidate main-image comparison. Geometry/numerical records, material records and axes images agree; JS and Wasm main images agree with each other. An independent pixel audit found four changed pixels out of 839,680 (eight RGB channels, maximum channel difference 13/255, unchanged alpha). No tolerance was relaxed and the failed cross-route gate remains failed.

Fresh pure-r186 controls with the same clean tooling and native ZIP input reproduce both image hashes: `task49-viewer-chess-zip-pure-aa-001` matches the first JS/Wasm image (`72533893c52c8a701e8dc5ee45e7630c15aa70259f3a192c7283f8f87abc38ec`), while `...-002` matches the first pure-r186 image (`c9f465350f03ce8516d766ce79c7e2cc364174bbe9a637046ec260f33de3388b`). Therefore the four-pixel difference cannot be attributed to the candidate or Rust by these records. Cross-page baseline image stability remains unresolved; within-route A/A success does not establish it. Startup prepared counters and possible PMREM code paths are observations, not a demonstrated cause.

The pending diagnostic profiles use their own prospective shipped grid-off scenario and native first-clip history. They must pass their own native/observer and cross-route oracles before sampling. A different scenario cannot retroactively clear the grid-on image failure, and repeated attempts will not be selected merely to obtain a pass.
