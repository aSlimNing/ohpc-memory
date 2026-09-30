---
id: scenario-java
status: mixed-evidence
observed_on: 2026-09-28/30
reviewed_on: 2026-09-30
environment: HarmonyOS PC (HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26) plus a paired HarmonyOS device
sources:
  - ../BENCH.md
  - ../POSTRUN-PLAN.md
  - ../../java-probe/order-service/target/surefire-reports/com.bench.order.OrderServiceTest.txt
  - doc citations J1/J2 below (OpenHarmonyPCDeveloper/docs @a16b9a1f)
---

# Java Scenario Lane

**Scope — two different Java jobs that need different toolchains.** Do not let one stand in for the other:

- **A. Run Java on the HarmonyOS PC itself** (services, build tools, tests, diagnostics). A normal JDK is enough; this was measured working.
- **B. Embed a JVM inside an ArkTS/HAP app** (ship a Java runtime inside your own application). Needs the BiSheng JDK 17 layout inside the app package, every ELF signed, and two extra permission declarations.

A host JDK that runs `java -jar` proves nothing about B. Likewise, `command -v java` proves nothing about either (see below).

## How to read the labels here

- `[measured]` — executed on this machine, with the date.
- `[doc]` — read from the upstream documentation at the pinned commit; the procedure was **not** executed here. Treat it as a lead, and re-verify before quoting it as working.

### Doc citations

The upstream docs are a clone of `https://gitcode.com/OpenHarmonyPCDeveloper/docs` at commit `a16b9a1f2fc63fddb31d0d4804ef10bda57e2ddb` (2026-09-23). A local copy was read at `ohpc-docs/` in this repository's parent directory; it is not required for the rest of this knowledge base to work.

| Alias | File (relative to the repo root) |
|---|---|
| `J1` | `contribute/develop-guide/鸿蒙应用嵌入Java运行时-ArkTS与JVM混合开发实战.md` |
| `J2` | `aggregate/【运行时】开源运行时汇总.md` |

## A. Host-side Java

- `[measured 2026-09-30]` **`java` on PATH is a shim with no JDK behind it.** Running it prints `java-shim: no -jar given`; `javac`, `mvn`, `jps`, `jcmd` are not on PATH at all. Never read `command -v java` as "a JDK exists".
- `[measured 2026-09-30]` A working JDK is installed under the HarmonyBrew prefix: `/storage/Users/currentUser/.harmonybrew/bin/java` → `Cellar/openjdk/26.0.2.1_2`, reporting `openjdk version "26.0.2.1"` (build `26.0.2.1+2`, vendor string "Harmonybrew"). The prefix is **not** on PATH by default.
- `[measured 2026-09-28/29]` With that JDK: Maven packaged a real service project in 21.5 s, JUnit 5 passed 3/3, and `java -jar` produced the expected output.
- `[measured 2026-09-29]` **Live-process diagnostics worked on the HarmonyOS PC for a locally installed JDK:** `jps`, `jcmd VM.version`, `jstack` (a dump with 19 threads), `jcmd GC.heap_info`, and JFR tooling. This is a host-side result and does not extend to B.

**Preferred path**

```sh
export JAVA_HOME=/storage/Users/currentUser/.harmonybrew   # verified absolute path, not $HOME-relative
export PATH="$JAVA_HOME/bin:$PATH"
java -version && javac -version && mvn -v
```

Expect a real version banner and a Maven version. **Failure criterion:** `java -version` prints a shim message or a version different from the one you installed; `javac` is "command not found". **Fallback (verified here):** install/repair the JDK through HarmonyBrew and set the absolute prefix — the shell home and the brew prefix are different roots (ledger `PC-13`, resolved). `measured_on 2026-09-28/30` · `invalidate_when` the brew prefix, JDK bottle, or shell PATH changes.

## B. Embedding a JVM in an ArkTS app

All of the following is `[doc]` unless marked otherwise. It is a documented procedure, not something replayed here.

### Package layout

