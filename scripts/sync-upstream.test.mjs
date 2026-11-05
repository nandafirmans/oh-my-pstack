import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { isProtectedPath, normalizeContent } from "./sync-upstream.mjs";

test("normalization removes the supported Cursor runtime bindings", () => {
  const source = [
    "config: ~/.cursor/rules/pstack-models.mdc",
    "agent: Task subagent",
    "question: AskQuestion",
    "model: claude-fable-5-thinking-max",
  ].join("\n");

  const normalized = normalizeContent(source);

  assert.doesNotMatch(normalized, /~\/\.cursor\/|AskQuestion|claude-fable/u);
  assert.match(normalized, /\$PSTACK_CONFIG/u);
  assert.match(normalized, /host task runner/u);
});

test("protected paths remain outside automatic upstream ownership", () => {
  assert.equal(isProtectedPath("skills/poteto-mode/SKILL.md"), true);
  assert.equal(isProtectedPath("skills/pstack-pi/SKILL.md"), true);
  assert.equal(isProtectedPath("skills/how/SKILL.md"), true);
  assert.equal(isProtectedPath("skills/arena/SKILL.md"), true);
  assert.equal(isProtectedPath("skills/why/references/sources/slack.md"), false);
});

test("normalization removes newly introduced upstream model bindings", () => {
  const normalized = normalizeContent("grok-4.7-xhigh-fast claude-opus-5-5-xhigh");
  assert.equal(normalized, "host-configured role/model host-configured role/model");
});

const cli = join(import.meta.dirname, "sync-upstream.mjs");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function git(source, ...args) {
  return execFileSync("git", args, { cwd: source, encoding: "utf8" }).trim();
}

async function put(root, path, content) {
  const file = join(root, path);
  await mkdir(join(file, ".."), { recursive: true });
  const value = content?.bytes === undefined ? { bytes: content } : content;
  await writeFile(file, value.bytes);
  await chmod(file, value.executable ? 0o755 : 0o644);
}

async function fixture(t, {
  base = { "skills/plain.md": "old\n" },
  next = { "skills/plain.md": "new Task subagent\n" },
  local = base,
  protectedPaths = ["skills/protected.md"],
  protectedPrefixes = ["skills/adapted/"],
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), "pstack-sync-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = join(directory, "source");
  const target = join(directory, "target");
  await mkdir(source);
  await mkdir(target);
  git(source, "init", "-q", "-b", "main");
  git(source, "config", "user.email", "test@example.invalid");
  git(source, "config", "user.name", "pstack test");
  const sourcePath = (path) => path.startsWith("benny/")
    ? `pstack/automations/benny/skills/${path.slice(6)}`
    : `pstack/${path}`;
  for (const [path, content] of Object.entries(base)) {
    await put(source, sourcePath(path), content);
  }
  git(source, "add", ".");
  git(source, "commit", "-q", "--allow-empty", "-m", "baseline");
  const from = git(source, "rev-parse", "HEAD");
  await rm(join(source, "pstack"), { recursive: true, force: true });
  for (const [path, content] of Object.entries(next)) {
    await put(source, sourcePath(path), content);
  }
  git(source, "add", "-A");
  git(source, "commit", "-q", "--allow-empty", "-m", "latest");
  const to = git(source, "rev-parse", "HEAD");
  for (const [path, content] of Object.entries(local)) await put(target, path, content);
  const lock = {
    repository: source,
    ref: "main",
    commit: from,
    protectedPaths,
    protectedPrefixes,
    sourceRoots: [
      { source: "pstack/skills", destination: "skills" },
      { source: "pstack/automations/benny/skills", destination: "skills" },
      { source: "pstack/agents", destination: "agents" },
    ],
  };
  const lockPath = join(target, "upstream.lock.json");
  await writeFile(lockPath, `${JSON.stringify(lock)}\n`);
  return {
    source, target, from, to, lock, lockPath,
    run(...args) {
      return spawnSync(process.execPath, [cli, ...args, "--source", source], {
        cwd: target,
        env: { ...process.env, PSTACK_SYNC_ROOT: target },
        encoding: "utf8",
      });
    },
    async review(files, overrides = {}) {
      const path = join(directory, "review.json");
      await writeFile(path, JSON.stringify({ version: 1, from, to, files, ...overrides }));
      return path;
    },
    async pinned() {
      return JSON.parse(await readFile(lockPath, "utf8")).commit;
    },
  };
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stderr);
}

