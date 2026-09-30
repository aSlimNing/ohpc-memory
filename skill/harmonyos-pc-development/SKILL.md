---
name: harmonyos-pc-development
description: Practical HarmonyOS/OpenHarmony PC development guidance grounded in this user's tested toolchains, device workflows, and platform constraints. Use for 鸿蒙/HarmonyOS/OpenHarmony/OHOS, ArkTS, ArkUI, HAP, DevEco, HDC, or porting/running developer tools on HarmonyOS PC.
---

# HarmonyOS PC Development

## Purpose

Route the agent to the canonical knowledge base instead of answering from memory. The knowledge base lives in the `ohpc-memory` repository, starting at `dev-top8-lab/harmonyos-knowledge/INDEX.md`.

Every path in this Skill is relative to the root of a workspace that contains that tree. The files under `references/` are locators, not facts. If `dev-top8-lab/harmonyos-knowledge/INDEX.md` is not present in the current workspace, say so and ask for the repository rather than reconstructing platform claims from this Skill. Treat device state and software versions as mutable: re-probe before acting, and never convert a past success into a guarantee for a different machine or release.

## Workflow

1. **Identify the target.** Distinguish a HarmonyOS PC host toolchain from an ArkTS/HAP app targeting a phone or other device. Record OS/build, architecture, SDK/API level, repository type, and whether a real device is available.
2. **Inspect the project first.** Read project instructions and build configuration (`build-profile.json5`, `oh-package.json5`, Gradle/Maven files, CMake files, package manifests) before selecting commands. Prefer the installed DevEco CLI skill for command syntax; use its current capabilities rather than guessing.
3. **Probe, do not assume.** Verify executable paths, interpreters, ABI/ELF compatibility, code-signing state, writable locations, environment variables, network/package source, and device connectivity at the point of use. A package listed or a file present does not prove it runs.
4. **Use the toolchain discovery order.** Check the system/HNP packages, then the user's HarmonyBrew installation, then the OpenHarmonyPCDeveloper ecosystem and project-specific instructions. Only after checking the relevant channels should a missing tool be called unavailable.
5. **Run a real project path.** For the smallest representative project, exercise dependency acquisition, build, execution/deployment, and a behavioral assertion. For apps, include installation, launch, and an interaction where feasible. Capture command output and versions per scenario.
6. **Diagnose by boundary.** Separate source/build errors from host sandbox restrictions, ELF loader/ABI issues, `.codesign` execution gates, device signing/profile gates, path-root mismatches, and network/package-index problems. Consult the pit ledger `dev-top8-lab/HARMONYOS-PC-ISSUES.md` before proposing a workaround, and check the pit's status: a fallback whose pit is marked `已解决` must not be used.
7. **Report evidence precisely.** Use the evidence states defined in `dev-top8-lab/harmonyos-knowledge/maintenance.md` (`reproduced`, `corroborated`, `doc-derived`, `report-only`, `user-provided`, `inferred`, `not-verified`, `superseded`) with date, environment, and source path. Preserve raw outputs. State negative results only after checking relevant installation channels and performing an execution test.
8. **Protect credentials and device data.** Never print signing passwords, tokens, private keys, or profile contents. Before collecting screenshots, confirm the intended app is foregrounded and avoid retaining personal content.

## Reuse across agents

This Skill is a Markdown router and holds no facts of its own. It uses the shared `SKILL.md` convention, so one directory serves several agent products — the install step differs per product:

| Agent | How to hook it up |
|---|---|
| **Qoder** | `qodercli skill install git@github.com:aSlimNing/ohpc-memory.git --path skill/harmonyos-pc-development` (verified on this machine; the repository is private, so use SSH or credentialed HTTPS) |
| **Codex** | place `skill/harmonyos-pc-development/` under `~/.agents/skills/` |
| **Claude Code** | place it under `~/.claude/skills/` |
| **WorkBuddy** | Skills page → 添加技能 → 上传技能, importing this directory |
| **AGENTS.md-based agents** | the repository root ships an `AGENTS.md`; a clone needs nothing else |
| **Anything else** | point the agent at `skill/harmonyos-pc-development/SKILL.md`, or attach/index `dev-top8-lab/harmonyos-knowledge/` as a knowledge source |

Only the Qoder row was exercised here; the others are taken from each vendor's documentation as of 2026-09-30 and were not installed on this machine. A cloned workspace needs nothing installed: every path here resolves from the repository root.

**Editing the router:** do not reinstall on every edit — link the source directory once and changes take effect immediately:

```bash
qodercli skill link <repository>/skill/harmonyos-pc-development
```

The repository copy is the source; an installed copy is a duplicate that drifts. Never copy facts out of the knowledge base into this router, and never assume two agents share conversational memory.

## Reference map

Knowledge base, under `dev-top8-lab/harmonyos-knowledge/`:

- `dev-top8-lab/harmonyos-knowledge/INDEX.md` — entry point and topic map; start here.
- `dev-top8-lab/harmonyos-knowledge/platform-and-toolchain.md` — environment model, execution gates, package channels, ecosystem discovery.
- `dev-top8-lab/harmonyos-knowledge/scenario-javascript.md` — JavaScript lane: run Node on the PC, port a native npm module, embed Node in a HAP.
- `dev-top8-lab/harmonyos-knowledge/scenario-java.md` — Java lane: host-side Java, kept apart from embedding a JVM in an ArkTS app.
- `dev-top8-lab/harmonyos-knowledge/scenario-c.md` — C/C++ lane: on-box clang builds, cross-compile gap, Qt/Go/Pascal edges.
- `dev-top8-lab/harmonyos-knowledge/scenario-recipes.md` — language-independent real-project workflows and evidence.
- `dev-top8-lab/harmonyos-knowledge/verification-and-evidence.md` — acceptance bar, evidence labels, negative controls.
- `dev-top8-lab/harmonyos-knowledge/maintenance.md` — update protocol, entry template, review triggers.
- `dev-top8-lab/harmonyos-knowledge/validate.cjs` — structural and link validator; run it after editing the knowledge base.

Pit ledger, outside the knowledge base:

- `dev-top8-lab/HARMONYOS-PC-ISSUES.md` — what cannot be done, one pit per `PC-NN` with a status (`阻塞` / `可绕开` / `待验证` / `已解决`) and a release condition. This is the only place a negative statement is allowed to live.

`references/` — path-resolution notes only, no facts.

Load only the reference needed for the current task, then verify its time-sensitive details locally.
