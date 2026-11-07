# Portable pstack runtime contract

This file is the host-neutral binding for the imported pstack skills. Read it before
using any instruction that mentions a task runner, model, transcript, question tool,
skill path, or long-running loop.

## Host selection

Use the capabilities exposed by the current agent host. Do not assume Cursor,
Claude Code, Codex, OMP, a particular CLI, or a particular model vendor. When a
capability is unavailable, preserve the workflow gate and use the nearest truthful
local equivalent. Do not claim a child, review, transcript, or live check happened
unless the host reported it.

When a host selects pstack as an engineering methodology, its authorization
contract remains authoritative over imported autonomy and shipping instructions.
The host owns ticket admission, recovery authorization, token and time limits,
workspace ownership, independent acceptance, guarded commits, and Done or blocker
transitions. Pstack does not grant publication rights, expand permissions, or add
another scheduler or retry loop. Standard OMP mode does not require pstack.

## Canonical roles

| pstack role | Required behavior |
| --- | --- |
| `explorer` | Read-only repository reconnaissance and trace reduction. |
| `watcher` | Observe one exact state transition, then terminate. |
| `planner` | Technical architecture, decomposition, and sequencing. |
| `designer` | Product, interaction, or alternative design candidates. |
| `reviewer` | Independent code, protocol, behavioral, or security review. |
| `researcher` | Source-verified external documentation and API research. |
| `synthesizer` | Adjudicate frozen reports without changing their evidence. |
| `implementer` | Bounded implementation or test changes with explicit ownership. |
| `owner` | One coupled implementation session retained through its lifecycle. |
| `mechanical` | Fully specified low-judgment edits. |

Map these roles to the live host's agent or task names. On stock OMP, use `scout`
for read-only repository discovery, `reviewer` for review and synthesis,
`security-reviewer` for security review, `sonic` for mechanical work, and the
default worker (omit `agent`) for implementation, planning, design, and external
research. `designer` and `librarian` are not bundled OMP agents. A role describes
the brief, not a guaranteed agent selector. Other hosts use their own inventory.

Every child brief must stand alone. It must name its goal, role, writable scope,
acceptance criteria, verification command, forbidden scope, and report format. A
child never starts children under this package's orchestration contract; the
root coordinator owns every dispatch.

## Models

Model inventory is not model delegation. A host may list models that the current
conversation can use without exposing any task or subagent facility that can send
a child to one of those models. Native Pi has this boundary: `pi --list-models`
and `/model` select the single active conversation model, while Pi does not
include built-in subagents.

OMP is a separate runtime with a built-in `task` tool; do not install
`pi-subagents` or write `.pi/settings.json` to configure OMP. Inspect the live
task schema and agents, and use `omp models --json` or `/model` for the model
inventory. OMP routes agents through `task.agentModelOverrides`, then agent
frontmatter `model`, then the parent model/default fallback. Role aliases such as
`@task` resolve through OMP's `modelRoles`; they are not agent names. Configure
project routing in `.omp/config.yml`, preserving unrelated settings.

OMP's per-call `model` is off by default. Its presence in the schema does not
authorize its use: `task.perCallModel` must permit the calling surface and the
exact model must be operator-approved. Project settings cannot grant per-call
models. Prefer configured routing and omit task-item `model`. An
`inherit-parent` preference is not a native model selector: omit a model override,
and first check whether agent-specific settings or frontmatter already route it.

Preserve configured model routing, thinking effort, and speed unless the operator
explicitly requests a change. Do not raise effort automatically from an imported
playbook's budget recommendation. Reuse established context and use one agent
when it can complete the task correctly. Model-backed compatibility checks require
explicit authorization, fixed limits, and opt-in execution. Exhaustion stops the
work under the host's contract, not a suggestion to increase its budget.

For native Pi, install the maintained `pi-subagents` package when per-role models
or parallel children are required:

```bash
pi install npm:pi-subagents
```

Restart Pi and run `/subagents-doctor`. Once the `subagent` tool is visible,
configure its `subagents.agentOverrides` in `.pi/settings.json`. The package's
built-in agents map to pstack roles as follows: `scout` for `explorer` and
`watcher`, `researcher` for `researcher`, `worker` for `implementer` and
`mechanical`, `reviewer` for `reviewer`, `oracle` for planning and synthesis, and
`delegate` for an `owner`.

Use concrete `provider/model-id` values only when the host exposes per-child model
selection and the value was confirmed in the live inventory. Use role aliases only
when the host explicitly documents a role-to-model mapping. `inherit-parent` means
the current conversation's model only when the host can pass it to a child. A
missing role entry means the host default. Panel lists control fan-out only when
the workflow defines them as participants; an ordered judge preference pool
selects one judge, not one child per entry.

When the host has models but no child delegation, do not write a role mapping that
looks active. Report the capability gap and tell the user to switch Pi's single
active model with `/model` or `pi --model provider/model-id`. Workflow skills still
run on that active model, but panel and child-agent behavior is unavailable unless
the user installs a host extension or uses a different runtime that provides it.

The optional preference path is `$PSTACK_CONFIG`. If unset, use
`.pstack/config.md` in the current project. This Markdown is read by pstack
workflows, not by OMP's settings loader: it neither creates agents nor changes
runtime routing. Reconcile preferences with the live routing before dispatch;
report a mismatch rather than claiming the preference ran. Do not write to a
vendor-specific home directory unless the user explicitly asks for it.

