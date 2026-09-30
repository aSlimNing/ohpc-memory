---
id: scenario-recipes
status: mixed-evidence
observed_on: 2026-09-28/29
reviewed_on: 2026-09-30
environment: HarmonyOS PC plus paired HarmonyOS device; versions vary by scenario
sources:
  - ../BENCH.md
  - ../POSTRUN-PLAN.md
  - ../reverify-final.log
---

# Scenario Recipes and Historical Results

These are outcomes reported from this user's 2026-09-28/29 test environment, not universal guarantees. Before copying versions, flags, or timings, inspect the current project and verify locally. Primary references: [`../BENCH.md`](../BENCH.md), [`../POSTRUN-PLAN.md`](../POSTRUN-PLAN.md), and [`../PPT-OUTLINE-harmonyos-coding.md`](../PPT-OUTLINE-harmonyos-coding.md); raw outputs include [`../reverify-final.log`](../reverify-final.log) and experiment-specific logs/reports. Evidence levels differ by item, as noted below.

**Important replay caveat:** [`../reverify-final.log`](../reverify-final.log) reports `BUILD FAILED` for the HAP rebuild and then successfully signs/verifies an already existing 102,448-byte HAP. It does not prove that the replay built that artifact. The later benchmark reports an earlier successful 29-second HAP build and successful wireless install/launch/UI clicks; screenshots (`../device-app-foreground.jpeg`, `../device-app-clicked.jpeg`; local only, withheld from the repository because they are device captures) corroborate visible UI state, but no raw HDC command transcript or fresh checked-in ArkTS project source was found in the audit. Treat the HAP build/deploy facts as **report-only, with screenshot corroboration for UI state**, not as independently replayed by that script.

## How the fallbacks are written

