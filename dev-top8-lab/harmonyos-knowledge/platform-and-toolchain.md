---
id: platform-toolchain-snapshot
status: historical-snapshot
observed_on: 2026-09-28/29
reviewed_on: 2026-09-30
environment: HarmonyOS PC, HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26
sources:
  - ../BENCH.md
  - ../HARMONYOS-PC-DEV-MAP.md
  - ../POSTRUN-PLAN.md
---

# Platform and Toolchain Field Notes

## Scope and freshness

This is an environment-specific snapshot from a HarmonyOS PC development campaign, with key checks performed on 2026-09-28 and 2026-09-29. It is not a compatibility guarantee for other devices, accounts, SDKs, or future builds. Re-probe before use. Primary project evidence is in [`../BENCH.md`](../BENCH.md), [`../HARMONYOS-PC-DEV-MAP.md`](../HARMONYOS-PC-DEV-MAP.md), and [`../POSTRUN-PLAN.md`](../POSTRUN-PLAN.md); detailed issue inventory is in [`../PPT-OUTLINE-harmonyos-coding.md`](../PPT-OUTLINE-harmonyos-coding.md).

## Environment model

- The tested PC is arm64 and has HarmonyOS-specific sandboxing and package/runtime constraints. Do not assume conventional GNU/Linux behavior merely because a tool reports Linux-like paths or architecture.
- Host-side development tools and device-side app development are separate paths. A host command being available does not prove the HAP toolchain, signing identity, or target device is ready.
- Shells may observe different filesystem roots. In this user's setup, `~` can resolve under `/data/storage/el2/base/files/home`, while user-installed tools may live under `/storage/Users/currentUser`. Use measured absolute paths for `JAVA_HOME`, caches, and scripts.
- `/tmp` may be read-only for a process. Put logs and generated temporary files in a verified writable workspace location.
- IDE installations and sandboxed shell environments do not necessarily share files, SDKs, environment variables, or device access.

## Tool discovery order

For a missing host-side command, check in this order and record each result:

1. System/HNP packages and actual executable paths.
2. HarmonyBrew user-level packages.
3. The OpenHarmonyPCDeveloper ecosystem repositories and porting guides.
4. Project-local or language-specific alternatives.

Do not conclude a tool is absent from one `command -v` result. Conversely, a package listing or executable file does not prove that it launches on this OS.

### What a probe of this machine returned, 2026-09-30

Point-in-time probe, re-run before relying on it. This is the shape of an answer, not a permanent inventory.

- **HNP packages** live at `/data/service/hnp/<name>.org/<name>_<version>/` (the manifest sits at the version-directory level) and are aggregated into `/data/service/hnp/bin`, which is already on PATH. Count: **54 packages**. Notable entries: `clang`, `cmake`, `ninja`, `make`, `binutils`, `gdb`, `gprof`, `git`, `python3`, `hdc`, `hnpcli`, `pkg-config`, `busybox`.
- **Compilers:** only the LLVM family. `clang`/`clang++` **15.0.4**, whose own default target string is `aarch64-unknown-linux-ohos`. No `gcc`, `cc`, or `g++` was on PATH.
- **Runtimes/CLIs:** `python3` 3.12.8, `git` 2.45.2, `hdc`, `hnpcli`.
- **Node on PATH is the Qoder application's Electron runtime:** `~/.qoder/bin/node` → Node **24.11.1** bundled with **Electron 40.1.0**. It reports `process.platform === 'ohos'` and `process.arch === 'arm64'` — it does *not* masquerade as linux. `npm` sits beside it; `npx`, `yarn`, and `pnpm` were absent. See the ledger `PC-07` and the JavaScript lane in [scenario-javascript.md](scenario-javascript.md) for what that means for native modules.
- **The official OpenHarmony Node runtime is also on this machine — it is simply not on PATH.** `[measured 2026-09-30]` the HNP package from the documented `DevNode-OH` channel (`gitcode.com/OpenHarmonyPCDeveloper/DevNode-OH`) is unpacked under `node-ohos/`; its signed variant runs `v24.13.0` and reports `process.platform === 'openharmony'`. The Electron Node reports `ohos`, so the two differ by *runtime*, not by documentation error. See ledger `PC-18`.
- **`java` on PATH is a shim with no JDK behind it.** A working JDK is installed under the HarmonyBrew prefix instead (`~/.harmonybrew/bin/java` → `Cellar/openjdk/26.0.2.1_2`, reported as `openjdk version "26.0.2.1"`), and that prefix is not on PATH by default. This is why `command -v java` alone must never be read as "a JDK exists".
- **Library-channel tools:** `vcpkg` and `lycium` were neither on PATH nor at their usual prefix locations. The channels in the C/C++ lane were reachable as documentation, not as installed tools.
- **Temp paths:** `TMPDIR` was already set to a writable per-user path; `/tmp` itself was **not** writable. Place child-process temp and log paths explicitly rather than trusting the default.