function fails(result, pattern) {
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, pattern);
}

test("apply normalizes managed files, preserves fork-only files and advances the lock", async (t) => {
  const f = await fixture(t, {
    next: {
      "skills/plain.md": "new Task subagent\n",
      "benny/reference.md": "AskQuestion",
    },
    local: { "skills/plain.md": "old\n", "skills/fork-only.md": "ours" },
  });
  succeeds(f.run("--apply"));
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "new host task runner\n");
  assert.equal(await readFile(join(f.target, "skills/reference.md"), "utf8"), "structured interaction tool");
  assert.equal(await readFile(join(f.target, "skills/fork-only.md"), "utf8"), "ours");
  assert.equal(await f.pinned(), f.to);
});

test("default apply blocks explicit protected modifications before any write", async (t) => {
  const f = await fixture(t, {
    base: { "skills/protected.md": "base", "skills/plain.md": "old" },
    next: { "skills/protected.md": "upstream", "skills/plain.md": "new" },
    local: { "skills/protected.md": "manual merge", "skills/plain.md": "old" },
  });
  fails(f.run("--apply"), /protected OMP-adapted files:[\s\S]*skills\/protected.md/);
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "old");
  assert.equal(await readFile(join(f.target, "skills/protected.md"), "utf8"), "manual merge");
  assert.equal(await f.pinned(), f.from);
});

test("precise review covers prefix additions, deletions and changes without touching protected files", async (t) => {
  const f = await fixture(t, {
    base: {
      "skills/adapted/deleted.md": "old",
      "skills/adapted/changed.md": "base",
      "skills/plain.md": "old",
    },
    next: {
      "skills/adapted/added.md": "new",
      "skills/adapted/changed.md": "upstream",
      "skills/plain.md": "new",
    },
    local: {
      "skills/adapted/deleted.md": "retained fork adaptation",
      "skills/adapted/changed.md": "merged",
      "skills/plain.md": "old",
    },
  });
  fails(f.run("--apply"), /skills\/adapted\/added.md[\s\S]*skills\/adapted\/deleted.md/);
  const review = await f.review({
    "skills/adapted/added.md": null,
    "skills/adapted/changed.md": digest("merged"),
    "skills/adapted/deleted.md": digest("retained fork adaptation"),
  });
  succeeds(f.run("--apply", "--reviewed", review));
  await assert.rejects(readFile(join(f.target, "skills/adapted/added.md")), { code: "ENOENT" });
  assert.equal(await readFile(join(f.target, "skills/adapted/changed.md"), "utf8"), "merged");
  assert.equal(await readFile(join(f.target, "skills/adapted/deleted.md"), "utf8"), "retained fork adaptation");
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "new");
  assert.equal(await f.pinned(), f.to);
});