Every scenario below ends with a conditional block. Run the **preferred path** first; read the **fallback** only after the **failure criterion** has actually been observed. A workaround that is not gated on an observed failure will outlive its pit and keep later Agents on the long road (see [maintenance.md](maintenance.md#workaround-entries-are-conditional)). The "cannot do X" side of each case is tracked, with a status and a release condition, in the ledger [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md).

Earlier revisions of this file stated the same limits as unconditional claims ("LeakSanitizer was unsupported", "`ptrace` was unavailable", and so on). Those statements are superseded by the conditional blocks here; the pits they described now live in the ledger. Do not restate them as properties of the platform.

## Evidence map

- **Reproduced by the 2026-09-29 host replay:** Java JAR execution; Vite build/preview HTTP responses (not browser behavior); webpack build plus jsdom render assertion; static preview; basic Node API; Flask response; C/C++ smoke test; Redis/SQLite read-write; Git activity. See [`../reverify-final.log`](../reverify-final.log).
- **Separate direct artifacts:** Java test report at `../../java-probe/order-service/target/surefire-reports/com.bench.order.OrderServiceTest.txt` (local only, build output; regenerate by running the Maven test); Node persistence evidence in `../../node-fullstack-lab/`; broader frontend notes in `../../frontend-toolchain-lab/RESULTS.md`.
- Claims labeled **Source reports** below are report-only unless their bullet gives an independent artifact or replay. Do not promote them to reproduced without rerunning the exact step.

## ArkTS / HAP — native app build and device loop

- **Benchmark reports:** an incremental build completed in 29 s and signing/HAP verification succeeded. Exact task counts and output sizes vary across report snapshots and should not be treated as stable identifiers.
- **Benchmark + screenshot evidence:** wireless HDC install, `aa start`, and UI interaction were reported; screenshots corroborate the foreground app and counter change 0→3. The current replay log does not independently reproduce this deployment flow.

Signing rejection codes observed in the tested flow:

| Code | Message | Meaning and action |
|---|---|---|
| `9568257` | `fail to verify pkcs7` | The certificate/signing chain was rejected. Use the proper Huawei-issued signing identity. |
| `9568329` | `verify signature failed` | Profile and `bundleName` did not match. Align them and regenerate/reconfigure the signing material. |
| `9568393` | `verify code signature failed` | Code signing was not enabled; the tested flow required `-signCode 1`. |

- **Preferred path:** inspect `build-profile.json5` and signing configuration → build → verify HAP signing → install over the available device channel → launch → interact and assert visible state → collect app/device logs. Expect the install to report success and the launched app to become the foreground window.
- **Failure criterion:** a signing rejection `9568257` / `9568329` / `9568393`, or the device not enumerating over USB.
- **Fallback (verified here):** pair and deploy over **wireless HDC** (ledger `PC-05`). If SDK files are read-only and `phone.json` is missing, mirror/link the SDK and supply the missing syscap metadata (ledger `PC-06`) — hmdfs needs `rm -f && ln -s`, not `ln -sf`.
- `measured_on` 2026-09-28/29 · `invalidate_when` SDK/DevEco version, signing identity, device, or host↔device connection changes.
- **Not established:** a command-line breakpoint-debugger client for the available attach path (ledger `PC-04`). Retail deployment requires Huawei-issued app-signing material and a profile matching the bundle name; keep the app-signing path distinct from host ELF self-signing.

## C / C++ — native compile, execution, and sanitizers

- **Source reports:** clang 15 direct build took 299 ms; CMake + Ninja took 1,959 ms; both produced the same 18,816-byte test artifact.
- **Source reports:** the test executable ran successfully (`native ok`, exit code 0). ASAN detected a heap-buffer-overflow and identified the source location.
- **Preferred path:** compile the actual target for the host/device ABI → run a harmless smoke test → build a sanitizer-instrumented variant → deliberately exercise a memory bug in a controlled test to prove diagnostics work. Expect `native ok` and exit code 0, then a named source location from ASAN.
- **Failure criterion:** `gdb`/`lldb` attach returns `ptrace: Permission denied` or an LLDB `'A' packet error`; no core file is produced; LeakSanitizer refuses to run.
- **Fallback (verified here):** compile ASAN/UBSAN instrumentation into test builds; use application-level signal reporting or device-side profiler alternatives. Ledger `PC-01` (attachment), `PC-02` (core dumps), `PC-03` (LeakSanitizer).
- `measured_on` 2026-09-28/29 · `invalidate_when` sandbox policy, kernel, toolchain, or runtime library version changes.
- **Note:** CMake did not recognize HarmonyOS as a built-in platform in the tested setup; a local platform file was used. A `/proc/meminfo` parse warning occurred but did not block the tested build.

## Java — service project and diagnostics

- **Source reports:** HarmonyBrew OpenJDK 26.0.2.1 and Maven 3.9.16_1; Maven packaging took 21.5 s; JUnit 5 passed 3/3; `java -jar` produced the expected service output.
- **Source reports:** live-process `jps`, `jcmd VM.version`, `jstack` (19 threads), `jcmd GC.heap_info`, and JFR diagnostics worked.
- **Preferred path:** install/select an explicit JDK → set absolute `JAVA_HOME` and PATH → build a real Maven/Gradle project → run unit tests → launch the packaged service → assert behavior → capture a thread/heap diagnostic from a live process.
- **Failure criterion:** `command -v java` resolves to a shim while no JDK is installed (a shim alone does not prove a JDK exists); a JNI native library fails to load.
- **Fallback (verified here):** install the JDK through HarmonyBrew (ledger `PC-13`, resolved) and set absolute `JAVA_HOME`/PATH in a new shell — the shell home and the brew prefix are different roots. Validate JNI libraries independently against host ELF and loading restrictions; do not generalize JNI compatibility from successful bytecode execution.
- `measured_on` 2026-09-28/29 · `invalidate_when` JDK/Maven bottle or the HarmonyBrew prefix changes.

## Node.js — official runtime and JS service

- **Source reports:** official OpenHarmony Node 24.13.0 ran after applying the tested local execution-signing workflow; Electron shim Node 24.11.1 was a separate runtime and reported different platform behavior.
- **Source reports:** an Express 5 project installed 69 packages in about 3 s, passed API assertions, retained data across restart, and produced a `.cpuprofile` with `--cpu-prof`.
- **Preferred path:** identify which Node executable is running → record `process.version`, `process.platform`, and architecture → install a small real project → exercise API and restart persistence → generate and inspect a CPU profile.
- **Failure criterion:** `Unsupported platform: ohos arm64 LE` with an install rollback; `npx` unavailable in the shell; the downloaded official Node ELF refuses to execute before local signing.
- **Fallback (verified here):** prefer pure-JS dependencies; use `--ignore-scripts` only when safe for that package; invoke `node_modules/.bin/<tool>` with Node directly when `npx` is unavailable; apply the local execution-signing path to the official runtime ELF (ledger `PC-14`). For native build dependencies see the Web section and ledger `PC-07`.
- `measured_on` 2026-09-28/29 · `invalidate_when` Node version, npm registry/lockfile, or signing toolchain changes.
- **Note:** `Failed to set thread qos` appeared as noisy stderr during tested commands; classify it as non-blocking only after checking the command's status and behavior. Record the runtime path/version/platform, because the Electron shim can mislead platform detection. The npm cache needed an explicit absolute path in the tested environment.

## Python — service and in-process diagnostics

- **Source reports:** Python 3.12.8, pip 24.3.1, Flask 3.1.3; a real Flask response returned `{"msg":"py ok","ok":true}`.
- **Source reports:** `pdb` hit an in-process breakpoint; `cProfile`/`pstats` produced cumulative-time statistics.
- **Preferred path:** bind pip to the intended interpreter (`python3 -m pip`, not `command -v pip`) → install into an explicit project-local target if roots differ → set `PYTHONPATH` → launch a real service and assert its response → prove a breakpoint/profile is collected.
- **Failure criterion:** `ModuleNotFoundError` after an apparently successful install (pip and the intended interpreter resolved different installation roots); external debugger attachment fails on `ptrace`.
- **Fallback (verified here):** install with an explicit `--target`/project-local prefix and set `PYTHONPATH`; use in-process `pdb` instead of an external debugger (ledger `PC-01`). Scientific/native wheel compatibility is unverified — ledger `PC-10`; do not infer it from pip metadata or a package listing.
- `measured_on` 2026-09-28/29 · `invalidate_when` interpreter/pip version or the community wheel index changes.

## Web front end — multiple build paths and real browser execution

- **Source reports:** Vite built after using a locally compiled esbuild and `ESBUILD_BINARY_PATH`; a preview was served and rendered/used in a browser.
- **Source reports:** webpack's pure-JS path produced a 233 KB build in 10.4–11.5 s after repairing three runtime defects; jsdom smoke tests executed the output. Rollup WASM ran in 15.5 s.
- **Source reports:** vitest 10/10, ESLint 0 errors, TypeScript build 0 errors; browser checks reported no console errors, six network requests returned 200, and DCL was 116 ms.
- **Preferred path:** fix the native build dependency path or use a compatible WASM/pure-JS option → make required environment variables part of repeatable project scripts → build → execute the built output in a real browser or correctly configured jsdom → assert behavior and inspect console/network/build artifacts.
- **Failure criterion:** a 200 response while the page is broken — the tested webpack path had three defects at once (missing injection, absent HTML output, CSS Modules named-export mismatch); jsdom without `runScripts` does not exercise browser-context scripts; source maps still contain source/env expressions.
- **Fallback (verified here):** locally compiled esbuild plus `ESBUILD_BINARY_PATH` for the Vite path, Rollup WASM, or the webpack pure-JS path (ledger `PC-07`). Omitting `ESBUILD_BINARY_PATH` broke both the Vite build and npm tests in the tested project, so persist required environment in project scripts. Inspect source maps for leaked source/env text before release.
- `measured_on` 2026-09-28/29 · `invalidate_when` the front-end toolchain version, npm registry/lockfile, or an upstream native artifact for HarmonyOS changes.
- **Note:** MCP network capture missed a favicon 404 in one test; cross-check collection against server logs and a negative control (ledger `PC-11`).

## Data services — Redis and SQLite

- **Source reports:** Redis 8.4.0 responded to `INFO`, slowlog, and database-size checks.
- **Source reports:** SQLite query planning changed from a table `SCAN` to `SEARCH ... USING INDEX` after adding an index.
- **Preferred path:** start Redis with its log file in a writable project location → query service state and data → restart and verify persistence if configured; for SQLite, assert query plans/results (`SCAN` → `SEARCH ... USING INDEX`).
- **Failure criterion:** Redis fails when configured to log under read-only `/tmp`; `sqlite3` is absent from PATH.
- **Fallback (verified here):** point Redis log/state at a verified writable workspace path; use the Python stdlib `sqlite3` when the CLI is absent.
- `measured_on` 2026-09-28/29 · `invalidate_when` the service version or the writable-path policy changes.
- **Not verified:** PostgreSQL/MySQL server availability (ledger `PC-09`). Do not label them unavailable or available without a real install/build/run test. No container runtime was present in the tested environment (ledger `PC-08`).

## Cross-cutting Git and device observability

- **Source reports:** Git operations including local bare-repository push/pull worked after addressing hmdfs ownership trust.
- **Source reports:** device-side `hilog`, `hidumper`, `hitrace`, `hiprofiler`, UITest, and wireless HDC workflows were exercised. A trace was pulled back to the host; memory/CPU and UI behavior were observable with the tested device tooling.
- **Preferred path:** capture the target app identity before taking screenshots → collect logs, one relevant metric, a short trace, and an interaction result → retrieve artifacts → verify they correspond to the intended app and time window.
- **Failure criterion:** Git reports `fatal: detected dubious ownership` on hmdfs; a screenshot shows an app other than the intended one.
- **Fallback (verified here):** configure `safe.directory` **narrowly** for the repository that needs it; avoid broad trust settings unless the threat model explicitly permits them. Discard accidental personal-content captures, including any copied into `Download`. Sandboxed host-side attachment limits persist even when device-side observability tools work (ledger `PC-01`).
- `measured_on` 2026-09-28/29 · `invalidate_when` the Git version, the filesystem/ownership model, or device tooling changes.