**`gdb` is installed and still cannot attach.** The package list includes `gdb` and `gprof`, yet `ptrace`-based attachment failed (ledger `PC-01`). A binary existing is not evidence that its core function works — always run the smallest real invocation before claiming a tool is usable.

### User-provided and verified HarmonyBrew history

- **Provenance:** On 2026-09-28 the user supplied the lead that JDK could be installed through HarmonyBrew; the assistant then installed and tested it on this machine. Do not claim prior independent discovery.
- **Verified here, 2026-09-28:** HarmonyBrew installed OpenJDK 26.0.2.1 and Maven 3.9.16_1. A real Maven service project built in 21.5 s, JUnit 5 passed 3/3, and `java -jar` ran successfully.
- **Verified here, 2026-09-29:** `jps`, `jcmd VM.version`, `jstack`, `jcmd GC.heap_info`, and JFR-related tooling worked on a live Java process; a thread dump contained 19 threads.
- **Machine-specific paths:** the tested prefix was `/storage/Users/currentUser/.harmonybrew`; the installer and offline archive were under that user's home. Do not assume those artifacts or paths exist on another machine.
- **Path pitfall:** the shell's home and the HarmonyBrew prefix used different roots. Set absolute paths and explicitly add the installed brew `bin` directory to PATH in a new shell.

## External ecosystem discovery

`OpenHarmonyPCDeveloper` was the first-priority ecosystem index in the 2026-09 snapshot. Its repositories included PC tool/runtime aggregation and porting guides, the official OpenHarmony Node 24.13 HNP package, BiSheng JDK packages, Go, Rust, and HDC guidance. Verify repository names, versions, availability, and package suitability before use; this catalog can change.

## Platform hard constraints

`[doc]` One constraint list appears, in near-identical wording, in four upstream files: `contribute/adapter-guide/AI-Agent工具安装.md:46-51`, `三方库贡献指导-Agent-AtomCode版.md:43-48`, `三方库贡献指导-Agent-OpenDesk版.md:40-45`, and `命令行_C_C++三方库贡献指导.md:54-59`. **Four files, one source** — repeated wording is not independent corroboration, so treat this as a single doc-derived claim.

| Constraint | Documented response |
|---|---|
| `/tmp` is read-only | point `TMPDIR` at `$HOME/tmp` |
| HMDFS does not support `ln -sf` overwrite | `rm -f && ln -s` |
| every executable ELF must be signed | the framework ships a `sign-elf` subcommand |
| SELinux restricts `chmod` | record as a platform limit; does not block the build |
| kernel trimmed (`setreuid`, `chroot` unimplemented) | add to an `EXCLUDE_LIST` |
| no `gcc`, only clang | use clang |
| long compiles can be interrupted by system sleep | prevent sleep before starting |

`[measured 2026-09-30]` Two of these were checked independently and agree: `/tmp` is **not** writable (with `TMPDIR` already aimed at a writable per-user path), and no `gcc`/`cc`/`g++` was on PATH. The `sign-elf` subcommand, the kernel trimming, and the SELinux `chmod` behaviour were **not** exercised here — the signing gate we did test is recorded in the ledger as `PC-14`.

**The NDK is already on the machine.** `[measured 2026-09-30]` `ohos-sdk.org/ohos-sdk_26.0.0.18/ohos/` holds `native/llvm/bin` (clang, clang++, llvm-ar, ld.lld, and `aarch64-unknown-linux-ohos-clang` wrappers) and `native/sysroot/usr/include` with the OHOS kit headers. The SDK's own clang runs and reports `clang version 15.0.4`. See [scenario-c.md](scenario-c.md) for the cross-compile variable set that uses it.

## Distribution forms and library channels

`[doc]` Tools arrive in four shapes, and the documentation never states which shape a given item takes:

