---
id: scenario-c
status: mixed-evidence
observed_on: 2026-09-28/30
reviewed_on: 2026-09-30
environment: HarmonyOS PC (HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26)
sources:
  - ../BENCH.md
  - doc citations C-* below (OpenHarmonyPCDeveloper/docs @a16b9a1f)
---

# C / C++ Scenario Lane

**Scope.** Three jobs, and the upstream documentation only really covers the second one:

- **A. Compile native code with the compiler already on the box.** Measured working.
- **B. Port a C/C++ third-party library** ("三方库"). The docs' model here is an AI-agent framework that runs **on the device** — *not* a cross-compile toolchain.
- **C. Cross-compile from somewhere else, or bring up a GUI stack** (Qt, Go, Pascal). Mostly documented elsewhere or not at all.

## How to read the labels here

- `[measured]` — executed on this machine, date given.
- `[doc]` — read from the upstream docs at the pinned commit; **not** executed here.

### Doc citations

Upstream: `https://gitcode.com/OpenHarmonyPCDeveloper/docs` @ `a16b9a1f2fc63fddb31d0d4804ef10bda57e2ddb` (2026-09-23). Local copy read at `ohpc-docs/`.

| Alias | File (relative to the repo root) |
|---|---|
| `C-adapt` | `contribute/adapter-guide/c_c++移植适配指导.md` |
| `C-cmdlib` | `contribute/adapter-guide/命令行_C_C++三方库贡献指导.md` |
| `C-atom` | `contribute/adapter-guide/三方库贡献指导-Agent-AtomCode版.md` |
| `C-desk` | `contribute/adapter-guide/三方库贡献指导-Agent-OpenDesk版.md` |
| `C-agent` | `contribute/adapter-guide/AI-Agent工具安装.md` |
| `C-tools` | `aggregate/【三方库鸿蒙化迁移工具】汇总.md` |
| `C-cli` | `aggregate/【命令行】开源命令行汇总.md` |
| `C-qt` | `aggregate/【跨平台框架】Qt资源汇总.md` |
| `C-pascal` | `aggregate/other_language/【Pascal语言】FPC交叉编译环境搭建.md` |
| `JS-ports` | `contribute/adapter-guide/Nodejs三方库鸿蒙化移植及贡献指南.md` |

## A. Compiling with the on-box clang

- `[measured 2026-09-30]` **Only the LLVM family is present.** `clang`/`clang++` **15.0.4** live in `/data/service/hnp/bin`. No `gcc`, `cc`, or `g++` was on PATH. The doc set says the same in prose: HarmonyOS PC is `aarch64 + musl` with "no `gcc`, only clang" (C-atom:15, C-desk:15).
- `[measured 2026-09-30]` Alongside clang, HNP provides `cmake`, `ninja`, `make`, `llvm-ar`, `ld.lld`, `llvm-nm`, `llvm-objcopy`, and `pkg-config`.
- `[measured]` clang's own default target string is **`aarch64-unknown-linux-ohos`**. That is *not* the string you pass to `--target` for cross-compiling (see below) — do not confuse the two.
- `[measured 2026-09-28/29]` a direct clang build took 299 ms; CMake + Ninja took 1,959 ms; both produced the same 18,816-byte artifact, which ran and printed `native ok` with exit code 0. ASAN detected a deliberate heap-buffer-overflow and named the source location.
- `[measured 2026-09-28/29]` CMake did not recognize HarmonyOS as a built-in platform; a local platform file was used. A `/proc/meminfo` parse warning appeared and did not block the build.

**Preferred path**

```sh
clang --version && cmake --version && ninja --version
```

Expect `clang version 15.0.4` and real CMake/Ninja versions. **Failure criterion:** `gcc`/`cc` reported missing, or a build system that insists on GCC. **Fallback (verified here):** force the LLVM toolchain explicitly — `CC=clang CXX=clang++`. `measured_on 2026-09-28/30` · `invalidate_when` the HNP package set or `ohos-sdk` version changes.

## B. Porting a C/C++ library — and the documentation gap

**This is the important finding: the C/C++ documents do not contain a cross-compile recipe.** Verified by searching the whole doc set — the target triple `aarch64-linux-ohos`, `${OHOS_NDK}/native/llvm/bin/clang`, and `--sysroot` appear in **exactly one file, and it is the Node.js porting guide**, not any C/C++ guide. Those files use a different model:

