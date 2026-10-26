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
