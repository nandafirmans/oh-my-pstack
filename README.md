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

- 44 upstream pstack skills and their supporting references.
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
pi install https://github.com/shrimpwtf/oh-my-pstack
```

Start Pi in your project:

```bash
pi
```

Use `pi list` to confirm the package. Use `pi update --extensions` to reconcile
installed Git packages, or `pi remove https://github.com/shrimpwtf/oh-my-pstack`
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
omp install https://github.com/shrimpwtf/oh-my-pstack
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
git clone https://github.com/shrimpwtf/oh-my-pstack.git \
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
git clone https://github.com/shrimpwtf/oh-my-pstack.git .pstack-source
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
every day at 04:17 UTC and can also be started manually. The pinned baseline lives
in `upstream.lock.json`.

The updater:

1. Fetches the latest upstream revision.
2. Normalizes known Cursor runtime bindings for portable hosts.
3. Updates only upstream-owned files.
4. Preserves OMP adapters and protected portability adaptations.
5. Stops before writing if an adapted file changed upstream.
6. Runs verification, updater tests, Bun tests, and strict TypeScript checking.
7. Opens a pull request only after those checks pass.

Run it locally:

```bash
npm run sync:check
npm run sync:apply -- --dry-run
npm run sync:apply
```

Protected adaptation changes require a human merge decision. The updater never
silently overwrites them.

## Development and verification

```bash
npm run verify
npm run test:sync
bun install --cwd skills/poteto-mode/scripts --frozen-lockfile
bun test orch watch-pr
bunx tsc --project skills/poteto-mode/scripts/watch-pr/tsconfig.json --noEmit --strict
```

`npm run verify` checks skill inventory, frontmatter, local references, manifests,
the upstream lock, and forbidden vendor-specific runtime bindings.

## Host contract

Read `skills/pstack-pi/references/runtime.md` before adapting a workflow to a new
agent host. It defines canonical roles, capability mapping, configuration paths,
transcript handling, interaction fallbacks, and verification ownership.

## License and attribution

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.

The pstack-derived material is adapted from Lauren Tan's original work in
`cursor/plugins`. See `THIRD_PARTY_NOTICES.md` for attribution and license text.