1. **App-market application** (a HAP you install). The upstream org lists such tools with package names, e.g. DevBox `com.develop.opensource.devbox`, GitNext `com.develop.opensource.gitnext`, DevNode `com.develop.opensource.ohdpc.devnode` (`命令行_C_C++三方库贡献指导.md:31-33` and the parallel agent guides). The inventory page claims 79 applications while its table has 80 rows, and 10 of the gitcode-listed repositories violate the org's own `ohos_` naming rule — read that list as a lead, not a manifest.
2. **HNP package** (command-line tools and executables). Installed under `/data/service/hnp/<name>.org/<name>_<version>/`, aggregated into `/data/service/hnp/bin`, already on PATH — see the measured probe above. `[measured]` `hnpcli --help` and `-v` both fail with `[ERROR][HNP] invalid cmd!`, so its command set is not discoverable that way.
3. **Direct download** from a repository's releases.
4. **Remote install script** — `wget <script>.sh && chmod 777 <script>.sh && ./<script>.sh`, and in at least one place `curl … | sh` (`AI-Agent工具安装.md:116`). Neither is verifiable from the documentation, and the `chmod 777` sits oddly beside the same docs' SELinux warning.

**Library channels `[doc]`:** harmonybrew (claimed "4000+" ported libraries), `ohos_vcpkg` (1000+), and `lycium_plusplus` — whose claimed size contradicts itself in the same file ("几百个" in prose, "200+" in the table, `aggregate/【三方库鸿蒙化迁移工具】汇总.md:12` vs `:19`) and whose link actually points at `ohos_vcpkg`. `[measured 2026-09-30]` **none of them was installed here** — not on PATH, not at the usual prefix locations; only `hnpcli` was present.

**Organisation entry points `[doc]`:** `atomgit.com/OpenHarmonyPCDeveloper` is described as the main entry, `gitcode.com/OpenHarmonyPCDeveloper` is used for other artefacts, and `atomgit.com/oh-tpc` hosts the C/C++ library community. Community channels: `forums.openharmony.cn`, `harmonypc.csdn.net`, and a QQ group. Because two organisations are used without a stated rule, **you cannot tell from the documentation alone which one holds a given tool** — check both.

**Contribution conventions `[doc]`** (useful for identifying what a package *is*): repositories are named `ohos_<project>`; `ohos_`-origin projects follow the upstream version scheme while native projects use `major.minor.patch`; entries are expected to carry a `README.OpenSource` describing upstream name, licence, version, and origin; and the contribution process itself is marked incomplete — the new-repository gate is annotated **"暂无"** and the pipeline is "to be built" (`contribute/共建指导.md:6-15`).

## Native executable decision tree

When an ELF fails to execute, do not treat every `Permission denied` as the same problem:

1. Inspect the ELF architecture and requested program interpreter/loader.
2. Check whether the binary has the platform-required structure/sections (the local evidence uses the `shdr` distinction).
3. Inspect whether the required `.codesign` data is present and valid for the environment.
4. Run the smallest harmless execution test and capture the exact exit code and stderr.

Interpretation from this machine's tests:

- Incompatible/missing ELF structure is not fixed by chmod, changing labels, or creating a hard link; use a native rebuild when possible.
- A structurally suitable binary blocked only by missing `.codesign` may be recoverable with the locally available signing tool and a self-sign workflow.
- A `.codesign` section that exists but is **not 4096-aligned** behaves as if it were absent: `exec` returns `EACCES` and the binary looks "unsigned". This is measured, not inferred — the errno table is in ledger `PC-28`.
- Verify tool names, flags, and signing policy against the current installation before applying that workflow. Never claim self-sign is valid for app-store or retail-device app signing.

The detailed local binary checks and signatures are recorded in the project benchmark. Treat them as host-specific and re-probe before relying on them.

### Symptom routing

| Observed symptom | What it does and does not mean | Where to look |
|---|---|---|
| `exec` fails with `Permission denied` | Several distinct causes share this one message. `chmod`, SELinux labels, and hard links are not diagnoses. | Decision tree steps 2–3; ledger `PC-14` if only `.codesign` is missing. |
| `exec` fails with `No such file or directory` for a Linux ARM64 binary | The requested program interpreter is absent — the host loader is musl-flavoured and there is no glibc `ld-linux-*` — not a missing file. | Decision tree step 1. |
| Tool present in the IDE but absent in the shell | The IDE install and the sandboxed shell have isolated files, SDKs, environment variables, and device access. | The tool discovery order above; never infer system-wide availability from either one. |
| A path or cache resolves under an unexpected root | The tested machine exposed distinct `~` (`/data/storage/el2/base/files/home`) and `/storage/Users/currentUser` roots. | Use measured absolute paths for `JAVA_HOME`, npm cache, and project artifacts. |
| A process cannot write `/tmp` | `/tmp` was read-only for the tested process; it is not a defect in the program. | Put logs and state in a verified writable workspace directory. |
| `command -v <tool>` fails | The tool may exist via HNP, HarmonyBrew, or the official ecosystem, outside PATH. | The tool discovery order above, then execute-test. |

