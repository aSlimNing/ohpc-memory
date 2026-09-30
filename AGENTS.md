# Agent instructions for this repository

This repository is a field record of running mainstream development workflows on a real HarmonyOS PC. Before answering any HarmonyOS / OpenHarmony / ArkTS / HAP / DevEco / HDC question from memory, read the knowledge base instead.

- **What works, and how:** `dev-top8-lab/harmonyos-knowledge/INDEX.md` — start here, then load only the lane you need. Each item gives a preferred path, a failure criterion, and a time-bounded fallback.
- **What does not work, and why:** `dev-top8-lab/HARMONYOS-PC-ISSUES.md` — the pit ledger, and the only place a negative statement is allowed to live. Every entry has a `PC-NN` id, a status (`阻塞` / `可绕开` / `待验证` / `已解决`) and a release condition. Do not use a fallback whose pit is marked `已解决`.

Every fact is bound to a measured date and a machine state: HarmonyOS PC, HongMeng Kernel 1.13.0, aarch64 / musl (no glibc), OHOS SDK 26.0.0.18 (API 26), measured 2026-09-28 → 30. This is the state of the machine that was tested, not a universal truth. Re-probe before acting; never turn a past success into a guarantee for a different machine or release.

A Qoder Skill router ships at `skill/harmonyos-pc-development/SKILL.md`. It routes only and holds no facts; install instructions for several agent products are in `README.md`.
