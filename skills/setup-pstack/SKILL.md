---
name: setup-pstack
description: Configure host-supported roles, models, and reasoning budgets pstack uses per workflow role. Detects live host inventory and writes portable project-local configuration. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's role choices.
---

# Setup pstack

Follow the [portable runtime contract](../pstack-pi/references/runtime.md) throughout this setup.

Write optional pstack workflow preferences at `$PSTACK_CONFIG` when set; otherwise use `.pstack/config.md` in the current project. This Markdown is not OMP runtime configuration. Native OMP routing belongs in project `.omp/config.yml`; `.pi/settings.json` and `opencode.json` configure other hosts, not OMP. Never write to a vendor-specific home directory.

## Steps

Model discovery and model assignment are different capabilities. A model listed by
`pi --list-models` is available to the current Pi process, but that does not mean a
workflow can send work to it. Per-role assignment also requires a host task or
subagent facility that accepts a model choice. Native Pi intentionally does not
include subagents. Do not claim that a role was assigned when that facility is
absent.

### OMP native delegation

OMP already includes `task`; no subagent extension is required. Discover exact
agent selectors from the live task inventory and model choices through
`omp models --json` or `/model`. Do not run `models refresh` just to inspect
choices. Stock selectors include `scout`, `reviewer`, `security-reviewer`, the
default worker (omit `agent`), and `sonic`; do not assume `designer` or `librarian`
exists. Confirm that package agents `poteto-agent` and `comment-sicko` loaded
before selecting them.

Route through `.omp/config.yml` using `modelRoles` and
`task.agentModelOverrides`; inspect current configuration before choosing.
Per-call `model` is off by default even though the field appears in the schema.
It needs operator authorization and approved exact models; a project cannot
enable or grant that authorization. Do not install `pi-subagents`, use
`/subagents-doctor`, or write `.pi/settings.json` for OMP.

### Pi delegation prerequisite

For native Pi, recommend the maintained `pi-subagents` package when the user wants
parallel workers or per-role models:

```bash
pi install npm:pi-subagents
```

Tell the user to restart Pi after installation, then run `/subagents-doctor`.
Continue setup only when the `subagent` tool and the expected agents are visible.
The package supplies the delegation facility; it does not choose pstack's model
policy by itself.

### OpenCode delegation prerequisite

OpenCode has its own native primary and subagent agents. Do not install
`pi-subagents` or write Pi-specific settings when the current host is OpenCode.
Use the agents and concrete `provider/model-id` choices reported by OpenCode, and
keep their model configuration in the host's `opencode.json` or
`opencode.jsonc`. If OpenCode does not expose a usable subagent, report that
limitation instead of substituting a Pi-specific mechanism.

### 1. Detect available choices

Detect both of these independently:

1. The model IDs the current host actually exposes.
2. Whether the current host exposes a task or subagent facility that can select a
   model for each child.

For Pi, `pi --list-models` is the model inventory and the `provider/model-id` form
is the concrete value to record. With `pi-subagents` installed, the `subagent`
tool and `/subagents-doctor` establish the delegation inventory. The live host
inventory is authoritative. Never copy a vendor slug from prose or guess that a
model is available.

For OMP, also read the effective native role and agent overrides. Model listing
does not prove credentials work or that a request has run. Shared agent routing
is not independent workflow-role routing: stock planning, design, research,
implementation, and owner briefs may all use the default worker. If their
requested models differ, report the conflict and offer a shared agent choice
or existing distinct agents. Do not silently use the last assignment or create
an extension to simulate unsupported routing.

If the host has a task facility but cannot enumerate models, use only a host role
mapping that the facility documents. Do not ask the user to invent a raw slug.
`inherit-parent` is valid only when the host can pass the current model to a child.

### 2. Load current state

Read the selected configuration path when it exists and treat its concrete values
as current choices, including its `# budget` line when present. If it contains only portable role aliases from a host without
per-child delegation, treat those aliases as stale inactive state and start from
the detected models instead of carrying them into Pi's agent overrides.