- `[doc]` The model is an **on-device AI-agent framework** ("OpenHarmony Compile Agent"), working under `/storage/Users/currentUser/${AGENT_NAME}/`, building natively on the aarch64 device with the local clang (C-cmdlib:104, C-atom, C-desk).
- `[doc]` Installation is a remote script: `wget <setup_wizard>.sh && chmod 777 ./setup_wizard.sh && ./setup_wizard.sh` (C-agent:130, C-atom:57), and one place uses a pipe-to-shell (`curl … | sh`, C-agent:116). The same install is shown *without* the pipe elsewhere in the same repository — an inconsistency you have to resolve yourself.
- `[doc]` Note the self-contradiction: these same files require `chmod 777` on a downloaded script while also stating that SELinux restricts `chmod` (C-agent:49, C-atom:46).
- `[doc]` One setup step installs a shell alias that rewrites cmake for every later call: `alias cmake='cmake -DCMAKE_INSTALL_PREFIX=$DEFAULT_PREFIX'` (C-cmdlib:147). It will hijack invocations that need `-G Ninja` or a toolchain file.
- `[doc]` `C-adapt` takes a HAP/mobile view (it discusses DevEco Studio, `entry/libs/armxx/`, and 32-bit `armeabi-v7a`) and says CMake support needs hand-written `CMakeLists.txt` (C-adapt:15, 19, 21, 30). On an aarch64-only PC the 32-bit ABI discussion does not apply.

**So the cross-compile parameters have to come from elsewhere.** The only spelled-out version in the doc set is the Node one, and it is generic enough to reuse (JS-ports:374-394):

```sh
export OHOS_NDK="/path/to/ohos-sdk"
export TARGET_TRIPLE="aarch64-linux-ohos"          # NOT aarch64-linux-gnu, NOT android
export CC="${OHOS_NDK}/native/llvm/bin/clang"
export CXX="${OHOS_NDK}/native/llvm/bin/clang++"
export CFLAGS="--target=${TARGET_TRIPLE} --sysroot=${OHOS_NDK}/native/sysroot"
export CXXFLAGS="--target=${TARGET_TRIPLE} --sysroot=${OHOS_NDK}/native/sysroot"
export LDFLAGS="--target=${TARGET_TRIPLE} --sysroot=${OHOS_NDK}/native/sysroot"
```

Two details from that doc that are easy to get wrong: the triple must be exactly `aarch64-linux-ohos` — "get it wrong and the artifact will not run" (JS-ports:394); and **all three** of `CFLAGS`, `CXXFLAGS`, `LDFLAGS` must be set, because C++ addons are `.cpp`/`.cc` and `clang++` will not inherit `--target`/`--sysroot` from `CFLAGS` alone (JS-ports:392).

`[measured 2026-09-30]` **The recipe is actionable on this machine.** The installed SDK is at `/data/service/hnp/ohos-sdk.org/ohos-sdk_26.0.0.18/ohos/`, and it contains `native/llvm/bin` (`clang`, `clang++`, `llvm-ar`, `ld.lld`, plus `aarch64-unknown-linux-ohos-clang` wrappers) and `native/sysroot/usr/include` with the OHOS kit headers (`AbilityKit`, `BasicServicesKit`, `CryptoArchitectureKit`, …). So `OHOS_NDK` points at that `…/ohos-sdk_26.0.0.18/ohos` directory, and `--sysroot=${OHOS_NDK}/native/sysroot` resolves. Running the SDK's own clang reported `clang version 15.0.4`, target `aarch64-unknown-linux-ohos` — so the NDK compiler is not only present but executes.

`[doc]` `export OS=ohos` is useless here — gyp decides the target from `process.platform` and `target_arch`, not from `OS` (JS-ports:406). Use `--target_arch` / `--dest_cpu`, or edit the build file.

## Platform hard constraints

`[doc]` These six appear as a list in four files with near-identical wording — `C-agent:46-51`, `C-atom:43-48`, `C-desk:40-45`, `C-cmdlib:54-59`. **Four files, one source:** identical wording repeated is not four independent confirmations, so this table counts as a single doc-derived claim.

| Constraint | Documented response | Cite |
|---|---|---|
| `/tmp` is read-only | point `TMPDIR` at `$HOME/tmp` | C-agent:46, C-cmdlib:54 |
| HMDFS does not support `ln -sf` overwrite | `rm -f && ln -s` | C-agent:47, C-cmdlib:55 |
| every executable ELF must be signed | framework ships a `sign-elf` subcommand | C-agent:48, C-atom:45 |
| SELinux restricts `chmod` | record as a platform limit; does not block the build | C-agent:49, C-atom:46 |
| kernel trimmed (`setreuid`, `chroot` unimplemented) | add to an `EXCLUDE_LIST` | C-agent:51, C-cmdlib:59 |
| no `gcc`, only clang | use clang | C-atom:15, C-desk:15 |

