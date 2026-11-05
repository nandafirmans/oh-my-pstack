---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

Follow the [portable runtime contract](../pstack-pi/references/runtime.md) for child briefs, parallel execution, panels, models, and fallbacks.

Track one checklist entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything. Use the host's planning facility when available; otherwise keep a compact checklist in the conversation or project-local decision trail.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners. Use the `arena runners` panel from the portable pstack configuration. If absent, use two host-supported choices drawn from `designer` and `implementer`. An `auto` or `inherit-parent` entry means the parent model when the host supports that alias; omit an explicit model for it. If the host rejects an explicit choice, use its family's confirmed host-supported default and say so. Identify families from live provider/model metadata; where relevant, `claude-*` is Claude, while `grok-*`, `cursor-grok-*`, and `composer-*` belong together. If that family has no confirmed default or rejects it, use the closest valid choice of the same family reported by the host, or drop the seat and say so. If dropped seats leave fewer than two runners, add runners on a remaining runner's confirmed model, or on the parent model when supported, until there are two; preserve a deliberately configured one-entry panel as one. Report any replacement or inability to restore the count. Spawn more runners when the arena covers multiple design directions. Repeating one host-supported choice is valid when generation-bound rather than judgment-sensitive. Pick each child's host-supported reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.
4. Give each candidate its own output location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Launch all N children concurrently through the host's task facility. Give each a standalone brief with the task, the path to the shared grounding, its own output path, acceptance criteria, verification, forbidden scope, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one read-only judge from `arena cross-judge pool` in the portable pstack configuration, in pool order. If absent, use the host's confirmed `reviewer` choices. When the host exposes model identity, the judge must come from another model family, as Phase A step 3 defines families. `auto` and `inherit-parent` never judge. If the host rejects a choice, try its closest valid variant of the same model at a supported reasoning level or speed, or move to the next entry. If no eligible configured entry runs, try the host-supported default reviewer choices from another family. If none runs, skip the judge, pick the base alone in Phase D, and say so. If the parent's model or a candidate's family cannot be determined, try confirmed concrete model choices in pool order and report that the family check could not run. If only role-based independent review is available, report that limitation rather than claiming a cross-model judge. The judge sees the rubric and candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with your reading in Phase D. Do not spawn it while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict or that Phase C skipped the judge, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