Drop retired role entries not listed in step 5, including `how critics`, and show the dropped lines during confirmation. Preserve the portable split `reflect judgment`, `reflect divergent`, and `reflect synthesizer` entries; they remain active roles.

### 3. Budget, map, and confirm

When model inventory and per-child model selection are available, ask for a budget using the host's structured interaction facility when available, otherwise one focused chat question. Offer these exact labels, naming the current budget when recorded:

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

With no configuration, start at `large` as the requested target, not a claim that the host supports xhigh. Build the working table from host-supported workflow defaults, preserving any existing family, panel list, or supported alias choices on a re-run. Apply the target effort `max`, `xhigh`, `high`, or `medium` to each concrete choice, including panel entries. Leave supported `auto` and `inherit-parent` aliases unchanged. Use the host's separate reasoning controls when it exposes them; do not fabricate provider/model IDs by appending an effort token.

If the host encodes effort in confirmed model slugs, the effort token is the last token, or the one before a trailing `fast`, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. Use only a detected variant. If the target is unsupported, use the same family's detected choice with the highest effort at or below the target; if none exists, mark the role as needing a choice. Preserve speed where supported. A family's highest supported effort may be below `max`; report that ceiling rather than claiming the requested level ran. When no effort control or known variants exist, keep the confirmed model, explicitly mark the budget unavailable for that role, and ask for a supported choice rather than guessing.

Show every role with its concrete choice, applied effort, and any unavailable target or explicit model absent from the live inventory. List each retired line dropped in step 2. Ask the user to accept or change choices, offering only detected model IDs and aliases the host supports. Use the host's structured interaction tool when available; otherwise ask one focused question in normal conversation.

If the host exposes models but no task or subagent facility, stop model mapping
with an explicit capability report. For native Pi, recommend
`pi install npm:pi-subagents`, a restart, and `/subagents-doctor`. For OpenCode,
explain that its native agents are not visible or configured and point the user
to the host's agent configuration. For any other host, name the missing
capability without proposing a vendor-specific substitute. Say that no pstack
role can receive a different model in this session and do not present the
portable defaults as an assignment or overwrite an existing role configuration
with inactive aliases.

For panel roles (`arena runners`, `architect runners`, `interrogate reviewers`), one child runs per entry, aliases included, so list length controls fan-out. Prefer diversity for judgment-sensitive panels. `arena cross-judge pool` is an ordered preference list for one judge, not a fan-out: Arena tries only choices from another model family when identity is known; `auto` and `inherit-parent` never judge. `swarm workers` is the default choice for every worker unless a race assigns a different choice per arm.

### 4. Validate

Every explicit model written must be present in the detected host inventory. Validate any separate reasoning or speed setting against the host's capabilities too.
Role aliases pass only when the host task facility documents those aliases.
`inherit-parent` passes only when the host can pass the current model to a child. If
a selected explicit model is unavailable, stop and ask for a replacement. Never
write a configuration that requires another host.

On OMP, validate aliases against configured/built-in `modelRoles`, not the agent
inventory. `inherit-parent` is a portable preference, not a native selector:
omit model routing only after checking that no agent override or frontmatter
already chooses another model. Per-call models must pass the operator's policy,
not merely exist in the model inventory. Translate a confirmed thinking target
using OMP's supported `:level` model-selector suffix or exposed effort controls,
bounded by the selected model and `task.maxEffort`; do not invent effort-tier IDs.

### 5. Write the configuration

When the host supports per-child selection, create the parent directory when
needed and overwrite the selected file so re-runs remain idempotent. Include a `# budget` line naming the chosen label and target effort, and record per-role applied effort or unsupported targets when the host uses separate controls. Use concrete
detected model IDs in this shape. Replace every placeholder with a model the
current host reported, and use `inherit-parent` only when the host supports it:

