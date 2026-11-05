---
name: pstack-pi
description: "Portable runtime adapter for poteto-mode, with native OMP task dispatch, discovery, model routing, lifecycle, and explicit capability boundaries for other hosts."
---

# pstack runtime adapter

`poteto-mode` is the sole router. It selects the playbook, canonical role, step order, and lifecycle protocol. This adapter translates those choices to the live host; the task examples below target native OMP, not stock Pi. It never selects a playbook, repeats the playbook index, or changes a playbook gate. Follow [the portable runtime contract](references/runtime.md) for discovery, installation, and other hosts.

While this skill is active, its role map is the specific pstack execution contract. Generic host instructions remain valid outside pstack work.

## Canonical role map

Use the live host's configured names. This reference mapping targets OMP, a
Pi-based runtime; other hosts must substitute their own names through the runtime
contract.

| Canonical role | OMP agent | Contract |
|---|---|---|
| `explorer` | `scout` | Read-only repository reconnaissance, trace reduction, narrow audits. |
| `watcher` | `scout` | Observe one exact generation or external-state transition, then terminate. |
| `planner` | Default worker (omit `agent`) | Technical planning, architecture, decomposition, sequencing, and non-visual design candidates. |
| `designer` | Default worker (omit `agent`) | Visual, interaction, and product-design candidates. |
| `reviewer` | `reviewer` | Independent code, protocol, behavioral, or security review. |
| `researcher` | Default worker (omit `agent`) | Source-verified external library, framework, API, protocol, and version research. |
| `synthesizer` | `reviewer` | Cross-report synthesis, adjudication, and advisory judgment over frozen evidence. |
| `implementer` | Default worker (omit `agent`) | Bounded implementation or test changes with explicit write ownership. |
| `owner` | Default worker (omit `agent`) | One coupled multi-step implementation session retained through IRC follow-ups. |
| `mechanical` | `sonic` | Fully specified low-judgment edits. Ambiguity returns to the root. |

The live `task` inventory is authoritative. Stock OMP bundles `scout`,
`reviewer`, `security-reviewer`, `task`, and `sonic`; historical consultation may
also expose `seance`. `designer` and `librarian` are not bundled selectors.
Canonical role labels and model aliases are not agent names. Omit `agent` for
the default worker; put a specialist selector on the individual task item.

`poteto-agent` and `comment-sicko` are custom compatibility agents for direct
named seams in imported skills. Use them only after the live inventory confirms
loading from the package/plugin or project `.omp/agents/`. Discovering skills
alone does not install agent definitions.

### Planning distinction

The imported warning about a built-in planning subagent describes a source-host mechanism bypassed by this skill contract. OMP has no bundled `plan` or `designer` agent. Canonical `planner` work uses the default worker with a technical-planning brief and does not pass source-host subagent fields.

### Security review

Use `security-reviewer` for an independent security lane. Keep it read-only and separate from ordinary code review when both are required. A later `reviewer` session may synthesize frozen reports; it does not replace the primary security review.

## Task contract

The root coordinator performs every `task` call through the host task facility. A child never calls `task`, starts another child, or asks the user directly. Put `Do not call task or start subagents` under `FORBIDDEN` in every child brief.

Children start without the parent conversation. Every prompt must stand alone. OMP supplies discovered skills, workspace and approved-plan resources, but does not carry parent context files named `AGENTS.md` into children; include essential constraints in the brief.

### One task

When the flat schema is active:

```json
{
  "name": "ParserOverflowWorker",
  "task": "Fix the parser overflow in the assigned paths. Include the complete standalone brief here.",
  "solutionSpace": "One known overflow cause; choose the smallest safe bounds check."
}
```

When batch mode is active, use a one-item `tasks[]` call instead of inventing a per-call batch switch.

Set `isolated: true` only when the live schema exposes it and a writer needs a separate workspace. Read returned isolation metadata and verify the patch, branch, or applied change reported. Without that field, use disjoint write scopes or serialize coupled writers. Non-isolated sessions support long-lived owners in the shared workspace.