test("invalid, stale, tampered and imprecise reviews fail before any managed or lock write", async (t) => {
  const f = await fixture(t, {
    base: { "skills/protected.md": "base", "skills/plain.md": "old" },
    next: { "skills/protected.md": "next", "skills/plain.md": "new" },
    local: { "skills/protected.md": "merged", "skills/plain.md": "old" },
  });
  const files = { "skills/protected.md": digest("merged") };
  const cases = [
    ["wrong version", files, { version: 2 }, /Invalid or stale/],
    ["stale baseline", files, { from: "0".repeat(40) }, /Invalid or stale/],
    ["stale upstream", files, { to: "0".repeat(40) }, /Invalid or stale/],
    ["missing path", {}, {}, /exactly/],
    ["extra path", { ...files, "skills/plain.md": digest("old") }, {}, /exactly/],
    ["invalid hash", { "skills/protected.md": "not-a-hash" }, {}, /Invalid reviewed/],
    ["changed local", { "skills/protected.md": digest("outdated merge") }, {}, /Stale reviewed/],
    ["expected absent", { "skills/protected.md": null }, {}, /Stale reviewed/],
    ["unknown field", files, { approveAll: true }, /Invalid or stale/],
  ];
  for (const [name, entries, overrides, pattern] of cases) {
    await t.test(name, async () => {
      const review = await f.review(entries, overrides);
      fails(f.run("--apply", "--reviewed", review), pattern);
      assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "old");
      assert.equal(await f.pinned(), f.from);
    });
  }
  const malformed = await f.review(files);
  await writeFile(malformed, "{");
  fails(f.run("--apply", "--reviewed", malformed), /JSON/);
  fails(f.run("--apply", "--reviewed", join(f.target, "missing.json")), /ENOENT/);
  fails(f.run("--apply", "--reviewed"), /requires one value/);
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "old");
  assert.equal(await f.pinned(), f.from);
});

test("review detects local bytes changed after manifest creation", async (t) => {
  const f = await fixture(t, {
    base: { "skills/protected.md": "base" },
    next: { "skills/protected.md": "next" },
    local: { "skills/protected.md": "merged" },
  });
  const review = await f.review({ "skills/protected.md": digest("merged") });
  await writeFile(join(f.target, "skills/protected.md"), "tampered");
  fails(f.run("--apply", "--reviewed", review), /Stale reviewed/);
  assert.equal(await f.pinned(), f.from);
});

test("protected-only review advances lock and does not rewrite reconciled file modes", async (t) => {
  const f = await fixture(t, {
    base: { "skills/protected.md": "base" },
    next: { "skills/protected.md": "upstream" },
    local: { "skills/protected.md": { bytes: "merged", executable: true } },
  });
  const review = await f.review({ "skills/protected.md": digest("merged") });
  succeeds(f.run("--apply", "--reviewed", review));
  assert.equal(await f.pinned(), f.to);
  assert.equal(await readFile(join(f.target, "skills/protected.md"), "utf8"), "merged");
  assert.ok((await stat(join(f.target, "skills/protected.md"))).mode & 0o111);
});

test("an upstream-only commit with unchanged managed content still advances lock", async (t) => {
  const files = { "skills/plain.md": "same" };
  const f = await fixture(t, { base: files, next: files });
  succeeds(f.run("--apply"));
  assert.equal(await f.pinned(), f.to);
});

test("reviewed dry-run performs no content, deletion, directory, mode or lock writes", async (t) => {
  const f = await fixture(t, {
    base: { "skills/protected.md": "base", "skills/removed.md": "remove" },
    next: {
      "skills/protected.md": "next",
      "skills/new/run.sh": { bytes: "#!/bin/sh\n", executable: true },
    },
    local: { "skills/protected.md": "merged", "skills/removed.md": "remove" },
  });
  const review = await f.review({ "skills/protected.md": digest("merged") });
  const beforeLock = await readFile(f.lockPath);
  succeeds(f.run("--dry-run", "--reviewed", review));
  assert.deepEqual(await readFile(f.lockPath), beforeLock);
  assert.equal(await readFile(join(f.target, "skills/removed.md"), "utf8"), "remove");
  assert.equal(await readFile(join(f.target, "skills/protected.md"), "utf8"), "merged");
  await assert.rejects(stat(join(f.target, "skills/new")), { code: "ENOENT" });
});

test("missing baseline fails closed even for a supplied review and dry-run", async (t) => {
  const f = await fixture(t);
  f.lock.commit = "0".repeat(40);
  await writeFile(f.lockPath, JSON.stringify(f.lock));
  const review = await f.review({}, { from: f.lock.commit });
  fails(f.run("--apply", "--reviewed", review), /Baseline\/revision unavailable/);
  fails(f.run("--dry-run"), /Baseline\/revision unavailable/);
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "old\n");
  assert.equal(await f.pinned(), f.lock.commit);
});