Read this as symptom routing, not as a list of platform defects. The "cannot do X" side of each row is tracked as a pit in the ledger ([`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md)) with a status and a release condition; only the diagnostic and the fallback live here, in the conditional form defined in [maintenance.md](maintenance.md#workaround-entries-are-conditional).

## Host app open actions

Finding `host-app-memory-open`, status `corroborated`, observed_on `2026-09-30`, environment: Qoder host app 0.4.1 (`platform: ohos`, arm64, `installType: user`, production channel) on HarmonyOS PC / HongMeng Kernel 1.13.0.

**Claim:** the host app's memory-management "open file" action hands the path to a system file opener, so on this host it fails for every memory file — the file's existence and permissions are not the cause.

**Observed result:** four main-process warnings at 2026-09-30T02:27:43–02:27:54Z, `[UserMemory] 打开本地记忆失败 {"scope":"project"|"global","errorCode":"LINUX_SYSTEM_OPENER_UNAVAILABLE","errorName":"Error"}`, matching a user-visible dialog at 10:27 (+0800) reading "无法打开记忆文件，请检查路径是否存在且可访问。". Checked the same day: `~/.qoder/memory/` contains 45 `*.md` files and each `~/.qoder/projects/<encoded-workspace>/memory/` exists with `0664` readable files, so the dialog's "path does not exist or is not accessible" wording does not match the state on disk.

**Boundary:** only this action was measured. Nothing here shows whether other open actions in the app fail, and the app bundle is not readable from the sandbox shell, so the missing platform branch is inferred from the error code rather than read from source.

**Next check:** re-click the pencil after a host app update; the pit is gone when a memory file opens instead of the dialog.

- **Preferred path:** read the file at its path — `~/.qoder/memory/<name>.md` for global memory, `~/.qoder/projects/<encoded-workspace>/memory/<name>.md` for project memory (in this user's setup `~` is `/data/storage/el2/base/files/home`) → expect the Markdown text. This is the path that keeps working; work with memory files through it.
- **Failure criterion:** the app dialog "无法打开记忆文件，请检查路径是否存在且可访问。" accompanied by `errorCode":"LINUX_SYSTEM_OPENER_UNAVAILABLE"` in the app main-process log (ledger `PC-27`).
- **Fallback (verified here):** read or edit the file directly by path from a shell or Agent tool; to inspect it in a GUI app, copy it to the user-visible tree (`/storage/Users/currentUser/Download`) and open it from 文件管理 (ledger `PC-27`).
- `measured_on` 2026-09-30 · Qoder host app 0.4.1 · `invalidate_when` the host app version changes, or `PC-27` flips to `已解决` (then retest the preferred path: click the pencil and expect the file to open).

## Device app signing is a separate gate

The benchmark reports that retail-device HAP deployment required a Huawei-issued signing identity and a profile bound to the app's bundle name. It reports a wireless HDC → install → launch → UI interaction workflow; screenshots corroborate the running/clicked UI, but the available replay log does not reproduce deployment and reports a failed rebuild before signing an existing artifact. Host ELF self-signing is not a substitute for HAP signing. Protect signing passwords, private keys, and profile contents; never expose them in logs or generated references.

## Toolchain selection

- Prefer official HarmonyOS/DevEco tools for ArkTS/HAP work; inspect the project configuration and installed CLI capabilities first.
- For C/C++ and scripting toolchains, validate actual build and run behavior on the PC rather than assuming upstream Linux binaries are compatible.
- For Java, the HarmonyBrew JDK path above was tested locally; do not infer every JDK bottle or JNI library behaves identically.
- For Node, distinguish a desktop/Electron Node shim from the official OpenHarmony Node binary; verify `process.platform`, ABI, package install behavior, and execution separately.

## Evidence dates

All versions and performance numbers belong to the 2026-09-28/29 test snapshot. Re-run the probes after OS, SDK, package, or signing changes and update the source benchmark before changing a claim from historical to current.