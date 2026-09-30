---
id: scenario-javascript
status: mixed-evidence
observed_on: 2026-09-28/30
reviewed_on: 2026-09-30
environment: HarmonyOS PC (HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26)
sources:
  - ../BENCH.md
  - ../../frontend-toolchain-lab/RESULTS.md
  - ../../node-fullstack-lab/
  - doc citations JS-embed / JS-ports / JS-adapt / JS-electron below
---

# JavaScript Scenario Lane

**Scope.** Three distinct jobs. They share almost nothing except the language:

- **A. Run Node.js on the HarmonyOS PC** (services, scripts, build tooling). What you get out of the box is an Electron-bundled Node, not the official runtime.
- **B. Port a native npm module** (a package with a `.node` addon) so it loads on `aarch64`/musl. This is where the real work is.
- **C. Ship Node inside an ArkTS app** (embed the runtime in your own HAP).

## How to read the labels here

- `[measured]` — executed on this machine, date given.
- `[doc]` — read from the upstream docs at the pinned commit; **not** executed here. A lead, not a result.

### Doc citations

Upstream: `https://gitcode.com/OpenHarmonyPCDeveloper/docs` @ `a16b9a1f2fc63fddb31d0d4804ef10bda57e2ddb` (2026-09-23). Local copy read at `ohpc-docs/`.

| Alias | File (relative to the repo root) |
|---|---|
| `JS-embed` | `contribute/develop-guide/鸿蒙应用嵌入Node.js运行时-ArkTS与Node.js混合开发实战.md` |
| `JS-ports` | `contribute/adapter-guide/Nodejs三方库鸿蒙化移植及贡献指南.md` |
| `JS-adapt` | `contribute/adapter-guide/js移植适配指导.md` |
| `JS-electron` | `aggregate/【跨平台框架】Electron资源汇总.md` |

## A. Running Node on the PC

- `[measured 2026-09-30]` **There is no `node.org` in HNP.** `/data/service/hnp` holds 54 packages including `python.org`, `ohos-sdk.org`, `redis.org`, `ruby.org`, `perl.org` — but no Node package, and no `node`/`npm` entry in `/data/service/hnp/bin`. So the HNP channel does not give you a Node runtime here.
- `[measured 2026-09-30]` What is on PATH is the Qoder application's bundled Electron runtime: `~/.qoder/bin/node` → Node **24.11.1** with **Electron 40.1.0**. It reports honestly: `process.platform === 'ohos'`, `process.arch === 'arm64'`. `npm` sits beside it; `npx`, `yarn`, and `pnpm` were absent.
- `[doc]` The official runtime is an HNP-format prebuilt Node whose *installed* path the doc gives as `/data/service/hnp/node.org/node_v24.13.0/` (JS-embed:578-584). **The acquisition channel is documented as well** — `aggregate/【运行时】开源运行时汇总.md` links the package directly (`gitcode.com/OpenHarmonyPCDeveloper/DevNode-OH/tree/main/hnp/arm64-v8a`, version 24.13.0, "源码已回合主社区"), and DevNode also ships as an app-market app (`com.develop.opensource.ohdpc.devnode`). So "the docs give no way to obtain it" is wrong; what is true is that no `node.org` package is *installed* here.
- `[measured 2026-09-30]` **That runtime is present on this machine and executes once signed.** An unpacked `node.hnp` (54,319,852 B, sha256 `2e260da9…`) sits at `node-ohos/`; its working variant reports `v24.13.0`, `process.platform === 'openharmony'`, `arch arm64`, V8 `13.6.233.17-node.37`, and runs real code (`require('os')`, 20 CPUs). This is the same `.codesign` gate as `PC-14`, not a separate acquisition problem — alignment detail in `PC-28`.
- `[measured 2026-09-29]` With the Electron Node, a real Express 5 project installed 69 packages in ~3 s, passed API assertions, and retained data across a restart.

**Preferred path**

```sh
node -e 'console.log(process.platform, process.arch, process.versions.node)'
```

Expect `ohos arm64 <version>`. **Failure criterion:** the command reports `linux` (you are not on this runtime) or fails outright. **Fallback (verified here):** if you need the *official* runtime rather than this Electron one, fetch the HNP package from the documented `DevNode-OH` channel (ledger `PC-18`, resolved) and give its `node` binary a 4096-aligned `.codesign` section, otherwise it fails with `EACCES` (`PC-28`). `measured_on 2026-09-29/30` · `invalidate_when` the HNP package set, the Qoder-bundled Electron version, or the signing gate changes.

**Do not use `npx`.** `[measured]` it is absent from the Electron runtime's `bin`. `[measured 2026-09-30]` the official runtime does ship one, but invoking its `bin/npm` directly failed with a `cjs/loader` error — unverified whether a correct `PATH`/prefix fixes that. Invoke project-local binaries as `node node_modules/.bin/<tool>`.

## B. Porting a native module