test("nonprotected deletions remove only unchanged upstream-owned bytes", async (t) => {
  const f = await fixture(t, {
    base: {
      "skills/removed.md": "Task subagent",
    },
    next: {},
    local: {
      "skills/removed.md": "host task runner",
      "skills/fork-only.md": "ours",
    },
  });
  succeeds(f.run("--apply"));
  await assert.rejects(readFile(join(f.target, "skills/removed.md")), { code: "ENOENT" });
  assert.equal(await readFile(join(f.target, "skills/fork-only.md"), "utf8"), "ours");
  assert.equal(await f.pinned(), f.to);
});

test("new and updated binary files retain exact bytes and executable modes", async (t) => {
  const binary = Buffer.from([0, 0xff, 0xfe, ...Buffer.from("AskQuestion")]);
  const f = await fixture(t, {
    base: { "skills/change.sh": "same" },
    next: {
      "skills/change.sh": { bytes: "same", executable: true },
      "skills/run.sh": { bytes: "#!/bin/sh\nTask subagent\n", executable: true },
      "skills/new.bin": binary,
      "skills/utf8-invalid.bin": Buffer.from([0xff, 0xfe, 0x41]),
    },
  });
  succeeds(f.run("--apply"));
  assert.deepEqual(await readFile(join(f.target, "skills/new.bin")), binary);
  assert.deepEqual(await readFile(join(f.target, "skills/utf8-invalid.bin")), Buffer.from([0xff, 0xfe, 0x41]));
  assert.equal(await readFile(join(f.target, "skills/run.sh"), "utf8"), "#!/bin/sh\nhost task runner\n");
  assert.ok((await stat(join(f.target, "skills/run.sh"))).mode & 0o111);
  assert.ok((await stat(join(f.target, "skills/change.sh"))).mode & 0o111);
  assert.equal((await stat(join(f.target, "skills/new.bin"))).mode & 0o111, 0);
});

test("protected mode-only changes require review", async (t) => {
  const f = await fixture(t, {
    base: { "skills/adapted/run.sh": "same" },
    next: { "skills/adapted/run.sh": { bytes: "same", executable: true } },
  });
  fails(f.run("--apply"), /skills\/adapted\/run.sh/);
  const review = await f.review({ "skills/adapted/run.sh": digest("same") });
  succeeds(f.run("--apply", "--reviewed", review));
  assert.equal((await stat(join(f.target, "skills/adapted/run.sh"))).mode & 0o111, 0);
});

test("dirty or untracked source cannot be approved or silently used, including check mode", async (t) => {
  const f = await fixture(t);
  const review = await f.review({});
  await writeFile(join(f.source, "pstack/skills/plain.md"), "dirty different bytes");
  fails(f.run("--apply", "--reviewed", review), /clean repository root/);
  fails(f.run("--check"), /clean repository root/);
  await writeFile(join(f.source, "pstack/skills/plain.md"), "new Task subagent\n");
  await writeFile(join(f.source, "untracked.txt"), "unreviewed");
  fails(f.run("--apply", "--reviewed", review), /clean repository root/);
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "old\n");
  assert.equal(await f.pinned(), f.from);
});

test("check reports available updates without changing local files", async (t) => {
  const f = await fixture(t);
  assert.equal(f.run("--check").status, 10);
  assert.equal(await f.pinned(), f.from);
  succeeds(f.run("--apply"));
  succeeds(f.run("--check"));
});

