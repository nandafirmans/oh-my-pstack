# oh-my-pstack

Portable, rigorous engineering workflows for [OMP](https://omp.sh/), Pi,
[OpenCode](https://opencode.ai/), Claude Code, Codex, and other hosts that support
the Agent Skills layout.

`oh-my-pstack` is a universal port of the original
[Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack). It keeps the
upstream workflow catalog, playbooks, principles, references, and verification
scripts while replacing Cursor-only runtime assumptions with a host-neutral
adapter.

## What is included

- 63 skills with supporting references, including the upstream pstack catalog.
- Benny's three fail-closed issue-triage/reproduction skills.
- `poteto-mode` for routing work through the right playbook.
- `pstack-pi` for translating roles, delegation, models, transcripts, questions,
  and long-running work to the active host.
- Native package metadata for OMP/Pi, Claude Code, and Codex, plus OpenCode setup
  guidance.
- Daily upstream synchronization that opens a verified pull request.

The original Cursor repository is the content authority. The dsebban repository
was used only as an early structural example; it is not an upstream source.

## Install

### Pi

Install the public GitHub package:

```bash
pi install https://github.com/nandafirmans/oh-my-pstack
```

Start Pi in your project:

```bash
pi
```

Use `pi list` to confirm the package. Use `pi update --extensions` to reconcile
installed Git packages, or `pi remove https://github.com/nandafirmans/oh-my-pstack`
to remove it. Pi packages run with full system access; review the source before
installing and keep the package pinned or update it deliberately.

For parallel workers and per-role model assignments, install Pi's delegation
extension too:

```bash
pi install npm:pi-subagents
```

Restart Pi and run `/subagents-doctor`. The extension provides the `subagent` tool
and built-in `scout`, `researcher`, `worker`, `reviewer`, `oracle`, and `delegate`
agents. It is separate from pstack because native Pi does not include subagents.

### OMP

Install from GitHub:

```bash
omp install https://github.com/nandafirmans/oh-my-pstack
```

OMP includes the native `task` tool; do not install `pi-subagents` for OMP.
For local development, load a checkout at any path:

```bash
omp --plugin-dir /absolute/path/to/oh-my-pstack
```


For project-local native discovery without registering a global plugin, merge
this into the target project's `.omp/config.yml` (replace the absolute path):

```yaml
skills:
  customDirectories:
    - /absolute/path/to/oh-my-pstack/skills
```

Custom skill directories load skills only. To load the two local compatibility
agents too, copy their definitions into the target project's `.omp/agents/`:

```bash
mkdir -p .omp/agents
cp /absolute/path/to/oh-my-pstack/agents/*.md .omp/agents/
```

Alternatively, place the skills directly under `.omp/skills/<name>/SKILL.md`.
OMP scans one level under a skills root, not arbitrary nested clone directories.
Read loaded skills through `skill://<name>` and invoke them interactively with
`/skill:<name>`. Confirm custom agents in the live `task` inventory or `/agents`;
do not assume skill discovery alone loads agents.

From the target project, inspect a discovered skill without a model prompt:

```bash
omp read skill://pstack-pi
```

### OpenCode

OpenCode natively loads Agent Skills from `.opencode/skills/` in a project or
`~/.config/opencode/skills/` globally. Install the repository and copy its skills
into one of those discovery directories:

```bash
git clone https://github.com/nandafirmans/oh-my-pstack.git \
  ~/.local/share/oh-my-pstack
mkdir -p ~/.config/opencode/skills
cp -R ~/.local/share/oh-my-pstack/skills/. ~/.config/opencode/skills/
```

Start OpenCode in your project. The skills appear through OpenCode's native
`skill` tool; ask it to load `setup-pstack` or `poteto-mode` by name. To update,
pull the repository and repeat the copy step:

```bash
git -C ~/.local/share/oh-my-pstack pull --ff-only
cp -R ~/.local/share/oh-my-pstack/skills/. ~/.config/opencode/skills/
```

For project-local installation, use `.opencode/skills/` instead:

```bash
git clone https://github.com/nandafirmans/oh-my-pstack.git .pstack-source
mkdir -p .opencode/skills
cp -R .pstack-source/skills/. .opencode/skills/
```

OpenCode already provides primary and subagents. Configure their models through
your normal `opencode.json` or `opencode.jsonc` settings, then ask `setup-pstack`
to map pstack roles to the agents your OpenCode installation exposes.

### Claude Code and Codex

Clone or download the repository, then add it through the host's local plugin
workflow. Claude Code reads `.claude-plugin/plugin.json`; Codex reads
`.codex-plugin/plugin.json`. If plugin installation is unavailable, point the
host's Agent Skills configuration at the repository's `skills/` directory.

## Quick start

Start substantial work with `poteto-mode`. Use `pstack-pi` when a workflow needs
delegation or host-specific lifecycle behavior.

All hosts share the same skill content. The runtime adapter maps canonical pstack
roles to the capabilities actually exposed by the host. Missing integrations are
reported honestly and fail closed; for example, Benny requires an available
Slack/tracker/control adapter rather than pretending those tools exist.

## First-time setup

After installing, start a fresh agent session in the project you want to work on.
Run the setup skill once:

```text
/skill:setup-pstack
```

Use the host's native invocation syntax: OMP uses `/skill:setup-pstack`; hosts
that support `$setup-pstack` may use that instead. Setup detects available roles
and models, then records workflow preferences in `.pstack/config.md` (or
`$PSTACK_CONFIG`). That Markdown does not configure OMP routing.

On OMP, project routing is in `.omp/config.yml`: `modelRoles` maps aliases to
confirmed model selectors, and `task.agentModelOverrides` routes exact agent
names through those aliases. Stock planning, design, research, and implementation
can share the default worker, so different workflow preferences do not guarantee
different runtime models. Per-call `model` is off by default and requires
operator-approved models; project settings cannot grant them. Setup must report
unapplied preferences rather than claim independent routing.

Native Pi has no built-in subagents. For its parallel/per-role behavior, install
`pi-subagents`, restart Pi, and run `/subagents-doctor`; setup then updates Pi's
`.pi/settings.json` `subagents.agentOverrides` as well as pstack preferences.
Without that extension, use `/model` or `pi --model provider/model-id` for Pi's
single session model. These Pi settings do not configure OMP.

Then route your first real task through the main workflow:

```text
/skill:poteto-mode add a small feature and prove it works end to end
```

The setup skill may offer to create a project verification skill when the project
has no existing way to exercise the real application. Accept that offer when you
want repeatable behavioral proof; otherwise setup finishes without changing the
project. Read `skills/setup-pstack/SKILL.md` for the complete setup contract.

## Automatic upstream updates

`.github/workflows/upstream-sync.yml` checks the original pstack `main` branch
daily at 04:17 UTC (`17 4 * * *`) and supports manual `workflow_dispatch` runs.
The workflow must be present on the repository's default branch for scheduled
runs and the manual dispatch entry point to be available. GitHub may delay
scheduled runs. The pinned baseline lives in `upstream.lock.json`.

The updater fetches the latest upstream revision, normalizes known Cursor
runtime bindings for portable hosts, and updates upstream-owned files. It
preserves OMP adapters and protected portability adaptations. If upstream
changes a protected path, the update stops before writing managed changes.
The workflow then prepares reconciliation proposals and retains them as the
`pstack-protected-review` artifact. Proposals are not approvals: a maintainer
must reconcile the protected files and supply a `--reviewed FILE` manifest
bound to the exact baseline, upstream revision, protected paths, and local
file hashes. Stale manifests and unresolved merge markers fail closed.

Safe updates run the shared `.github/actions/validate` action before the
workflow opens or updates a pull request. The same action runs in
`.github/workflows/validate.yml` for pull requests, pushes to `main`, and manual
dispatches, with read-only `contents` permission. It checks package metadata
and skills, updater scenarios, whitespace, bundled Bun tests and TypeScript,
shell syntax, and the statechart integration with checksum-pinned TLC.

The sync workflow retains `contents: write` and `pull-requests: write` so it can
push its update branch and create a PR. A repository administrator must also
enable **Settings > Actions > General > Workflow permissions >
Allow GitHub Actions to create and approve pull requests**. This fork has that
setting enabled; the repository's default token permission remains read-only.
The workflow does not approve or merge PRs.

PRs created with `GITHUB_TOKEN` do not trigger `pull_request` workflows.
The sync workflow therefore validates its changes itself before creating a PR;
do not assume its bot-created PR will receive a separate PR validation run.
The hosted workflows have not been dispatched as part of this update.

Run the updater locally from the repository root:

```bash
npm run sync:check
npm run sync:apply -- --dry-run
npm run sync:apply
```

Protected adaptation changes still require human reconciliation and a merge
decision. The updater never silently overwrites them.

## Development and verification

Use Node.js 22, Bun, and Java 17. From the repository root:

```bash
npm run verify
npm run test:sync
git diff --check
(
  cd skills/poteto-mode/scripts
  bun install --frozen-lockfile --ignore-scripts
  bun run test
  bun run typecheck
  bash -n worktree-audit.sh
)
```

`npm run verify` checks the skill inventory, frontmatter, local references,
manifests, the upstream lock, and forbidden vendor-specific runtime bindings.
The Bun package scripts select the current watcher and planning tests and
their TypeScript project; run them from `skills/poteto-mode/scripts`, not the
repository root.

For the statechart integration, download and verify the same TLC release used
by CI, then run its checks:

```bash
export TLA2TOOLS="$(mktemp -d)/tla2tools.jar"
curl --fail --location --output "$TLA2TOOLS" \
  https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar
printf '%s %s\n' \
  '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88' \
  "$TLA2TOOLS" | sha256sum --check
(
  cd skills/statechart/scripts
  npm install --ignore-scripts --no-audit --no-fund --package-lock=false
  ../../poteto-mode/scripts/node_modules/.bin/tsc --project tsconfig.json \
    --typeRoots ../../poteto-mode/scripts/node_modules/@types
  npm test
)
```

These commands mirror the shared validation action. Local checks do not prove
that GitHub-hosted triggers, repository permissions, or bot PR creation work.

## Host contract

Read `skills/pstack-pi/references/runtime.md` before adapting a workflow to a new
agent host. It defines canonical roles, capability mapping, configuration paths,
transcript handling, interaction fallbacks, and verification ownership.

## License and attribution

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.

The pstack-derived material is adapted from Lauren Tan's original work in
`cursor/plugins`. See `THIRD_PARTY_NOTICES.md` for attribution and license text.