This is the part the upstream docs actually cover well. All `[doc]` unless marked.

**The shape of the job** (`JS-ports:178-241`):

```sh
rm -rf node_modules package-lock.json
npm install
file node_modules/<pkg>/build/Release/*.node     # expect: ELF 64-bit LSB shared object, ARM aarch64
# if that shows x86-64 / Intel 80386, the install silently fetched a wrong prebuilt:
npm rebuild <pkg> --build-from-source
node -e "const m=require('<pkg>'); console.log(typeof m)"
```

Note `prebuilds/` and `build/Release/obj.target/` are other places the artifact hides; locate it with `find node_modules/<pkg> -name '*.node'` (JS-ports:197).

**Cross-compile settings** (`JS-ports:463-466`) — this is the one place in the doc set that spells out the target triple and sysroot:

```sh
export OHOS_NDK=/path/to/ohos-sdk
export CFLAGS="--target=aarch64-linux-ohos --sysroot=${OHOS_NDK}/native/sysroot"
# same for CXXFLAGS and LDFLAGS
```

**Failure criteria — each of these has a distinct cause:**

| Observed | Cause | Fix |
|---|---|---|
| `ar: No such file or directory` / `error make: ar: No such file or directory` | no archiver; binutils absent | provide `llvm-ar` (JS-ports:70, 343, 404, 458) |
| `Error: Cannot find C++ compiler` | `OHOS_NDK` unset or wrong | point it at the SDK (JS-ports:461) |
| `fatal error: 'sysroot/usr/include/...' file not found` | sysroot path wrong | set `--sysroot=${OHOS_NDK}/native/sysroot` (JS-ports:463-466) |
| `chmod: Operation not permitted` | SELinux blocks the chmod | exclude that step (JS-ports:637) |
| binary built but will not run | ELF not signed | signing path, see below (JS-ports:638) |
| `file` says `x86-64` yet `npm install` "succeeded" | a wrong prebuilt was fetched silently | force `--build-from-source` (JS-ports:189-190, 446-448) |

- `[doc]` **`export OS=ohos` does not work** (JS-ports:406). The documented alternatives are `--target_arch` / `--dest_cpu`, or editing `binding.gyp` directly.
- `[doc]` `prebuild-install`'s `postinstall` will pull an x86_64 prebuilt; `--build-from-source` is what stops it (JS-ports:436).
- `[doc]` Node **v22+** reportedly supports `--dest-os=linux` for OpenHarmony builds (JS-ports:117, 257) — which contradicts the rest of the doc's v24.13.0 baseline framing.
- `[doc]` Published ports exist under the `@ohos-npm-ports` scope: `bufferutil@4.0.9-7`, `sqlite3@5.1.7-8`, `typescript@7.0.2-1` (JS-ports:132, 622-626). Check those before building from source.

**The HMDFS symlink trap** (`JS-ports:243-247`) — this one bites silently. A dependency that resolves through a SONAME symlink (`libfoo.so` → `libfoo.so.0.1.0`) fails to load on HMDFS: the kernel layer does not resolve symlinks. `npm pack` / `.tgz` round-trips flatten symlinks too, compounding it. The documented workaround is to link with an explicit SONAME (`-Wl,-soname,libfoo.so.0`) and publish real files rather than symlinks.

## C. Embedding Node in a HAP

`[doc]` Two models are described, and only one is presented as usable.

- **Model A — child process via a small NAPI launcher.** Real, concrete: a C++ launcher exports `StartNode`/`StopNode`, `fork()`s, sets `NODE_PATH`, and `execl()`s the runtime. Hard-coded sandbox paths (`JS-embed:272-277`):
  - binary `…/entry/libs/arm64/node/bin/node`
  - script dir `…/entry/resources/resfile`
  - modules `…/entry/libs/arm64/node/lib/node_modules`
  - The launcher needs no Node headers or libs (JS-embed:258); only Model B does.
  - ArkTS side: `import launcher from 'libxxxlauncher.so'`, call `startNode('app.js')` in `onWindowStageCreate` and `stopNode()` in `onDestroy` (JS-embed:369-401).
  - IPC options are tabulated: HTTP/TCP, stdin-stdout, Unix domain socket, temp files (JS-embed:444-503).
  - User scripts go in `entry/src/main/resources/resfile/` with their own `package.json` and `node_modules/` (JS-embed:405-438).
- **Model B — in-process embedding.** The doc itself labels the code "理论" (theoretical) and lists four high-difficulty blockers: turning a 113 MB ELF into `libnode.so`, symbol conflicts with the HarmonyOS NAPI runtime, V8 internal-header adaptation, and bridging GN/Ninja to CMake (JS-embed:522, 561-568). **It recommends Model A.** Treat B as unproven, not as a recipe.

**Config fields `[doc]`:** `extractNativeLibs: true` is required, or the native binary is never extracted to the filesystem and `fork`/`exec` cannot run it (JS-embed:724, 206-222). `collectAllLibs` lives under `buildOption.nativeLib` in `build-profile.json5` (JS-embed:228-242).