test("an explicitly protected upstream addition accepts an already reconciled local file", async (t) => {
  const f = await fixture(t, {
    base: {},
    next: { "skills/poteto-help/SKILL.md": "upstream Cursor instructions" },
    local: { "skills/poteto-help/SKILL.md": "reconciled host instructions" },
    protectedPaths: ["skills/poteto-help/SKILL.md"],
  });
  fails(f.run("--apply"), /skills\/poteto-help\/SKILL.md/);
  const review = await f.review({
    "skills/poteto-help/SKILL.md": digest("reconciled host instructions"),
  });
  succeeds(f.run("--apply", "--reviewed", review));
  assert.equal(await readFile(join(f.target, "skills/poteto-help/SKILL.md"), "utf8"), "reconciled host instructions");
  assert.equal(await f.pinned(), f.to);
});

test("unprotected local adaptations fail before any planned file or lock is written", async (t) => {
  const cases = [
    { name: "edited upstream file", base: "base", next: "latest", local: "OMP adaptation" },
    { name: "upstream unchanged", base: "base", next: "base", local: "OMP adaptation" },
    { name: "locally deleted", base: "base", next: "latest", local: null },
    { name: "fork-only name collision", base: null, next: "upstream addition", local: "fork addition" },
    { name: "edited upstream deletion", base: "base", next: null, local: "OMP adaptation" },
    { name: "local mode change", base: { bytes: "base", executable: true }, next: "latest", local: "base" },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, async (t) => {
      const f = await fixture(t, {
        base: { "skills/a.md": "old", ...(scenario.base === null ? {} : { "skills/z.md": scenario.base }) },
        next: { "skills/a.md": "new", ...(scenario.next === null ? {} : { "skills/z.md": scenario.next }) },
        local: { "skills/a.md": "old", ...(scenario.local === null ? {} : { "skills/z.md": scenario.local }) },
      });
      fails(f.run("--apply"), /(?:Local adaptation|Locally deleted)/);
      fails(f.run("--dry-run"), /(?:Local adaptation|Locally deleted)/);
      assert.equal(await readFile(join(f.target, "skills/a.md"), "utf8"), "old");
      if (scenario.local !== null) {
        assert.equal(await readFile(join(f.target, "skills/z.md"), "utf8"), scenario.local);
      } else {
        await assert.rejects(readFile(join(f.target, "skills/z.md")), { code: "ENOENT" });
      }
      assert.equal(await f.pinned(), f.from);
    });
  }
});

test("protected three-way proposals preserve disjoint OMP and upstream edits without applying them", async (t) => {
  const middle = Array.from({ length: 20 }, (_, index) => `stable ${index}\n`).join("");
  const base = `old header\n${middle}old footer\n`;
  const local = `old header\n${middle}OMP footer\n`;
  const incoming = `new header\n${middle}old footer\n`;
  const f = await fixture(t, {
    base: { "skills/protected.md": base },
    next: { "skills/protected.md": incoming },
    local: { "skills/protected.md": local },
  });
  const output = join(f.target, "review-output");
  succeeds(f.run("--prepare-review", output));
  const proposed = await readFile(join(output, "proposed/skills/protected.md"), "utf8");
  assert.equal(proposed, `new header\n${middle}OMP footer\n`);
  assert.equal(await readFile(join(output, "base/skills/protected.md"), "utf8"), base);
  assert.equal(await readFile(join(output, "upstream/skills/protected.md"), "utf8"), incoming);
  assert.equal(await readFile(join(f.target, "skills/protected.md"), "utf8"), local);
  assert.equal(await f.pinned(), f.from);
  const plan = JSON.parse(await readFile(join(output, "review-plan.json"), "utf8"));
  assert.equal(plan.files["skills/protected.md"].status, "clean");
  assert.equal(plan.from, f.from);
  assert.equal(plan.to, f.to);
  fails(f.run("--apply", "--reviewed", join(output, "review-plan.json")), /Invalid or stale/);
  await put(f.target, "skills/protected.md", proposed);
  const review = await f.review({ "skills/protected.md": digest(proposed) });
  succeeds(f.run("--apply", "--reviewed", review));
  assert.equal(await f.pinned(), f.to);
  assert.equal(await readFile(join(f.target, "skills/protected.md"), "utf8"), proposed);
});