Plus: long compiles can be interrupted by the system sleeping — turn that off first (C-agent:105, C-cmdlib:182).

`[measured 2026-09-30]` independently consistent with two of these: `/tmp` was **not** writable, with `TMPDIR` already pointing at a writable per-user path; and no `gcc`/`cc`/`g++` was on PATH. The `sign-elf` subcommand, the `setreuid`/`chroot` trimming, and the SELinux `chmod` behaviour were not exercised here — see ledger `PC-14` for the signing gate we did test.

## C. Qt, Go, Pascal

- `[doc]` **Qt:** the QPA plugin differs by edition — commercial builds use `libqohos.so`, the open-source build uses `libplugins_platforms_qopenharmony.so` (C-qt:72, 74). Both names appear only in this one file, with no second source in the doc set. The Qt template download points at an internal host (`http://codereview.qtcompany.cn:29416/…`, C-qt:82), which is not publicly reachable.
- `[doc]` **Pascal/FPC:** the documented flow requires a **Windows / x86-64 host** and a `Build.bat` (C-pascal:3, 13) — it is a cross-compilation environment set up *on Windows*, not something that runs on the PC itself. FPC version **3.3.1** is given (C-pascal:16, 18).
- `[doc]` **Go:** no Go compiler version appears in these files.

## Library channels

`[doc]` Three channels are named, and the numbers do not agree with each other (`C-tools`):

| Channel | Doc claim | Where it lives |
|---|---|---|
| harmonybrew | "4000+" ported libraries (C-tools:21) | `atomgit.com/Harmonybrew` (per the JS doc set) |
| ohos_vcpkg | 1000+ (C-tools:20) | merged toward `microsoft/vcpkg` |
| lycium_plusplus | **"几百个"** in one line (C-tools:12) but **"200+"** in the table (C-tools:19) — the doc contradicts itself, and the link given for it actually points at `ohos_vcpkg` | no upstream project stated (C-tools:12) |

`[doc]` A separate `lycium` script lives under `openharmony-sig/tpc_c_cplusplus` (C-adapt:17); whether it is the same thing as `lycium_plusplus` is not clarified.

`[measured 2026-09-30]` **None of these is installed here.** `vcpkg` and `lycium` were neither on PATH nor at their usual prefix locations; only `hnpcli` was present. The channels are reachable as documentation, not as ready tools.

## Post-run

- `[measured]` `gdb` and `gprof` are installed in HNP, yet `ptrace`-based attachment fails (ledger `PC-01`). No usable core dump (ledger `PC-02`); LeakSanitizer unavailable (ledger `PC-03`).
- `[measured]` ASAN **does** work and names source locations — that is the practical memory-bug path here.
- `[measured]` device-side `hilog`, `hidumper`, `hitrace`, and `hiprofiler` were exercised for observability.

## Doc-versus-measured conflicts

| Item | Doc says | Measured here |
|---|---|---|
| Cross-compile recipe | not present in the C/C++ guides; only in the Node guide (JS-ports:374-394) | consistent — the on-box clang is what we used |
| `sign-elf` | framework subcommand, "mandatory on HarmonyOS PC, forced on the commercial edition" (JS-ports:73) | we used a host self-sign path; never exercised `sign-elf` |
| kernel trimming | `setreuid`/`chroot` unimplemented (C-agent:51) | not verified here |
| `/tmp` | read-only (C-agent:46) | `/tmp` not writable; `TMPDIR` already redirected — agrees |
| `gcc` | absent, clang only (C-atom:15) | agrees — no `gcc`/`cc`/`g++` on PATH |
| CMake | needs a hand-written `CMakeLists.txt` (C-adapt:15) | CMake ran but did not recognize HarmonyOS as a built-in platform |

## Pits

- `PC-22` — the C/C++ porting guides contain no usable cross-compile parameters; the same platform's Node guide is the only place they are written down.
- `PC-23` — the agent-framework install is a remote script fetched with `wget` then `chmod 777` (and elsewhere piped straight into a shell), which cannot be verified and sits oddly next to the same docs' SELinux `chmod` warning.
- `PC-24` — the documented FPC/Pascal cross-compilation flow requires a Windows/x86-64 host.
- `PC-25` — the Qt template URL is an internal host, not publicly reachable.
- `PC-26` — the migration-tool inventory contradicts itself in both counts and links.
- `PC-01`, `PC-02`, `PC-03` — debugger attachment, core dumps, LeakSanitizer.

See [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md).

## Open questions

- Is `lycium_plusplus` a real, reachable project, or a doc artefact?
- Does `sign-elf` exist as a subcommand on this machine, and is it the same gate as the host self-sign path?