### Batched panel

Use one batch call for independent participants:

```json
{
  "context": "Shared immutable repository, base SHA, artifacts, constraints, and verification context.",
  "tasks": [
    {
      "name": "CandidateA",
      "task": "Standalone brief for architecture candidate A, including its read-only scope.",
      "solutionSpace": "Architecture choice open; compare a state machine with the current flow."
    },
    {
      "name": "CandidateB",
      "task": "Standalone brief for architecture candidate B, including its read-only scope.",
      "solutionSpace": "Architecture choice open; seek a simpler alternative to a state machine."
  ]
}
```

Each `name` is unique. `context` contains common immutable material. Each item still names its exact role, slice, acceptance criteria, verification, forbidden work, and report contract.

Start every participant in one batch before consuming any verdict. Separate writers with isolated workspaces or disjoint output paths. Freeze candidate artifacts before starting reviewers. Freeze reviewer reports before starting a separate synthesizer session.

### Background completion and follow-ups

Background task results arrive through the host's async result delivery. Record the returned job and agent identifiers. The preview may be truncated.

- Read the full result from `agent://<id>`.
- Read the session transcript from `history://<id>` when the report is incomplete, ambiguous, or suspicious.
- Inspect live jobs with `read proc://`; use `wait` only when blocked on required work, not to poll.
- Send an in-scope correction, answer, authorization, or next coupled phase with `write agent://<id>`.
- Cancel stale or scope-breaching work with `write proc://<id>/kill` (omit content).
- A follow-up to a parked session revives the same session when the host reports that capability.
- Never steer a reviewer toward a preferred conclusion.
- Ignore duplicate terminal deliveries and reject stale artifact generations.

A task result is evidence, not completion. The root inspects the artifact and runs verification.

## Brief shape

A dispatch is forbidden until its brief contains:

**GOAL**  
One-sentence outcome executable by a stranger.

**ROLE**  
The canonical role, mapped OMP agent, authority, and expected stance.

**SCOPE**  
Writable and non-writable paths, exact slice or race arm, worktree and branch where applicable, and every output path. State the one-writer assignment.

**CONTEXT**  
Repository root, relevant source paths, base SHA, frozen artifacts, active skill and playbook paths, settled assumptions, and known gotchas.

**ACCEPTANCE**  
Checkable observable outcomes, one per line.

**VERIFY**  
Exact commands, fixtures, runtime probes, comparison baselines, environment requirements, and known false-positive or false-negative risks.

**TIMEBOX**  
A rough cap. At the cap, return partial evidence and stop instead of broadening scope.

**FORBIDDEN**  
At minimum: no child task calls; no subagent spawning; no out-of-scope fixes; no unrequested migrations; no shared-path edits outside ownership; no merge; no direct user questions; no completion claim without executed verification.

**REPORT**  
Require `PASS | ISSUES | BLOCKED`, semantic session name, branch and exact SHAs where applicable, verdict and evidence, changed files or artifacts, actual verification commands and results, deviations, unresolved risks, and parent actions.

**STANDING**  
Copy the active playbook's standing policy text verbatim when it supplies one.

## Canonical protocols

### Bounded session

1. Author one standalone brief.
2. Start one task with the mapped agent.
3. Record its semantic name, agent ID, job ID, role, scope, isolation mode, base SHA, and expected artifact.
4. Consume the async result when delivered.
5. Read `agent://<id>`; inspect `history://<id>` when needed.
6. Send one IRC correction only within the same unit.
7. Inspect the artifact and independently run the promised verification.
8. Accept the unit only after the parent verifies the reported output.

A role or unit change requires a fresh task.

### Panel

