---
id: harmonyos-pc-knowledge-index
document_kind: index
reviewed_on: 2026-09-30
---

# HarmonyOS PC Knowledge Base

**Purpose:** canonical, evidence-labelled field knowledge for HarmonyOS PC development. The Qoder user-level Skill is only a router; update this directory as the source of truth.

**Version-control state:** this directory is currently uncommitted in the surrounding Git repository. It becomes durable Git history only after an explicitly authorized commit; do not assume it is synchronized to another clone or agent until then.

**Snapshot environment:** HarmonyOS PC / HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26. Historical tests ran 2026-09-28 through 2026-09-29. These values describe the tested machine and must be re-probed on other devices or after updates.

**Knowledge reviewed:** 2026-09-30. Review date is not a new test date; per-item evidence dates remain authoritative.

## Topic map

- [Platform and toolchain](platform-and-toolchain.md) — package channels, filesystem roots, binary gates, symptom routing, signing boundary, ecosystem discovery.
- [Scenario recipes](scenario-recipes.md) — language-independent real-project workflows and evidence for ArkTS/HAP, C/C++, Java, Node.js, Python, Web, data, and shared observability; each scenario ends with a conditional preferred-path/failure-criterion/fallback block.
- [JavaScript lane](scenario-javascript.md) — three separate jobs: run Node on the PC, port a native npm module, embed Node in a HAP.
- [Java lane](scenario-java.md) — host-side Java (measured working) kept firmly apart from embedding a JVM inside an ArkTS app (documented only).
- [C / C++ lane](scenario-c.md) — on-box clang builds, the missing cross-compile recipe, and the Qt/Go/Pascal edges.
- [Known issues (superseded, moved out)](../known-issues-legacy.md) — kept for provenance only; it left this directory on 2026-09-30 so that no file in the knowledge base carries negative platform statements. Its content was split three ways: diagnostics into [platform-and-toolchain.md](platform-and-toolchain.md), fallbacks into [scenario-recipes.md](scenario-recipes.md), and the pits themselves into the ledger below.
- [Verification and evidence](verification-and-evidence.md) — acceptance bar, evidence labels, negative controls, provenance rules, no unconditional negative assertions.
- [Maintenance](maintenance.md) — update protocol, conditional workaround format, ledger linkage, review triggers, and entry template.
- [`validate.cjs`](validate.cjs) — dependency-free structural/link validator; run with Node before proposing knowledge changes for commit.

## Pit ledger (outside this directory)

Pits — the things you cannot do — are not knowledge and are not stored here. They live in [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md), each with a stable id (`PC-NN`), a status (`阻塞` / `可绕开` / `待验证` / `已解决`), a release condition, and a link to the knowledge section holding its fallback. That ledger is the only place a negative statement is allowed to live, and only with a status attached.

This directory keeps the diagnostic (how to tell the gate is in the way) and the conditional fallback. The two are joined by pit id; see [maintenance.md](maintenance.md#ledger-linkage).

## Source materials

- [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md) — the pit ledger: what cannot be done, its status, and its release condition.
- `../BENCH.md` — Top8 benchmark and historical detailed claims.
- `../HARMONYOS-PC-DEV-MAP.md` — platform/ecosystem synthesis and workflow map.
- `../POSTRUN-PLAN.md` — post-run diagnostics, tests, and current gaps.
- `../PPT-OUTLINE-harmonyos-coding.md` — problem-oriented scenario ledger.
- `../reverify-final.log` — actual 2026-09-29 replay output; notably, its HAP rebuild failed before signing/verifying an existing artifact.
- Scenario-specific reports, logs, and screenshots under this directory and sibling experiment folders are evidence of varying strength; see the scenario notes.

**Do not use `../reverify.sh` as a verifier or recipe.** It has mutating and Git side effects, contains signing-related values, and its output does not establish the later HAP build/deploy flow.

## Evidence status vocabulary

Use the controlled labels and update template in [maintenance.md](maintenance.md). A report claim is not the same as a fresh raw replay; a screenshot corroborates visible state, not build provenance. Preserve conflicts instead of silently selecting the most favorable result.