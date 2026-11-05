### Autopilot-stack

Run `skill://poteto-mode/playbooks/autopilot-full.md`, but do not merge.

1. **Replace step 5 with a verified handoff.** Stop when every PR is verified and green at its current head. Neither root nor owners merge, close, or arm auto-merge. Hand the PRs to the operator. After handoff, nobody pushes without the operator's go. Every root-controlled audit prompt names this file so the no-merge rule survives each wake.
2. **Stack only dependent work.** This is the exception to Autopilot-full step 3. A PR that builds on another PR targets that PR's branch per **Size and stacks** in `skill://poteto-mode/playbooks/opening-a-pr.md`. Rebase each child onto its parent's exact tip and the stack root onto trunk. When a lower head changes, restack its descendants. An unchanged patch-id preserves a verdict per **Shipping**. The root is the sole topology actor and authorizes each parent/base change. Owners report their tip and intended parent and push only their assigned branch with a SHA-pinned lease. Independent PRs stay off trunk as separate branches, not an artificial linear stack. Graphite is optional, not required.

**Reply:** list every PR and current-head verdict in place of what merged, in dependency order, with links, open gates, and parked follow-ups.
