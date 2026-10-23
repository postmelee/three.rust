# Task #29 implementation plan

Add a browser-safe clock probe and explicit timing-policy validation. serve(port, {isolated}) sends isolation headers only when requested. Fox runner records requested/observed isolation and timer deltas before warmup for every page; hash new measured inputs. The Mac wrapper uses one declared timing mode across all Fox phases. Existing default remains ordinary.

Split diagnostic inputs/evaluation without adding probes to main frames. A new evidence reader consumes summaries and recorded clocks, preserving legacy comparison output, and reports matched-JS ratios separately. Generate README table from archived summary with a check mode used in CI. Do not rewrite historical raw files. Validate rejection paths, browser isolation and real Fox correctness, then document actual checks and remaining hardware qualification.