```md
# pstack role and model configuration
# budget: large (xhigh target; actual effort must be confirmed per role)
# Values are concrete provider/model-id choices confirmed by the host.
feature, refactoring: <implementer-model>
bug-fix: <reviewer-model>
perf-issue: <reviewer-model>
hillclimb: <implementer-model>
judgment and prose: <reviewer-model>
hardest tasks: inherit-parent
how explorer: <explorer-model>
how explainer: <synthesizer-model>
why investigators: <researcher-model>
why synthesizer: <synthesizer-model>
reflect tooling: <researcher-model>
reflect judgment: <reviewer-model>
reflect divergent: <designer-model>
reflect synthesizer: <synthesizer-model>
arena runners: <designer-model>, <implementer-model>
arena cross-judge pool: <reviewer-model>, <designer-model>
swarm workers: <implementer-model>
architect runners: <designer-model>, <reviewer-model>
interrogate reviewers: <reviewer-model>, <designer-model>
```

For OMP, preserve unrelated `.omp/config.yml` keys and merge only confirmed
routing. Map each exact agent selector to a role alias with
`task.agentModelOverrides`, and map that alias to a confirmed selector with
`modelRoles`. For example, after replacing every placeholder from the live
inventory:

```yaml
modelRoles:
  pstack_worker: <confirmed-provider/model-id>
  pstack_review: <confirmed-provider/model-id>
task:
  agentModelOverrides:
    task: "@pstack_worker"
    reviewer: "@pstack_review"
    security-reviewer: "@pstack_review"
```

These entries affect every dispatch of the named agent, including non-pstack
work. Only write entries the user selected, including overrides for any installed
compatibility agents when required. Do not convert panel lists to OMP fallback
model arrays: participant count and model fallback are different semantics.
If a role or panel needs distinct models on one shared selector and per-call
selection is unavailable, keep the preference explicitly inactive and report the
unresolved routing instead of claiming it was applied. No separate pstack config
loader or runtime extension is required.

For Pi with `pi-subagents`, also preserve unrelated keys and update the project's
`.pi/settings.json` with the concrete model assignments for the discovered
subagent names. Use this mapping unless the user chooses different agents:

| pstack role | pi-subagents agent |
| --- | --- |
| `explorer`, `watcher` | `scout` |
| `researcher` | `researcher` |
| `implementer`, `mechanical` | `worker` |
| `reviewer` | `reviewer` |
| `planner`, `designer`, `synthesizer` | `oracle` |
| `owner` | `delegate` |

Write the selected IDs under `subagents.agentOverrides.<agent>.model`:

```json
{
  "subagents": {
    "agentOverrides": {
      "scout": { "model": "<explorer-model>" },
      "researcher": { "model": "<researcher-model>" },
      "worker": { "model": "<implementer-model>" },
      "reviewer": { "model": "<reviewer-model>" },
      "oracle": { "model": "<planner-model>" },
      "delegate": { "model": "<owner-model>" }
    }
  }
}
```

For OpenCode, do not write `.pi/settings.json`. Keep the concrete model choices in
the user's existing `opencode.json` or `opencode.jsonc`, and use the live
OpenCode agent names in the pstack role map. Preserve unrelated configuration.

### 6. Confirm

If a concrete configuration was written, tell the user the exact path and list
the model IDs and applied reasoning levels assigned to each role family, the requested budget, and any unsupported targets or retired lines removed. For Pi, name both `.pstack/config.md`
and `.pi/settings.json`, and tell the user to run `/subagents-models` to inspect
the live mapping. For OpenCode, name the `opencode.json` or `opencode.jsonc`
path used. State that configuration does not create models, child agents,
permissions, or delegation facilities.

For OMP, name both the preference path and `.omp/config.yml`, list the exact
agent-to-role mappings actually changed, and identify workflow roles that still
share routing. Inspect native `/agents` and `/model` to review configuration;
claim execution only from returned resolved-model metadata, not from saved
preferences. Report per-call policy limits and unsupported panel diversity.

If the host lacks per-child model selection, report that no role configuration was
written or activated. Tell the user which model is active and how to switch the
single Pi session model.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof, such as a `verify-*` skill or an existing harness. If not, offer once to invoke the sibling **create-verification-skill** skill. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill that runs a model checker, proof, or another verifier against the code. If not, offer once to generate one with the sibling **create-formal-verification-skill** skill, so agents can prove a key property holds in every case in scope, not only cases tests reach. On yes, invoke that skill through the current host. On no, move on without pushing.