test("protected textual conflicts remain isolated and cannot be approved with unresolved markers", async (t) => {
  const f = await fixture(t, {
    base: { "skills/protected.md": "base\n" },
    next: { "skills/protected.md": "upstream\n" },
    local: { "skills/protected.md": "OMP\n" },
  });
  const output = join(f.target, "review-output");
  const result = f.run("--prepare-review", output);
  assert.equal(result.status, 2, result.stderr);
  const plan = JSON.parse(await readFile(join(output, "review-plan.json"), "utf8"));
  assert.equal(plan.files["skills/protected.md"].status, "conflict");
  const proposed = await readFile(join(output, "proposed/skills/protected.md"), "utf8");
  assert.match(proposed, /^<<<<<<< OMP/m);
  assert.equal(await readFile(join(f.target, "skills/protected.md"), "utf8"), "OMP\n");
  assert.equal(await f.pinned(), f.from);
  await put(f.target, "skills/protected.md", proposed);
  const review = await f.review({ "skills/protected.md": digest(proposed) });
  fails(f.run("--apply", "--reviewed", review), /Unresolved merge markers/);
  assert.equal(await f.pinned(), f.from);
});

test("protected addition, deletion and binary proposals distinguish clean results from conflicts", async (t) => {
  const original = Buffer.from([0, 1, 2]);
  const upstream = Buffer.from([0, 3, 4]);
  const local = Buffer.from([0, 5, 6]);
  const f = await fixture(t, {
    base: { "skills/adapted/delete.md": "base", "skills/adapted/data.bin": original },
    next: {
      "skills/adapted/add.sh": { bytes: "#!/bin/sh\nTask subagent\n", executable: true },
      "skills/adapted/data.bin": upstream,
    },
    local: { "skills/adapted/delete.md": "OMP adaptation", "skills/adapted/data.bin": local },
  });
  const output = join(f.target, "review-output");
  assert.equal(f.run("--prepare-review", output).status, 2);
  const plan = JSON.parse(await readFile(join(output, "review-plan.json"), "utf8"));
  assert.equal(plan.files["skills/adapted/delete.md"].status, "conflict");
  assert.equal(plan.files["skills/adapted/data.bin"].status, "conflict");
  assert.equal(plan.files["skills/adapted/add.sh"].status, "clean");
  assert.equal(plan.files["skills/adapted/add.sh"].proposed.mode, "100755");
  assert.equal(await readFile(join(output, "proposed/skills/adapted/add.sh"), "utf8"), "#!/bin/sh\nhost task runner\n");
  assert.deepEqual(await readFile(join(f.target, "skills/adapted/data.bin")), local);
  await assert.rejects(readFile(join(f.target, "skills/adapted/add.sh")), { code: "ENOENT" });
  assert.equal(await f.pinned(), f.from);
  fails(f.run("--prepare-review", output), /EEXIST/);
  fails(f.run("--prepare-review", join(f.source, "review-output")), /outside the upstream source/);
});

test("remote commit detection, automatic sync and a second apply are idempotent", async (t) => {
  const f = await fixture(t);
  const remote = (...args) => spawnSync(process.execPath, [cli, ...args], {
    cwd: f.target,
    env: { ...process.env, PSTACK_SYNC_ROOT: f.target },
    encoding: "utf8",
  });
  assert.equal(remote("--check").status, 10);
  assert.equal(await f.pinned(), f.from);
  succeeds(remote("--apply"));
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "new host task runner\n");
  const content = await readFile(f.lockPath);
  succeeds(remote("--check"));
  const repeated = remote("--apply");
  succeeds(repeated);
  assert.match(repeated.stdout, /Updated 0 managed files/);
  assert.deepEqual(await readFile(f.lockPath), content);
});

