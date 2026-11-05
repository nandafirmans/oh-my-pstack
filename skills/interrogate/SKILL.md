---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Adversaries try to break a change or design, and only findings proven by a run survive."
disable-model-invocation: true
---

# Interrogate

Follow the [portable runtime contract](../pstack-pi/references/runtime.md) for reviewer panels, concurrent child execution, model choices, and unavailable-capability reporting.

Adversaries try to break a change or design. A finding survives only if a run proves it. Report findings. Do not apply fixes.

## Frame

The scope is what the user names. Otherwise use the branch diff from the merge base with its base branch, through the working tree. State the intent using the **in-your-own-words** skill, from the user's message, commits, or PR description. Ask the user if intent remains unclear.

## Fan out

Run Phase A steps 3 and 4 and Phase B of the **arena** skill, with these changes:

- Read the portable `interrogate reviewers` panel in place of `arena runners`, one adversary per configured entry. Otherwise use a diverse host-supported panel drawn from `reviewer`, `planner`, `designer`, and `inherit-parent`.
- Copy the scope's uncommitted changes into each isolated worktree, including relevant untracked files. Do not let adversaries mutate the user's working tree.
- Launch adversaries concurrently through the host's task facility. Use the configured host-supported role/model; `auto` and `inherit-parent` omit explicit model selection. Report substitutions. Permit execution and isolated repro files, not changes to the reviewed implementation or external state.
- In place of the arena task and rationale, give each adversary the scope, intent, and this brief:

> Break this change. Prove each finding with a run against the real code: a failing test, a repro script, or command output that shows wrong behavior. For a design or plan, run a prototype or probe against the current tree. Keep repros in your own worktree. Report the finding title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run. That includes style, naming, structure, and risks that need a future change to matter. No findings is a valid result.

If isolated execution is unavailable, report that limitation; do not silently treat an unexecuted concern as a verified finding.

## Verify

Verify each finding per arena Phase F by rerunning its command in isolation. Keep a finding only when the output shows a failure and that failure breaks the intent. Drop the rest. Merge findings that share a root cause.

Skip arena Phases C, D, and E. Adversaries find different failures, so the verdict keeps every verified finding, not one adversary's list.

## Output

- **Intent**: the restatement.
- **Findings**: for each verified finding, the command, its output, how it breaks the intent, and the adversaries that found it. Say "no verified findings" when none survive.
- **Dropped**: for each adversary, the count of dropped findings and why.