**Doc-internal path inconsistency — check before trusting:** the same document writes the sandbox path as `entry/libs/arm64/node/...` in some places and uses `entry/libs/arm64-v8a/` in the structure diagram and elsewhere (JS-embed:273, 277, 656 vs 121, 126, 176, 600, 693). If you follow the wrong one, `NODE_PATH` points nowhere.

## Platform-lifetime details worth knowing

- `[doc]` `process.platform` is reported as **`openharmony`** in the embedding doc (JS-embed:426-431, 716). `[measured 2026-09-30]` **Both values are real and belong to different runtimes:** the Qoder-bundled Electron Node reports **`ohos`**, while the *official* runtime reports **`openharmony`** — exactly what the doc says. So this is not a doc-versus-reality conflict; it is a "which Node am I on" question. Any dependency that branches on `process.platform === 'linux'` needs a patch on either one.
- `[doc]` Electron build lines: V25 no longer evolving; V34, V37, V40 maintained; V43 planned (JS-electron:9-16). `[measured]` the bundled Electron here is **40.1.0**, which falls inside the maintained set.
- `[doc]` The JS compatibility layer reportedly does not support dynamic functions or `eval`, and nodejs/web built-in modules need HarmonyOS SDK substitutes (JS-adapt:45-47).

## Post-run diagnostics

`[doc]` **Neither `--cpu-prof`, `--inspect`, nor `--prof` appears anywhere in the four JS documents** — the debugging sections give links, not procedures (JS-electron:145-157). `[measured 2026-09-29]` `--cpu-prof` did produce a usable `.cpuprofile` with the Electron Node. So profiling works here; it is simply undocumented upstream.

## Doc-versus-measured conflicts

| Item | Doc says | Measured here |
|---|---|---|
| Node runtime available | HNP package `node.org/node_v24.13.0` (JS-embed:578-584); the channel is linked from the runtime-summary table | no `node.org` **installed**; the package itself was fetched to `node-ohos/` and its signed variant runs `v24.13.0`. What is on PATH is the Electron Node 24.11.1 / Electron 40.1.0 |
| `process.platform` | `openharmony` (JS-embed:426-431) | `ohos` on the Electron Node; **`openharmony` on the official runtime** — the doc matches the official runtime |
| ELF signing tool | `binary-sign-tool`, worded "**may** need signing" (JS-embed:720) **vs** `sign-elf`, called mandatory (JS-ports:73, 638) **vs** a claim that HarmonyBrew's `ohos-sdk` output is **auto-signed** (JS-ports:251) | copying a binary loses `.codesign`; a host self-sign path exists |
| Node version baseline | v24.13.0 in JS-embed, v22+ in JS-ports | 24.11.1 (Electron-bundled) |
| Archiver fix | `llvm-ar` in one place, `brew install binutils` / `apt-get install binutils` in another (JS-ports:65-73 vs 401-404) | no `ar` on PATH; `llvm-ar` is present in HNP |

The three-way signing contradiction is the most consequential: it is the same conflict recorded in the ledger under `PC-14`, and the "auto-signed" claim is the one to distrust.

## Pits

- `PC-18` — (**resolved 2026-09-30**) the official Node runtime *is* obtainable through the documented channel and runs on this machine once signed. This supersedes the earlier "not obtainable on this machine" wording; what remains is the shared signing gate, not an acquisition problem.
- `PC-07` — native npm modules have no usable HarmonyOS artifact and must be rebuilt from source (with a wrong-architecture prebuilt needing `--build-from-source`). Also affects the Vite/webpack toolchain.
- `PC-14` — downloaded/ported ELFs need signing before they execute.
- `PC-28` — a `.codesign` section that exists but is **not 4096-aligned** behaves as if absent (`EACCES`), so a binary that looks signed can still refuse to run.
- `PC-17` — the official runtime's JS compatibility layer reportedly lacks dynamic functions and `eval`, and needs SDK substitutes for nodejs/web built-ins.
- `PC-19` — the docs' ELF-signing story is self-contradictory (three different tools/outcomes).
- `PC-20` — modularization Model B (in-process `libnode`) is documented as theoretical only.

See [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md).

## Open questions

- ~~Where does the `node_v24.13.0` HNP package come from?~~ **Answered 2026-09-30:** the runtime-summary table links it (`DevNode-OH`), the package is on disk at `node-ohos/`, and the signed variant runs. Still open: does the *embedding* doc's assumed layout match this package's actual tree?
- Which of the three documented signing stories is correct for a *ported* `.node` addon on this machine? Partly answered for the runtime binary — a 4096-aligned `.codesign` makes it execute (`PC-28`). Whether a `.node` addon needs the same geometry is still open.
- Does an `ohos`-reporting runtime break the same npm packages that an `openharmony`-reporting runtime breaks? The doc patches assume the latter.