test("clean protected proposals preserve fork-only executable changes", async (t) => {
  const f = await fixture(t, {
    base: { "skills/adapted/run.sh": "#!/bin/sh\nold\n" },
    next: { "skills/adapted/run.sh": "#!/bin/sh\nnew\n" },
    local: { "skills/adapted/run.sh": { bytes: "#!/bin/sh\nold\n", executable: true } },
  });
  const output = join(f.target, "review-output");
  succeeds(f.run("--prepare-review", output));
  const plan = JSON.parse(await readFile(join(output, "review-plan.json"), "utf8"));
  assert.equal(plan.files["skills/adapted/run.sh"].status, "clean");
  assert.equal(plan.files["skills/adapted/run.sh"].proposed.mode, "100755");
  assert.ok((await stat(join(output, "proposed/skills/adapted/run.sh"))).mode & 0o111);
  assert.equal(await readFile(join(output, "proposed/skills/adapted/run.sh"), "utf8"), "#!/bin/sh\nnew\n");
  assert.equal(await readFile(join(f.target, "skills/adapted/run.sh"), "utf8"), "#!/bin/sh\nold\n");
  assert.equal(await f.pinned(), f.from);
});

test("incoming unresolved markers block additions and modifications before any write", async (t) => {
  const conflict = "<<<<<<< branch\nours\n=======\ntheirs\n>>>>>>> upstream\n";
  for (const existing of [false, true]) {
    await t.test(existing ? "modified source file" : "new source file", async (t) => {
      const f = await fixture(t, {
        base: { "skills/a.md": "old", ...(existing ? { "skills/z.md": "baseline" } : {}) },
        next: { "skills/a.md": "new", "skills/z.md": conflict },
      });
      fails(f.run("--apply"), /Unresolved merge markers.*skills\/z.md/);
      fails(f.run("--dry-run"), /Unresolved merge markers.*skills\/z.md/);
      assert.equal(await readFile(join(f.target, "skills/a.md"), "utf8"), "old");
      if (existing) {
        assert.equal(await readFile(join(f.target, "skills/z.md"), "utf8"), "baseline");
      } else {
        await assert.rejects(readFile(join(f.target, "skills/z.md")), { code: "ENOENT" });
      }
      assert.equal(await f.pinned(), f.from);
    });
  }
});

test("protected deletion requires a decision for a fork-only executable adaptation", async (t) => {
  const bytes = "#!/bin/sh\nsame\n";
  const f = await fixture(t, {
    base: { "skills/adapted/run.sh": bytes },
    next: {},
    local: { "skills/adapted/run.sh": { bytes, executable: true } },
  });
  const output = join(f.target, "review-output");
  assert.equal(f.run("--prepare-review", output).status, 2);
  const plan = JSON.parse(await readFile(join(output, "review-plan.json"), "utf8"));
  assert.equal(plan.files["skills/adapted/run.sh"].status, "conflict");
  assert.equal(plan.files["skills/adapted/run.sh"].proposed.mode, "100755");
  assert.equal(await readFile(join(output, "proposed/skills/adapted/run.sh"), "utf8"), bytes);
  assert.ok((await stat(join(f.target, "skills/adapted/run.sh"))).mode & 0o111);
  assert.equal(await f.pinned(), f.from);
});

test("upstream agent changes are protected and preserve the native wrapper after explicit review", async (t) => {
  const f = await fixture(t, {
    base: { "agents/worker.md": "Original upstream agent\n", "skills/plain.md": "old" },
    next: { "agents/worker.md": "Updated upstream agent\n", "skills/plain.md": "new" },
    local: { "agents/worker.md": "OMP-native adapter\n", "skills/plain.md": "old" },
    protectedPrefixes: ["agents/"],
  });
  fails(f.run("--apply"), /agents\/worker.md/);
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "old");
  assert.equal(await f.pinned(), f.from);
  const review = await f.review({ "agents/worker.md": digest("OMP-native adapter\n") });
  succeeds(f.run("--apply", "--reviewed", review));
  assert.equal(await readFile(join(f.target, "agents/worker.md"), "utf8"), "OMP-native adapter\n");
  assert.equal(await readFile(join(f.target, "skills/plain.md"), "utf8"), "new");
  assert.equal(await f.pinned(), f.to);
});