## Questions and interaction

Use the host's structured user-interaction tool when it exists. Otherwise ask one
focused question in the normal conversation. Never invent a vendor-specific question
tool name.
An observable fact belongs to a probe or verification run, not a user question.

## Skills and paths

Invoke skills by their host-supported skill name, normally `/skill:<name>` or `$name`.
Within this package, sibling files are under `skills/<name>/`. Do not use a
vendor-specific plugin path or assume a global installation path.

OMP discovers `<project>/.omp/skills/<name>/SKILL.md` (including ancestor project
roots), `~/.omp/agent/skills/<name>/SKILL.md`, installed plugin skill roots, and
the immediate children of `skills.customDirectories` in `.omp/config.yml`.
An arbitrary clone is not discovered automatically. For a clone at any path, set
`skills.customDirectories` to its absolute `skills/` directory, or launch with
`omp --plugin-dir /absolute/path/to/oh-my-pstack`. Read a loaded skill through
`skill://<name>` and its assets through `skill://<name>/<relative-path>`; these
addresses avoid global-path assumptions. Interactive invocation is
`/skill:<name> [arguments]` when `skills.enableSkillCommands` is enabled.

OMP 18.17.0 adds `skills.manualSkills` globs. Matching skills stay discoverable
through native commands and `skill://`, but disappear from the model catalog.
This differs from ignored skills, `--no-skills`, and disabled skill commands.
Keep automatically needed helpers visible unless the host explicitly loads them.
Before automated router invocation, check `get_available_commands` for both
`skill:poteto-mode` and `skill:pstack-pi`, and `get_state.dumpTools` for `task`.
An unknown `/skill:` command can fall through to ordinary prompting. Fail closed
on missing capabilities rather than treating a prompt acknowledgement as proof.

Native invocation provenance is a `custom` message with `customType: skill-prompt`.
Its `details` include `name`, resolved `path`, canonical `prompt`, and `lineCount`.
Observe that record for the exact submitted prompt. It proves expansion, not
semantic playbook selection, adherence, acceptance, or package revision.

Custom skill directories do not load this package's `agents/`. For native local
agents, copy the individual definitions into `<project>/.omp/agents/` (or use an
OMP package/plugin loading path that discovers its `agents/` root). The live task
inventory must confirm them before dispatch. OMP does not load direct
`.claude/agents` or `.codex/agents` directories as native task agents.

OpenCode's native Agent Skills loader looks in `.opencode/skills/` for a project or
`~/.config/opencode/skills/` globally. When installing this repository for
OpenCode, copy the contents of this package's `skills/` directory into one of
those locations. OpenCode loads a skill on demand through its native `skill`
tool; it does not automatically scan an arbitrary cloned repository directory.
OpenCode's built-in primary and subagents are the delegation surface. Use the
host's `opencode.json` or `opencode.jsonc` model configuration and live agent
inventory rather than assuming Pi's `pi-subagents` settings apply.


## Transcripts and history

Transcript-dependent skills accept an explicit transcript directory or host history
resource. Prefer `$PSTACK_TRANSCRIPTS_DIR` when the host does not expose a history
resource. Never scan another project or a global vendor transcript tree. If no
transcript source is available, report the gap and continue only with evidence that
does not require it.

On OMP, use `history://<id>` for current child transcripts when reports are
incomplete or suspicious. For an earlier-session consultation, use `seance`
with `sourceSession` when the live inventory exposes it; the consultation is
the historical read, so do not also scan or replay that session's `.jsonl`.
If `seance` is unavailable, report the missing consult capability rather than
claiming that ordinary file reading recreates the historical agent's context.

## Long-running work and verification

Use the host's durable goal, watcher, or loop facility when available. Otherwise keep
the predicate and checkpoint in a project-local decision trail. A timed heartbeat is
only a fallback. Re-arm a watcher after every state-changing wave.

The root coordinator owns user interaction, approvals, integration, and final
verification. A worker report is evidence, not proof. The root must inspect artifacts
and run the promised checks on the integrated result.

## OMP 18.18.0 compatibility

The [tagged-source audit and native regression checks](omp-compatibility.md)
cover discovery, invocation, task schemas, model policy, and accounting limits.
Worker threads change placement, not tool authority or workspace independence.
`task.workerThreads` defaults to 4, with the first worker eligible at 9 concurrent
subagent runs. `0` keeps runs on the main thread. Do not increase fan-out to use
workers. Isolated tasks require the exposed `isolated` field and separate host
authorization. Their completed workspaces are not resumable owner sessions.

Direct `agent://<id>` follow-ups remain supported. OMP 18.17.0 rejects child
broadcasts to `agent://all`; the root may still broadcast. Async results and
history identifiers remain scoped to the owning run. Cancellation must target
recorded owned jobs, not processes found by name.

Native session statistics include child usage carried in completed `task` result
details. Live tree cost and persisted session totals are different views.
Do not assume the parent's RPC token totals already include in-flight, parked
follow-up, cancelled, undelivered, or externally launched work. Reconcile child
records without double counting. Missing provider usage and pricing cannot prove
billing. Native monetary caps share session-tree spend and gate new requests;
in-flight requests can exceed the cap. They do not replace host token/time limits.
