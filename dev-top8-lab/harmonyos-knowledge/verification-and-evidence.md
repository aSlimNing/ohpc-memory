---
id: verification-and-evidence
status: maintained-policy
reviewed_on: 2026-09-30
---

# Verification and Evidence Rules

## Evidence labels

Use one label per claim:

- **Verified here** — reproduced in a real project on the identified machine/device; give date, versions, command or test, and observed result.
- **User-provided** — supplied by the user but not independently reproduced; preserve the attribution and date when known.
- **Inferred** — reasoned from observed behavior; state the observation and avoid presenting the inference as fact.
- **Not verified** — no execution evidence yet. Do not turn absence of evidence into a failure or compatibility claim.

If evidence conflicts, rerun the smallest relevant test and report both the former and current result. Do not silently preserve an old green result after a regression. Prefer direct command output and behavior assertions over summary tables; screenshots corroborate visible state but do not prove how the artifact was built or deployed. Label report-only claims as report-backed until their commands are reproduced.

The historical [`../reverify.sh`](../reverify.sh) is unsafe and stale: it edits/removes files, terminates processes, stages/commits changes, includes signing-related values, and its logged HAP rebuild failed before it signed an existing artifact. Do not run it or cite it as an authoritative end-to-end verifier.

## No unconditional negative assertions

A knowledge entry must not assert that the platform lacks or does not support something.

- Not allowed: "the environment has no pip", "LeakSanitizer is unavailable", "containers cannot run here".
- Required: "on `<environment>` on `<date>`, `<exact command>` failed with `<exact output>`; last retested `<date>`".

Before writing a fallback, run the preferred path once and record what it actually printed. Only a reproduced failure justifies a fallback, and only the exact failure text lets a later reader tell whether the pit is still there. If the preferred path fails, the **pit** is recorded in the ledger ([`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md)) with a status; this directory keeps only the diagnostic, the fallback, and its invalidation trigger.

Rationale: a frozen negative claim outlives the condition that caused it. A recorded "no pip on this machine" once pushed every Python install scenario onto a hand-written standard-library workaround, even after pip worked, and dragged down seven skill suites built on top of it.

## Project-level acceptance

For each scenario, test the actual project path:

1. Resolve or install dependencies through the intended channel.
2. Build/package the project.
3. Execute the produced artifact or deploy it to the intended device.
4. Assert an observable behavior (response body, persisted data, UI state change, or equivalent).
5. Exercise a failure/negative control where relevant, so the test can prove that its collection and assertions detect failure.

A successful command exit, installed package, build output, HTTP 200, or self-reported “pass” is not sufficient by itself. For front-end artifacts, execute the built output in a real browser or a correctly configured DOM runtime; for device apps, verify install, launch, and a meaningful interaction where feasible.

## Anti-false-green checks

- Inject a known marker to prove logs/metrics/network collection can observe the tested action.
- Include a deliberate negative control for gates and self-check scripts.
- Print measured values and thresholds; avoid prose-only success checks.
- Cross-check collection tools against an independent source such as service logs or device logs.
- Separate automation evidence from human evaluation: passing tests proves the tested mechanics, not usability or quality of experience.

## Reporting template

For every scenario, report:

- Target and environment: host/device model or build, architecture, SDK/API, tool versions.
- Exact project and operation tested.
- Dependency, build, run/deploy, and behavior assertion results.
- Raw output or evidence file path.
- Evidence label and test date.
- Known gaps, unsupported steps, and unverified areas.

Never describe a workaround as a platform fix. Mark whether the limitation is reproducible, version-specific, a sandbox boundary, or simply not yet tested.