1. Partition independent slices or race arms with one task per participant.
2. Start every participant in one batch before consuming any result.
3. Track participants by semantic name and identifiers, never arrival order.
4. Receive required results through async delivery; use `wait` only when blocked. Cancel explicitly through `write proc://<id>/kill`.
5. Ignore duplicate terminal delivery.
6. Freeze implementation artifacts, branches, head SHAs, reports, and hashes.
7. Start every independent reviewer in a new batch only after the candidates are frozen.
8. Freeze verdicts before starting a separate `reviewer` when synthesis is needed.
9. Treat synthesis as advice. The root selects and verifies.

Do not mix implementers, reviewers, or synthesizers in one session. Do not let reviewers race a moving head.

### Long-lived owner

1. Start one non-isolated `task` session with the complete owner brief.
2. Record its agent ID and reuse it. Do not start a sibling owner for the same unit.
3. The owner works only in its assigned branch and paths and never starts children.
4. Send an in-scope follow-up with `write agent://<id>` only for the next coupled phase, a correction within the same unit, an evidence-backed answer, or explicit authorization. Use the recorded live owner identifier; do not assume a separate hub tool exists.
5. Require a terminal report at each verification boundary.
6. Independently verify the boundary before authorizing the next phase.
7. Stand down on ownership violation, stale generation, or terminal scope breach.

### One-shot watcher

1. Start one background `scout` task.
2. Put the exact branch, head SHA, generation, watched predicate, stop predicate, and timebox in the brief.
3. Require one meaningful event and a terminal report.
4. Discard a report whose generation no longer matches.
5. Start a fresh watcher for each new generation.
6. Stand down when the stop predicate is met or the work is superseded.

A watcher observes. It does not fix, merge, authorize, or silently follow a changed head.

## Interactions and decisions

Children resolve uncertainty from source, standing policy, frozen evidence, or the brief. Otherwise they use the safest reversible interpretation and report the assumption, or return `BLOCKED` with the exact missing decision and evidence gathered.

The root resolves a child question and sends the answer through `write agent://<id>`. Ask the user only for a genuine product preference, unavailable authority, or irreversible action not covered by standing orders.

## Ownership and verification

- One writer per branch, worktree, mutable state, and output path.
- Separate sessions own implementation, review, judgment, and synthesis.
- A task stays inside its assigned unit and role.
- Isolate concurrent writers unless their outputs are structurally disjoint.
- A worker's report never verifies its own work.
- Record branch, base SHA, and exact head SHA or artifact generation.
- Prefer behavioral proof over type-check-only evidence.
- A new commit, restack, conflict resolution, or applied patch creates a new generation that voids the prior verdict.
- Judges and synthesizers advise. The root owns selection, user interaction, external writes, merges, deletion, and final truth.
- Claim model independence only from returned resolved-model and fallback metadata.

## Model routing

OMP resolves a task agent through its current settings, including `modelRoles`, `task.agentModelOverrides`, the agent definition, and normal fallback. Agent selection and model selection are separate decisions.

Prefer configured routing and omit task-item `model`. Per-call selection defaults
to off; it requires operator permission through `task.perCallModel` and an
approved exact model. Project settings cannot grant models. Never use a model
alias as `agent`.

OMP reads project `.omp/config.yml`, not `$PSTACK_CONFIG` or `.pi/settings.json`.
`modelRoles.<role>` maps an alias to a confirmed model selector;
`task.agentModelOverrides.<agent>` can reference that alias. Preserve unrelated
settings and existing routing. Agent overrides apply to every use of that agent,
not separately to each pstack workflow role. For example, planning and
implementation both use the default worker unless a custom installed agent
separates them. Report this limitation instead of claiming independent routing.

The portable `.pstack/config.md` preference file does not activate model routing.
Confirm the actual resolved model in task results when independence or diversity
matters. OMP aliases such as `@task`, `@smol`, and `@advisor` are model roles,
not promises of particular providers or capabilities.

## Writing

Apply `unslop` to every reply, brief, report, review, task dispatch, commit message, and agent-facing edit.
