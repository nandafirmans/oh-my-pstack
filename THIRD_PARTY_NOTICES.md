# Third-party notices

## pstack

The workflow skills, principle skills, references, playbooks, and scripts under
`skills/` contain material adapted from
[`cursor/plugins`](https://github.com/cursor/plugins/tree/main/pstack).

### Upstream reconciliation

This fork reconciles upstream pstack `0.15.36` at
`bb68f2365eceafa0cb2d253112f675acf5f144cc` against the previous original
`bdf7aa355337897f167153e05069aca505dae17c` and the OMP-adapted working tree.
Portable configuration, live host roles/models, task dispatch, isolated writers,
and explicit publication approval remain fork-owned. Cursor plugin metadata,
logo, and guides are not installation requirements for this fork; upstream
guide links in help are background references, not host contracts.

`upstream.lock.json` defines managed source roots and protected destinations.
Protected files are never automatically overwritten or deleted. After a
three-way review, `--reviewed FILE` can acknowledge exactly the protected paths
changed between the locked and target revisions:

```json
{
  "version": 1,
  "from": "<locked 40-character commit>",
  "to": "<target 40-character commit>",
  "files": {
    "skills/example/SKILL.md": "<SHA256 of reconciled local bytes>",
    "skills/removed/example.md": null
  }
}
```

Use the following dry run first, then repeat without `--dry-run`:

```sh
node scripts/sync-upstream.mjs --apply --dry-run --source /path/to/plugins --reviewed upstream.review.json
```
The source must match its committed revision. Missing, extra, stale, or
content-mismatched approvals fail before managed files or the lock are written.
`null` approves an intentionally absent protected destination. The manifest is
an explicit review record, not a switch that disables protection.

To prepare a protected migration without changing installed skills or the lock:

```sh
node scripts/sync-upstream.mjs --prepare-review /tmp/pstack-review --source /path/to/plugins
```

The output directory must be new. It contains the original baseline and latest
upstream bytes, current local files, normalized three-way proposals, and
`review-plan.json` with revision IDs, hashes, modes, and conflict status.
A clean textual proposal still requires semantic review. Conflicts return exit
code 2; binary conflicts and adapted upstream deletions require manual decisions.
The proposal report is deliberately not an accepted `--reviewed` manifest.
After review, reconcile the installed files and record their exact SHA256/null
outcomes in the approval manifest. Unresolved merge markers remain blocked even
if a supplied approval hash matches them.

Unprotected managed paths must still match the normalized locked baseline
before replacement or deletion. Local edits, mode changes, local deletions, and
fork-only name collisions fail before writes; protect and reconcile deliberate
adaptations instead of treating them as automatically owned by upstream.
An unchanged repeated synchronization produces no managed-file operations.

The GitHub workflow detects new revisions, runs the package-specific watcher
and planning commands from their own directory, and checks statechart against
checksum-pinned TLC. Only a successful update and verification can open an
update PR. Blocked protected updates retain a review artifact without changing
the pin or publishing unresolved files. Repository Actions must permit the
workflow token to create pull requests; no remote workflow was dispatched here.

The Phase 2 audit also corrects loaded-installation paths and available host
drivers in planning and PR playbooks, routes reflection proposals consistently,
and preserves Cursor security-review identification without mistaking human
reviewers or mentions of bots for automated review passes.
The fallback comment-review brief now lives inside the `no-comments` skill;
skills-only installs do not depend on a separately installed agent directory.
The optional specialized agent loads that same asset. Long-lived OMP owners use
native `write agent://<id>` messages, not an assumed hub tool.
Protected proposal modes are reconciled independently from content, preserving
fork-only executable changes, and the artifacts carry their advertised modes.
Incoming conflict markers are rejected before any managed file or lock write.
Upstream `pstack/agents` is tracked as a protected-only source root as well:
agent changes require review while the native wrappers and shared skill assets
remain fork-owned. New upstream agents cannot bypass that review boundary.
Statechart also passes its strict TypeScript configuration using the already
installed watcher compiler and Node typings. The audit fixes upstream exit-code
inference and test callback return types without casts or suppression; both
adapted files are protected, and CI checks their types before integration tests.

For this migration, `upstream.review.json` records reconciled protected bytes
and intentional deletions. `/interrogate` now requires executable evidence;
the old review rubric and critic prompts are retired. Poteto orchestration uses
the host's task lifecycle rather than the removed upstream TypeScript store.
New formal-verification/statechart workflows retain their external runtime
requirements; installation alone does not provide Java/TLC or browser/video
tooling.
The new `poteto-help` and `make-bot-ui` skills are protected adaptations too:
help routes through the installed portable skills, and webhook UI work requires
the actual host routine/secure-secret capabilities plus explicit approval for
installation and network exposure. No remote installer is piped into a shell.

```text
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## orchestrate

`orchestrate-omp` contains material adapted from [`provencher/codex-skills`](https://github.com/provencher/codex-skills/tree/main/orchestrate).

```text
MIT License

Copyright (c) 2026 Eric Provencher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
