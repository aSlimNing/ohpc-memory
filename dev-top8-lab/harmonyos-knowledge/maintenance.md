---
id: knowledge-maintenance-protocol
document_kind: policy
reviewed_on: 2026-09-30
---

# Knowledge Maintenance Protocol

## Source-of-truth rule

These files are committed in the `ohpc-memory` repository (`main` holds the published snapshot, `master` the development worktree), so cross-clone availability is real. Verify which revision you are reading before quoting a fact from it.

1. Edit this Git-workspace directory first. Do not maintain separate fact copies in the Skill or user memory.
2. Keep the user-level Skill short: it routes Agents to this knowledge base and enforces the process; its `references/` files are locator notes, not alternate facts.
3. Never erase a result because a newer result differs. Add the new evidence, date it, and mark the older statement superseded or environment-specific.
4. Do not commit signing passwords, tokens, private keys, profiles, personal screenshots, or credential-recovery instructions. Link to approved credential workflows without exposing secret material.

## Evidence states

Apply the most specific status available to each claim. Document-level frontmatter may use descriptive summaries such as `historical-snapshot`, `mixed-evidence`, or `maintained-policy`; these are not substitutes for a status on an individual finding.

- `reproduced` — current run on the named environment includes command/output and behavioral assertion.
- `corroborated` — independently supported (for example, a screenshot) but not enough to prove the complete procedure.
- `doc-derived` — taken from an upstream document; cite repository, commit, and `file:line`. The document was read but its procedure was not executed here. Treat it as a lead, not as a verified result.
- `report-only` — stated in a benchmark or summary but no corresponding raw result was inspected or replayed.
- `user-provided` — supplied by the user, not independently checked.
- `inferred` — interpretation derived from observations; state the reasoning and limits.
- `not-verified` — no sufficient evidence yet; this does not mean unavailable.
- `superseded` — historical finding retained for provenance but replaced by newer evidence; link to replacement.

Never label a whole scenario `reproduced` if only one step or a report was checked. Assign evidence status at the claim or procedure level.

## Required entry fields

For each new or materially changed finding, record:

```yaml
id: short-stable-id
status: reproduced | corroborated | doc-derived | report-only | user-provided | inferred | not-verified | superseded
observed_on: YYYY-MM-DD
reviewed_on: YYYY-MM-DD
environment: device/host, OS build, architecture, SDK/API, relevant tool versions
source: relative paths to raw output, test project, screenshot, or user statement
supersedes: optional prior finding ID
```

Then include:

- **Claim:** one testable statement.
- **Procedure:** minimal safe reproduction; identify commands that mutate files or device state.
- **Observed result:** exact output, exit code, metric, or observable behavior.
- **Boundary:** what the evidence does not establish and where the result may differ.
- **Next check:** concrete retest trigger if the finding is time-sensitive or incomplete.

For existing topic files, attach the status directly to each high-impact finding or create a small evidence record using this schema. Document-level `reviewed_on` must not be mistaken for `observed_on`.

## Workaround entries are conditional

A workaround is knowledge, but it expires. Never record one as a flat statement of what the platform cannot do. Record it so a later reader can decide whether it is still needed:

- **Preferred path** — the normal command and its expected good output.
- **Failure criterion** — the exact error text or exit code that proves the pit still exists. Only observing this justifies the fallback.
- **Fallback** — the verified steps, linked to the ledger pit id.
- `measured_on` — date plus OS/SDK/tool versions.
- `invalidate_when` — the change that forces a retest (OS/SDK/package/tool upgrade, sandbox policy change, or the pit being marked resolved).

Example skeleton:

```markdown
- **Preferred path:** `<command>` → expect `<good output>`.
- **Failure criterion:** `<exact error text / exit code>`.
- **Fallback (verified here):** `<steps>` (ledger `PC-0X`).
- `measured_on` 2026-09-28/29 · `invalidate_when` <trigger>.
```

## Ledger linkage

Pits live outside this knowledge base, in [`../HARMONYOS-PC-ISSUES.md`](../HARMONYOS-PC-ISSUES.md), each with a stable id (`PC-NN`), a status (`阻塞` / `可绕开` / `待验证` / `已解决`), and a release condition. The two files are joined by that id:

- A knowledge entry's fallback cites the pit id it works around.
- A ledger entry's 绕法 field cites the knowledge section holding the fallback.

When a pit flips to `已解决`, the same action must retest the preferred path here and either delete the fallback or mark it `superseded` with a link to the new evidence. Fixing a pit without retiring its workaround leaves the knowledge base teaching the long road.

## Update workflow

1. **Capture:** record the user-provided clue separately from what the Agent independently observed. Include the date and attribution when known.
2. **Reproduce:** use a real project and verify dependency resolution → build → artifact execution/deployment → behavioral assertion. Add a negative control for collectors and self-checks where relevant.
3. **Review risk:** inspect commands before running. Never reuse `reverify.sh`; its historical implementation edits/removes files, terminates processes, stages/commits Git changes, and includes signing-related values.
4. **Update the canonical topic:** add the claim, evidence state, environment, source paths, and limitations. Keep conflicting earlier evidence in place with an explicit supersession link. If the finding is a pit, add or update its ledger entry and set the status; if a pit changed state, retest the paired preferred path in the same pass.
5. **Refresh the index and Skill router only if structure changed.** Do not copy detailed facts into the Skill.
6. **Validate:** run `node dev-top8-lab/harmonyos-knowledge/validate.cjs` to check frontmatter, IDs, review dates, local Markdown links, and TODO markers; then inspect source paths, secrets, and unlabelled high-impact claims manually. Check that no entry makes an unconditional negative assertion and that every fallback cites a ledger pit id whose status matches. Run the exact harmless reproduction steps from a clean project where possible.
7. **Review changes:** inspect `git diff` and `git status`; stage/commit only when explicitly requested. Keep unrelated user files untouched.

## Retest triggers

Revalidate affected entries when any relevant input changes:

- OS/build, SDK/API, device, shell/sandbox policy, or permissions;
- HNP/HarmonyBrew package, compiler, runtime, npm/pip, or signing-tool version;
- project configuration, dependency lockfile, registry, or device signing/profile identity;
- a previous command begins failing or a prior workaround changes behavior.

For fast-moving package ecosystems and execution/signing gates, review at least quarterly even without a known change. Treat any version- or credential-sensitive procedure as stale until the current toolchain is checked.

## Entry template

Copy and fill this when adding a standalone finding:

```markdown
### <stable-id> — <short claim>

- status: `not-verified`
- observed_on: `YYYY-MM-DD` or `unknown`
- reviewed_on: `YYYY-MM-DD`
- environment: `<host/device, OS/build, architecture, SDK/API, versions>`
- source: `<relative raw evidence path or user-provided attribution>`
- supersedes: `<finding ID or none>`

**Claim:** <one testable statement>
**Procedure:** <minimal safe steps>
**Observed result:** <exact output/exit code/assertion, or not run>
**Boundary:** <what is not proven>
**Next check:** <trigger or test>
```