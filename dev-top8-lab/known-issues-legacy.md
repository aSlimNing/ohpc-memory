---
id: known-issues
status: superseded
observed_on: 2026-09-28/29
reviewed_on: 2026-09-30
superseded_by: harmonyos-knowledge/platform-and-toolchain.md, harmonyos-knowledge/scenario-recipes.md, HARMONYOS-PC-ISSUES.md
environment: HarmonyOS PC host and paired HarmonyOS device; scenario-specific
sources:
  - BENCH.md
  - POSTRUN-PLAN.md
  - HARMONYOS-PC-DEV-MAP.md
  - PPT-OUTLINE-harmonyos-coding.md
---

# Known Issues, Workarounds, and Open Questions

> **Superseded 2026-09-30 — kept for provenance only, and moved out of the knowledge base on the same day.** This file mixed knowledge, workarounds, and pits in one place. It was split three ways: diagnostics and symptom routing → [`harmonyos-knowledge/platform-and-toolchain.md`](harmonyos-knowledge/platform-and-toolchain.md); conditional fallbacks (preferred path / failure criterion / fallback) → [`harmonyos-knowledge/scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md); the pits themselves, each with a status and a release condition → [`HARMONYOS-PC-ISSUES.md`](HARMONYOS-PC-ISSUES.md). The unconditional "cannot do X" statements below are no longer current policy — read the conditional form in the destination files instead, and do not cite this file as a source of platform limits.

This is the 2026-09-28/29 local test ledger, not a platform-wide compatibility matrix. Unless a row links direct replay output, historical issue details are report-only and were not freshly reproduced during knowledge-base setup. Read the source benchmark and re-run the relevant case before presenting a fix as current: [`BENCH.md`](BENCH.md), [`POSTRUN-PLAN.md`](POSTRUN-PLAN.md), [`HARMONYOS-PC-DEV-MAP.md`](HARMONYOS-PC-DEV-MAP.md), and [`PPT-OUTLINE-harmonyos-coding.md`](PPT-OUTLINE-harmonyos-coding.md).

## Execution and environment gates

| Symptom / boundary | Interpretation | Tested response or status |
|---|---|---|
| ELF starts with `Permission denied` | Multiple causes can share this symptom; check interpreter/loader, ELF structure, then `.codesign` separately. | Rebuild locally for incompatible ELF structure; if structure is suitable and only signature data is missing, verify the installed binary-signing workflow. `chmod` is not a diagnosis. |
| Linux ARM64 binary fails on HarmonyOS PC | Architecture alone does not prove ABI/loader compatibility; host may use musl rather than glibc. | Prefer a native build or verified platform package. Confirm the actual loader and error before assigning cause. |
| Tool is present in IDE but absent in shell | IDE and shell may have isolated installations and environment. | Use the matching CLI or run inside the IDE-provided environment; don't infer system-wide availability. |
| A path/cache resolves under the wrong root | The tested environment exposed distinct `~` and `/storage/Users` roots. | Use the measured absolute path for Java, npm cache, and project artifacts. |
| Service fails writing `/tmp` | `/tmp` was not writable for the tested process. | Put log and state paths in a verified writable workspace directory. |
| `command -v` fails for a tool | It may exist in HNP, HarmonyBrew, or the official ecosystem outside PATH. | Search the system/HNP, user-level package channel, and official ecosystem; then test execution. |

## ArkTS / HAP deployment

- Huawei-issued app signing identity and a matching profile were required for the tested retail device.
- `9568257 fail to verify pkcs7`: the certificate/signing chain was rejected; use the proper Huawei-issued signing identity.
- `9568329 verify signature failed`: profile and `bundleName` did not match; align them and regenerate/reconfigure signing materials.
- `9568393 verify code signature failed`: code signing was not enabled; the tested flow required `-signCode 1`.
- USB access was blocked by the tested device/host connection arrangement; wireless HDC worked.
- SDK files were read-only and `phone.json` was missing in the tested installation; local mirroring/links and filling the missing SDK metadata restored the required syscap inputs.
- **Open:** a complete command-line breakpoint-debugger client for the available attach path was not established.

Never include passwords, private keys, or profile contents in logs or knowledge files. Host binary self-signing and retail HAP signing are different gates.

## C / C++ debugging

- **Reported limitation:** sandbox policy blocked `ptrace`; GDB could not attach and LLDB attach failed.
- **Reported limitation:** usable core-dump output was blocked by the configured read-only path.
- **Reported limitation:** LeakSanitizer was unsupported in this environment.
- **Workaround:** compile ASAN/UBSAN instrumentation into test builds; use application-level signal reporting or device-side profiler alternatives where appropriate.
- CMake did not recognize HarmonyOS as a built-in platform in the tested setup; a local platform file was used. A `/proc/meminfo` parse warning occurred but did not block the tested build.

## Java and package path

- No ready-to-use system JVM was available in the tested baseline; a `java` shim alone did not establish that a JDK existed.
- HarmonyBrew resolved the gap in this user's test setup. This knowledge was first supplied by the user on 2026-09-28 and then independently exercised locally; retain that provenance.
- The shell home and HarmonyBrew prefix were different roots. Set `JAVA_HOME`/PATH to the verified absolute installation path.
- Do not generalize JNI compatibility from successful Java bytecode execution; inspect and execute-test native libraries separately.

## Node and npm

- npm packages declaring unsupported `ohos` platform keys could fail with `Unsupported platform: ohos arm64 LE` and roll back installation.
- `npx` was unavailable in the tested shell; invoke project-local binaries with Node directly.
- Downloaded official OpenHarmony Node required the tested local execution-signing path before it ran; this is not the same as app signing.
- Electron Node shim behavior differed from the official runtime and could mislead platform detection. Record runtime path/version/platform.
- npm cache needed an explicit absolute path in the tested environment.
- `Failed to set thread qos` was noisy stderr during tested commands; classify as non-blocking only after verifying command status and behavior.

## Python

- pip and the intended interpreter could resolve different installation roots, producing `ModuleNotFoundError` after a seemingly successful install.
- Install into a known project-local target and set explicit `PYTHONPATH` when that avoids root ambiguity.
- `ptrace` restricted external debugger attachment; in-process `pdb` worked.
- NumPy/scientific native wheels were not verified; do not infer compatibility from pip metadata or package listing.

## Web front end

- Native npm build dependencies (including the tested esbuild/Rollup/SWC/tailwind-oxide cases) lacked a usable HarmonyOS artifact or did not execute directly.
- Local esbuild compilation plus `ESBUILD_BINARY_PATH` unblocked the tested Vite path; Rollup WASM and webpack pure JS were alternatives.
- Omitting `ESBUILD_BINARY_PATH` broke both Vite build and npm tests in the tested project; persist required environment in project scripts.
- One webpack path returned HTTP 200 while the built page still had three defects: missing injection, absent HTML output, and CSS Modules named-export mismatch. Execute the artifact and assert the DOM/application behavior.
- Source maps retained source/env expressions in tested output; inspect and remove maps or sensitive mappings before release.
- jsdom needed `runScripts` for the intended browser-context execution; otherwise `window.eval` did not exercise the page as expected.
- MCP network capture missed a favicon 404 in one test; cross-check with server logs and a negative control.

## Data, Git, and shared infrastructure

- Redis failed when configured to log under read-only `/tmp`; use a workspace path.
- SQLite CLI was absent, while Python's standard library was usable.
- PostgreSQL/MySQL server availability was not verified; keep this explicitly unknown.
- Git reported dubious ownership on hmdfs; configure safe.directory narrowly for the repository that needs it. Avoid broad trust settings unless the threat model explicitly permits them.
- No container runtime was present in the tested environment; process isolation is not equivalent to containers.
- `ptrace` restriction affects more than C/C++ debugging; consider in-process or device-side diagnostics where feasible.
- System path visibility can vary between shells; probe rather than relying on remembered visibility.

## Cross-cutting quality traps

- Build success is not artifact correctness; HTTP 200 is not successful frontend execution.
- A self-check can silently accept the wrong data shape or return false green. Test positive and negative inputs and assert the actual observable behavior.
- A collector returning no errors does not prove it observed the event. Add a known marker and compare against an independent source.
- Automated green checks prove only the exercised mechanics, not usability or human-perceived quality.

## Stale replay script warning

[`reverify.sh`](reverify.sh) is not a safe or authoritative recipe: it contains source edits, build-output removal, process termination, Git staging/commit side effects, and hard-coded signing-related values. Its final log shows the HAP build failed before an existing artifact was signed, and it expects an empty device target rather than exercising the later wireless-device workflow. Do not execute or copy it as a verification recipe. Extract only specific harmless commands after reviewing them individually; keep credentials out of all reusable knowledge.

## Scope and ledger counting

The source outline groups 35 cross-cutting problems into categories; per-language lists repeat shared issues, so adding every row across those lists overcounts the unique ledger. Keep the canonical unique count tied to a refreshed benchmark, not a sum of repeated scenario rows. The project benchmark also contains old conclusions superseded by later sections; cite the dated section and underlying evidence rather than repeating its summary headline blindly.