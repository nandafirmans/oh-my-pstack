# OMP compatibility evidence

## Scope and revisions

This audit targets OMP 18.18.0 without redesigning pstack. Initial package HEAD
was `126a674755d16b22087b0420cd3794c827fb5c09` on clean `main`.
The installed CLI reported `omp/18.18.0`.

Exact upstream tags compared locally:

- [18.16.0](https://github.com/can1357/oh-my-pi/tree/650f3a108229ee11bf68ba3377f4e8c3391cd424) resolves to `650f3a108229ee11bf68ba3377f4e8c3391cd424`.
- [18.18.0](https://github.com/can1357/oh-my-pi/tree/b5a6b2f7e5b6606b6562e678ead83f21738f34a0) resolves to `b5a6b2f7e5b6606b6562e678ead83f21738f34a0`.
- Official release notes for [18.17.0](https://github.com/can1357/oh-my-pi/releases/tag/v18.17.0) and [18.18.0](https://github.com/can1357/oh-my-pi/releases/tag/v18.18.0) supplement the [exact comparison](https://github.com/can1357/oh-my-pi/compare/v18.16.0...v18.18.0).

No confirmed OMP schema or discovery incompatibility required a package manifest,
agent definition, or playbook replacement. The adapter's existing batch JSON
example was malformed. Its missing object brace is fixed, and `npm run verify`
now parses native adapter JSON examples. Changes also add native regression
checks and clarify manual discovery, configured effort, host authority, and accounting.
Cursor synchronization ownership and protected paths remain unchanged.
Other hosts retain their existing manifests and adapters. This audit does not
claim fresh runtime execution on Pi, OpenCode, Claude Code, or Codex.

## Tagged behavior and compatibility decisions

| Area | Source finding | Package decision |
| --- | --- | --- |
| Skill discovery | `loadSkills` adds `manualSkills` glob matching and sets `hide`, without removing matching skills. Existing plugin/custom-directory discovery remains. | Keep the manifest. Test manual commands and URI reads separately from catalog visibility. |
| Native invocation | RPC resolves registered `/skill:` names, loads their files, and emits native `skill-prompt` details. An unknown name can fall through to ordinary prompting. | Require capability preflight and exact invocation provenance. An acknowledgement is insufficient. |
| Task schema | `task/types.ts` and `task/agents.ts` have no changes between the compared tags. Flat/batch and optional isolation/effort remain settings-dependent. | Keep default-worker omission and per-item specialist selection. Inspect the live schema instead of sending guessed fields. |
| Worker threads | 18.17.0 adds placement across main and worker threads. Default cap is 4 workers. The first worker becomes eligible at 9 concurrent runs. | Treat placement as an implementation detail. It grants neither stronger tools nor workspace isolation. Do not spawn extra work to reach the threshold. |
| Extension providers | 18.18.0 fixes custom `streamSimple` models crossing threads by sending cloneable tool definitions. | The offline fixture exercises the main thread. Worker-thread provider execution is source-audited only, not runtime-tested here. |
| Model policy | Configured agent overrides, frontmatter, aliases, and fallback remain distinct. Per-call model approval code is unchanged. User `^model:level` tags now take precedence over task effort. | Preserve configured routing and effort. Do not pass per-call models merely because the schema includes `model`. |
| Agent frontmatter | Bundled definitions are unchanged. Native discovery exposes both package compatibility agents. | Keep existing tools, model lists, thinking fields, and bodies. Do not infer an OS sandbox from a read-only brief. |
| Isolation | `auto` can use ovnfs when available, otherwise native isolation. Retained workspace handling changes. Completed isolated tasks cannot be revived as owners. | Keep one writer per mutable resource. Inspect returned patch/branch/workspace metadata before integration. |
| Async delivery | Worker proxies retain root-owned job rows, delivery sinks, and owner filtering. Wait batching and idle backoff change. | Consume async results, use recorded IDs, and wait only when blocked. Avoid timing assumptions or polling loops. |
| IRC and continuation | Child broadcasts now fail. Direct messages remain supported. Revival preserves agent-scoped request budgets, and parked descendants no longer retain their whole parent session. | Keep root dispatch and direct bounded follow-ups. Do not broadcast from children or recreate owners to reset limits. |
| Usage and caps | Discarded billed responses retain usage. Session-tree cost caps propagate to active children. Parent statistics add child usage from `task` result details. | Reconcile parent and child records. Do not equate parent RPC totals, live tree cost, provider billing, and host token limits. |
| Cancellation and timeouts | RPC cancellation resolves an owned child. Runtime monitoring still uses `task.maxRuntimeMs`. Abort fixes prevent descendant-held output pipes from hanging. | Cancel only owned recorded jobs and observe termination. No package retry scheduler or timeout bypass. |
| Task files and MCP | 18.18.0 binds task-file dispatch to approved targets, preserves assignment whitespace, and scopes concurrent MCP tool loads to the caller. | No pstack API change. These host fixes need regression coverage, not new permission grants. |

Pinned source references:

- [Skill loading](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/extensibility/skills.ts) and [skill URI resolution](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/internal-urls/skill-protocol.ts).
- [RPC invocation and owned subagent commands](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/modes/rpc/rpc-mode.ts).
- [Task schema](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/types.ts), [bundled agents](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/agents.ts), and [settings](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/settings.ts).
- [Model approval](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/model-approval.ts) and [effective subagent policy](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/structured-subagent.ts).
- [Worker placement](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/thread/subagent-worker.ts), [execution and timeout monitoring](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/executor.ts), and [persisted revival](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/task/persisted-revive.ts).
- [Async ownership](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/async/job-manager.ts) and [direct-message/broadcast policy](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/irc/messaging.ts).
- [Active session statistics](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/session/session-stats.ts), [persisted usage](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/session/session-manager.ts), and [shared cost gate](https://github.com/can1357/oh-my-pi/blob/b5a6b2f7e5b6606b6562e678ead83f21738f34a0/packages/coding-agent/src/session/cost-gate.ts).

## Provider-free native regression check

Run separately from Cursor upstream synchronization:

```bash
PSTACK_OMP_NATIVE_TESTS=1 npm run test:omp
```

Without the opt-in environment variable, tests skip without launching OMP.
`PSTACK_OMP_BIN` selects an explicit executable. `PSTACK_OMP_VERSION` selects the
expected version string, defaulting to `18.18.0`. Changing that expectation alone
is not evidence of compatibility with another release.

The check launches the actual installed CLI in disposable namespaces. It isolates
HOME, XDG directories, agent state, and the project `.omp` anchor. It loads this
checkout with `--plugin-dir`, not by copying skills into OMP source. The test
extension registers a deterministic in-process stream. No real model inference,
provider credentials, global installation, or global configuration is used.
Every process has an outer test deadline, a CLI time limit, and a shutdown path.

The scripted stream emits fixed reads or task calls. Native OMP still performs
discovery, expansion, schema handling, tool execution, and session recording.
This distinguishes native runtime proof from static validation, but does not
establish that a model independently chose a playbook or followed its workflow.
The router's catalog and loaded playbook paths are checked. Semantic selection
requires a separately authorized real-provider test.

Missing-plugin, disabled-skills, and disabled-command controls establish that a
host can reject missing capabilities before submitting work. The package does
not patch OMP to reject all unknown slash commands. URI read failures remain
errors, not successful execution evidence.

No automatic GitHub workflow downloads or executes a new OMP binary. The separate
`test:omp` command is the compatibility regression entry point. Hosted CI and
real-provider checks remain separate commissioning decisions.

## Executed verification

| Check | Observed result |
| --- | --- |
| Native OMP 18.18.0 | Six provider-free tests passed. Both skills were discovered and invoked with native provenance. Every router-linked playbook URI loaded. |
| Manual visibility and negative controls | Catalog visibility changed with `manualSkills`. Native commands and reads survived. Missing plugins, disabled skills, and disabled commands failed capability checks. |
| Native task capabilities | Flat/batch, isolation-field, and effort-field discovery passed. All bundled selectors and both package agents appeared. |
| Native scripted delegation | Default worker, scout, reviewer, security-reviewer, and sonic completed a batch. Retained child transcripts confirmed the configured offline model and fixed response. |
| Native synthetic accounting | A synchronous child's 10 synthetic tokens plus two parent responses produced 30 total tokens, with no double counting and zero cost. These fixture counters are not provider billing. |
| Completion observation | `get_subagents` drops terminal entries. Subscribed lifecycle completion events and retained transcripts supplied completion evidence instead. |
| Adapter example regression | The initial HEAD's batch example failed JSON parsing. Corrected examples parsed. |
| Static validation and sync | `npm run verify` and all 44 `npm run test:sync` tests passed. JavaScript syntax and `git diff --check` passed. |
| Bundled Bun and TypeScript | All 62 watcher/planning tests passed. Watcher strict TypeScript and statechart TypeScript passed. |
| Statechart with checksum-pinned TLC | 267 passed and 100 failed. The environment lacks Java, with `spawn java ENOENT` in the failures. This suite is not green. No statechart code was changed. |
| Shell syntax | `bash -n` passed for both bundled shell scripts. No root lint script or build was run. |

The native probe initially assumed that the live roster retained completed agents
and that RPC `systemPrompt` was a string. Tagged source and actual output showed
that it is a live-only roster and an array of prompt blocks. The probe now checks
terminal lifecycle events, persisted child messages, and joined prompt blocks.
These were probe defects, not package incompatibilities.

## Accounting limits

`get_session_stats` adds usage from assistant messages and completed native
`task` tool-result details in the active transcript. Persisted totals also track
`subagentCost` separately. Live session-tree cost uses the native shared cost gate.
These views need not update together. In-flight child work, later parked-agent
follow-ups, cancellation before delivery, and external CLI processes are not
guaranteed to appear immediately or completely in the parent's token counters.
A host must reconcile recorded child usage without summing an already-included
child twice. Missing provider usage remains unavailable, not zero billing.

The monetary gate admits requests before dispatch and records cost after a
response finishes. Already-running requests can exceed a cap. Monetary caps do
not implement Backlog Web's cumulative token admission, fixed deadlines, recovery
authorization, or acceptance policy. Pstack must never raise those limits to
continue an exhausted run.

## Backlog Web integration

Public contract inspected at
[`a3d25edb0aac6b51746cf96526f01619400b3480`](https://github.com/nandafirmans/omp-backlog-web/tree/a3d25edb0aac6b51746cf96526f01619400b3480).

The [engineering adapter](https://github.com/nandafirmans/omp-backlog-web/blob/a3d25edb0aac6b51746cf96526f01619400b3480/server/engineering.ts)
requires both native skill commands and `task`. Fresh pstack runs invoke the
router once and observe prompt-bound provenance. Continuations retain the
original methodology and investigation. Standard mode bypasses pstack discovery
and activation. Both modes retain host-owned ticket admission, recovery,
limits, workspace ownership, independent acceptance, guarded local publication,
and Done/blocker transitions.

A separate [audited-version guard](https://github.com/nandafirmans/omp-backlog-web/blob/a3d25edb0aac6b51746cf96526f01619400b3480/server/drafting.ts)
accepts 18.12.6, 18.13.1, 18.13.3, and 18.16.0, not 18.18.0. Therefore this package's
native compatibility does not make that host's 18.18.0 integration commissioned.
No Backlog Web files or guard were changed. Its own startup-isolation audit and
authorized integration verification remain necessary. Do not spoof the version,
change methodology, or expand permissions to bypass that guard.

## Unverified execution paths

No real-provider delegation or independent model-backed review was authorized or
run. Real provider authentication, fallback, user-tagged effort, model diversity,
worker-thread provider execution, OS isolation backends, parked-session revival,
live cancellation under inference, older OMP binary execution, and semantic playbook selection remain
unverified here. Source findings above describe contracts, not executed claims.
No full Backlog Web ticket lifecycle, global OMP update, commit, push, PR, merge,
or publication occurred.