| Artifact | Location | Cite |
|---|---|---|
| JRE tree | `entry/libs/arm64-v8a/jre/lib/aarch64/` | J1:54-62, J1:485 |
| JVM launcher lib | `liblauncher.so`, beside the JRE | J1:62, J1:93 |
| Java payload | `resources/resfile/` → `app.jar`, `lib/jna.jar`, `JarLoader/HmJarBootloader.class` | J1:103-111, J1:465-470 |
| Runtime config | `rawfile/config.json5` | J1:105, J1:286 |

### Manifest and build configuration

| File | Setting | Cite |
|---|---|---|
| `module.json5` | `extractNativeLibs: true` | J1:132 |
| `module.json5` | `deviceTypes: ["2in1"]` | J1:131 |
| `module.json5` | permissions `ohos.permission.kernel.ALLOW_WRITABLE_CODE_MEMORY` and `INTERNET` | J1:136-142 |
| `build-profile.json5` | `collectAllLibs: true` + `externalNativeOptions` | J1:174, J1:176-179 |
| `app.json5` | `appEnvironments.FONTCONFIG_FILE` | J1:156-160 |

**Signing:** `[doc]` the procedure signs **65 ELF files** plus the JNI libraries, using `binary-sign-tool sign -selfSign 1 -i <file>` (J1:320-323). The doc does not state where `binary-sign-tool` comes from, whether the SDK ships it, or what `-selfSign 1` means (J1:321) — treat that as an open detail. Never put a signing password, key, or profile content into a knowledge file.

### JNA

`[doc]` JNA is built with `-DNO_JAWT`, `-DHAVE_PROTECTION`, and `-DJNA_JNI_VERSION='"5.19.0"'`, a checksum macro of `"0"`; dispatch and callback flags are given at J1:374-379 and J1:382, link flags at J1:385-387. `Platform.getOSType()` returns **-1** in this environment (J1:578).

**Failure criteria `[doc]`:** a bare `Permission denied` on load (J1:312); JVM startup failure (J1:574); `getOSType()` returning -1 (J1:578). Note these three come from prose — the doc gives no error codes, exit codes, or stack text for any of them.

**Unresolved in the doc:** the relationship between the *system permissions* (`ALLOW_WRITABLE_CODE_MEMORY`, INTERNET) and the *ELF self-signing* step is not explained — which one gates what, and in what order they are checked, is not stated (J1:136-142 vs J1:310-326).

## Doc-versus-measured conflicts

| Item | Doc says | Measured here |
|---|---|---|
| JDK version | `17.0.16` in one place (J2:27), `17.0.13` in another (J2:19), for the same `bishengjdk-17` repository — the doc does not explain the difference | HarmonyBrew `openjdk 26.0.2.1_2` (2026-09-30) |
| Embedding verification | A checkbox-style "verified" list (J1:451-459) and figures such as 65 ELFs, 283 KB, 100 MB+/30+ SO, libffi 8.2.0 (J1:320, 463, 488, 349) | none of these were reproduced here |
| Environment | J1 declares no device model, OS/kernel version, API level, libc, or JDK build number | this KB pins HarmonyOS PC / kernel 1.13.0 / aarch64-musl / API 26 |

Because J1 does not declare its environment, its "verified" claims cannot be lined up against this machine. Do not promote them.

## Pits

- `PC-15` — embedding a JVM in a HAP requires signing 65 ELF files and declaring a writable-code-memory permission; documented but not replayed here.
- `PC-16` — `Platform.getOSType()` returns -1, so JNA cannot identify the platform on its own.
- `PC-21` — whether the *embedded* BiSheng JVM supports device-side diagnostics is unverified; only `jlink` appears in the docs.

See [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md).

## Open questions

- Does the embedded JVM path work with a HarmonyBrew host JDK, or is BiSheng JDK 17 mandatory?
- Which ELF signing gate is actually required for the embedded JRE: the framework-backed signing tool, or the host self-sign path?
- Does the app's `deviceTypes: ["2in1"]` requirement mean the embedded-JVM route is unavailable on other device types?

These are unverified, not impossible. Record a real run before answering them in another document.
