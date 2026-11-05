### Session pickup

**You own the resume point. Read the prior trail, don't redo it.** For "take over this", "resume this conversation", "continue from <session resource>", "you're taking over", "pick up where X left off", a recorded session handoff, or a pushed branch you're meant to continue.

A pickup is inheritance. The prior agent already paid the cost of reading the code, running the repros, making the design choices. Redoing loses the bias check and burns context. Resist the urge to re-derive; read.

1. Locate the prior trail through the active adapter's known-session evidence resource, durable handoff/export, or pushed branch. Do not scan unrelated workspaces or private sessions. For an earlier session on OMP, use a root-started `seance` consult with `sourceSession` when the live inventory exposes it. That consult is the historical read; do not independently open, grep, or replay the same session's `.jsonl`. If historical consultation is unavailable, use the adapter's documented read-only history surface or an explicit export, reading metadata and the last messages before scanning decision points. Reduce a long export through a root-started canonical `explorer` **Bounded session**. Keep only the reduced timeline in the main thread (the **principle-guard-the-context-window** skill).
2. Reconstruct operational state. The branch and worktree, what already landed (`git log`, `git diff` against the base), the open todos, the decisions made. The prior trail is authoritative input. Resist the bias to re-derive it.
3. Diff done vs pending. Compare what shipped against what was planned and name the resume point. Do not redo prior investigation or implementation. Run only the minimum verification needed to validate the inherited head; for a bug fix, that may be the original reproduction. A broad "let me re-derive everything" pass is the tell that you're ignoring the trail.
4. Route the remaining work to the matching playbook and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. The pickup playbook ends here; the routed playbook owns the rest.
5. Verify the inherited claims against the original goal on the real artifact (the **principle-prove-it-works** skill). A passing prior self-report is not the proof.

**Reply:** where the prior agent stopped, what you inherited vs redid (ideally nothing redone), the resume point, and the outcome.
