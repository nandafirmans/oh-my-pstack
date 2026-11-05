#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { isUtf8 } from "node:buffer";
import { fileURLToPath } from "node:url";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(
  process.env.PSTACK_SYNC_ROOT ?? dirname(fileURLToPath(import.meta.url)),
  process.env.PSTACK_SYNC_ROOT ? "." : "..",
);
const lockPath = join(root, "upstream.lock.json");
const boundaryLock = JSON.parse(readFileSync(lockPath, "utf8"));

function git(args, cwd) {
  return execFileSync("git", ["--no-optional-locks", ...args], { cwd, encoding: "utf8" }).trim();
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeContent(source) {
  return source
    .replaceAll("~/.cursor/rules/pstack-models.mdc", "$PSTACK_CONFIG (or .pstack/config.md)")
    .replaceAll(".cursor/skills/", "skills/")
    .replaceAll(".cursor/plugins/", "plugins/")
    .replaceAll("subagent_type:", "role:")
    .replaceAll("AskQuestion", "structured interaction tool")
    .replaceAll('environment: "cloud"', "environment: host-managed")
    .replaceAll("environment: 'cloud'", "environment: host-managed")
    .replaceAll("claude-fable-5-thinking-max", "host-configured role/model")
    .replaceAll("gpt-5.6-sol-max", "host-configured role/model")
    .replaceAll("grok-4.6-fast-xhigh", "host-configured role/model")
    .replaceAll("claude-opus-5-thinking-xhigh", "host-configured role/model")
    .replaceAll("grok-4.7-xhigh-fast", "host-configured role/model")
    .replaceAll("claude-opus-5-5-xhigh", "host-configured role/model")
    .replaceAll(/\bTask (?:subagent|tool)\b/g, "host task runner");
}

export function isProtectedPath(path, lock = boundaryLock) {
  return (
    lock.protectedPaths.includes(path) ||
    lock.protectedPrefixes.some((prefix) => path.startsWith(prefix))
  );
}

function parseArgs(argv) {
  const args = { mode: null, dryRun: false, source: null, reviewed: null, reviewDirectory: null };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--apply" || argument === "--check") {
      if (args.mode) throw new Error("Choose exactly one of --check or --apply.");
      args.mode = argument.slice(2);
    } else if (argument === "--prepare-review") {
      if (args.mode || !argv[index + 1] || argv[index + 1].startsWith("--")) {
        throw new Error("--prepare-review requires a new output directory and cannot combine modes.");
      }
      args.mode = "prepare-review";
      args.reviewDirectory = argv[++index];
    } else if (argument === "--dry-run") {
      args.dryRun = true;
    } else if (argument === "--source" || argument === "--reviewed") {
      const key = argument.slice(2);
      if (args[key] !== null || !argv[index + 1] || argv[index + 1].startsWith("--")) {
        throw new Error(`${argument} requires one value.`);
      }
      args[key] = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!args.mode && args.dryRun) args.mode = "apply";
  if (args.mode === "check" && (args.dryRun || args.reviewed)) {
    throw new Error("--dry-run and --reviewed require --apply.");
  }
  if (args.mode === "prepare-review" && (args.dryRun || args.reviewed)) {
    throw new Error("--prepare-review cannot combine with --dry-run or --reviewed.");
  }
  return args;
}

async function sourceRepository(lock, sourceArg) {
  if (sourceArg) return { path: await realpath(resolve(sourceArg)), cleanup: null };
  const path = await mkdtemp(join(tmpdir(), "pstack-upstream-"));
  try {
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--branch", lock.ref, lock.repository, path],
      { stdio: "inherit" },
    );
    try {
      execFileSync(
        "git",
        ["fetch", "--quiet", "--depth", "1", "origin", lock.commit],
        { cwd: path },
      );
    } catch {
      // Tree loading below fails closed if the pinned baseline is unavailable.
    }
    return { path, cleanup: path };
  } catch (error) {
    await rm(path, { recursive: true, force: true });
    throw error;
  }
}

function managedTree(lock, sourceRoot, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error(`Expected an exact commit: ${commit}`);
  try {
    git(["cat-file", "-e", `${commit}^{commit}`], sourceRoot);
  } catch {
    throw new Error(`Baseline/revision unavailable: ${commit}; refusing to sync.`);
  }
  const entries = execFileSync("git", ["ls-tree", "-rz", "--full-tree", commit], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  const files = new Map();
  for (const entry of entries) {
    const tab = entry.indexOf("\t");
    const [mode, type, object] = entry.slice(0, tab).split(" ");
    const source = entry.slice(tab + 1);
    for (const mapping of lock.sourceRoots) {
      if (!source.startsWith(`${mapping.source}/`)) continue;
      if (source.split("/").includes("node_modules")) continue;
      if (type !== "blob" || !["100644", "100755"].includes(mode)) {
        throw new Error(`Unsupported upstream file type: ${source}`);
      }
      const destination = `${mapping.destination}/${source.slice(mapping.source.length + 1)}`;
      if (files.has(destination)) throw new Error(`Ambiguous source ownership: ${destination}`);
      files.set(destination, { object, mode });
    }
  }
  return files;
}

function changedEntry(before, after) {
  return before?.object !== after?.object || before?.mode !== after?.mode;
}

function blob(entry, sourceRoot) {
  return execFileSync("git", ["cat-file", "blob", entry.object], {
    cwd: sourceRoot,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function isText(bytes) {
  return isUtf8(bytes) && !bytes.includes(0);
}

function normalizedBlob(entry, sourceRoot) {
  const bytes = blob(entry, sourceRoot);
  return isText(bytes) ? Buffer.from(normalizeContent(bytes.toString("utf8"))) : bytes;
}

async function localFile(destination) {
  const path = resolve(root, destination);
  if (!path.startsWith(`${root}${sep}`)) throw new Error(`Unsafe destination: ${destination}`);
  // Do not follow a fork symlink outside the destination tree.
  let current = root;
  for (const part of relative(root, path).split(sep)) {
    current = join(current, part);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error(`Refusing symlink destination: ${destination}`);
    if (current === path) {
      if (!info.isFile()) throw new Error(`Destination is not a file: ${destination}`);
      return { bytes: await readFile(path), executable: Boolean(info.mode & 0o111) };
    }
    if (!info.isDirectory()) throw new Error(`Destination parent is not a directory: ${destination}`);
  }
}

// --reviewed FILE JSON:
// { "version": 1, "from": "<exact pinned commit>", "to": "<exact HEAD commit>",
//   "files": { "skills/protected/path": "<local SHA256 or null if absent>" } }
// Exact changed protected-path coverage is required, including additions,
// deletions and mode changes. Commit IDs bind the reviewed upstream/base trees;
// local hashes bind the manually reconciled results, which are NEVER written.
async function validateReview(path, lock, commit, conflicts) {
  if (!path) {
    if (conflicts.length) {
      throw new Error(`Upstream changed protected OMP-adapted files:\n${conflicts.map((file) => `- ${file}`).join("\n")}\nMerge manually and supply --reviewed FILE.`);
    }
    return;
  }
  const review = JSON.parse(await readFile(resolve(path), "utf8"));
  if (!review || Array.isArray(review) || review.version !== 1 ||
      review.from !== lock.commit || review.to !== commit ||
      !review.files || typeof review.files !== "object" || Array.isArray(review.files) ||
      Object.keys(review).sort().join(",") !== "files,from,to,version") {
    throw new Error("Invalid or stale reviewed manifest: expected version 1 and exact from/to commits.");
  }
  const paths = Object.keys(review.files).sort();
  if (JSON.stringify(paths) !== JSON.stringify(conflicts)) {
    throw new Error("Reviewed manifest must cover exactly the changed protected destinations.");
  }
  for (const destination of paths) {
    const expected = review.files[destination];
    if (expected !== null && (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected))) {
      throw new Error(`Invalid reviewed local SHA256: ${destination}`);
    }
    const local = await localFile(destination);
    if ((local ? hash(local.bytes) : null) !== expected) {
      throw new Error(`Stale reviewed local SHA256: ${destination}`);
    }
    if (local && hasConflictMarkers(local.bytes)) {
      throw new Error(`Unresolved merge markers in reviewed file: ${destination}`);
    }
  }
}

function hasConflictMarkers(bytes) {
  return isText(bytes) && /^(?:<<<<<<<(?: |$)|=======$|>>>>>>>(?: |$))/m.test(bytes.toString("utf8"));
}

async function prepareReview(lock, sourceRoot, commit, directory) {
  const baseline = managedTree(lock, sourceRoot, lock.commit);
  const latest = managedTree(lock, sourceRoot, commit);
  const output = resolve(directory);
  if (output === sourceRoot || output.startsWith(`${sourceRoot}${sep}`)) {
    throw new Error("Review output must be outside the upstream source repository.");
  }
  // A new directory prevents replacing a previous review or unrelated files.
  await mkdir(output);
  const scratch = await mkdtemp(join(tmpdir(), "pstack-merge-"));
  const files = {};
  try {
    for (const destination of [...new Set([...baseline.keys(), ...latest.keys()])].sort()) {
      const before = baseline.get(destination);
      const after = latest.get(destination);
      if (!isProtectedPath(destination, lock) || !changedEntry(before, after)) continue;
      const local = await localFile(destination);
      const base = before ? normalizedBlob(before, sourceRoot) : Buffer.alloc(0);
      const incoming = after ? normalizedBlob(after, sourceRoot) : null;
      let proposal = local?.bytes ?? null;
      let status = "conflict";
      if (!incoming) {
        if (!local || (before && local.bytes.equals(base) &&
            local.executable === (before.mode === "100755"))) {
          proposal = null;
          status = "clean";
        }
      } else if (!local && !before) {
        proposal = incoming;
        status = "clean";
      } else if (local) {
        if (local.bytes.equals(incoming) || local.bytes.equals(base)) {
          proposal = incoming;
          status = "clean";
        } else if (incoming.equals(base)) {
          status = "clean";
        } else if ([base, local.bytes, incoming].every(isText)) {
          for (const [name, bytes] of [["base", base], ["local", local.bytes], ["upstream", incoming]]) {
            await writeFile(join(scratch, name), bytes);
          }
          const result = spawnSync("git", [
            "merge-file", "-p", "-L", "OMP", "-L", "previous-upstream", "-L", "latest-upstream",
            join(scratch, "local"), join(scratch, "base"), join(scratch, "upstream"),
          ], { maxBuffer: 64 * 1024 * 1024 });
          if (result.error || result.status === null || result.status < 0 || result.status > 127) {
            throw result.error ?? new Error(result.stderr.toString("utf8"));
          }
          proposal = result.stdout;
          status = result.status === 0 ? "clean" : "conflict";
        }
      }
      if (proposal && hasConflictMarkers(proposal)) status = "conflict";
      const localMode = local ? (local.executable ? "100755" : "100644") : null;
      const proposedMode = localMode && before?.mode === after?.mode
        ? localMode
        : after?.mode ?? localMode ?? before?.mode;
      const snapshots = {
        base: before ? { bytes: blob(before, sourceRoot), mode: before.mode } : null,
        local: local ? { bytes: local.bytes, mode: localMode } : null,
        upstream: after ? { bytes: blob(after, sourceRoot), mode: after.mode } : null,
        proposed: proposal ? { bytes: proposal, mode: proposedMode } : null,
      };
      const record = { status };
      for (const [name, snapshot] of Object.entries(snapshots)) {
        record[name] = snapshot ? { sha256: hash(snapshot.bytes), mode: snapshot.mode } : null;
        if (!snapshot) continue;
        const path = join(output, name, destination);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, snapshot.bytes);
        await chmod(path, snapshot.mode === "100755" ? 0o755 : 0o644);
      }
      files[destination] = record;
    }
    assertSourceClean(sourceRoot, commit);
    await writeFile(join(output, "review-plan.json"), `${JSON.stringify({
      version: 1, kind: "proposal", from: lock.commit, to: commit, files,
    }, null, 2)}\n`);
    const conflicts = Object.values(files).filter((file) => file.status === "conflict").length;
    console.log(`Prepared ${Object.keys(files).length} protected proposals; ${conflicts} conflicts in ${output}.`);
    console.log("Proposals are not approvals. Review and reconcile target files before supplying --reviewed FILE.");
    return conflicts ? 2 : 0;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function applyUpdate(lock, sourceRoot, commit, args) {
  const baseline = managedTree(lock, sourceRoot, lock.commit);
  const latest = managedTree(lock, sourceRoot, commit);
  const destinations = [...new Set([...baseline.keys(), ...latest.keys()])].sort();
  const conflicts = destinations.filter((path) =>
    isProtectedPath(path, lock) && changedEntry(baseline.get(path), latest.get(path)));
  await validateReview(args.reviewed, lock, commit, conflicts);

  // Plan every operation before writing, so invalid reviews and unsafe paths
  // cannot leave a partially applied update.
  const operations = [];
  for (const destination of destinations) {
    const local = await localFile(destination);
    if (local && hasConflictMarkers(local.bytes)) {
      throw new Error(`Unresolved merge markers: ${destination}`);
    }
    if (isProtectedPath(destination, lock)) continue;
    const before = baseline.get(destination);
    const after = latest.get(destination);
    if (!after) {
      if (!local) continue;
      if (!local.bytes.equals(normalizedBlob(before, sourceRoot)) ||
          local.executable !== (before.mode === "100755")) {
        throw new Error(`Local adaptation conflicts with upstream deletion: ${destination}; protect and reconcile this path.`);
      }
      operations.push({ destination, remove: true });
      continue;
    }
    const bytes = normalizedBlob(after, sourceRoot);
    if (hasConflictMarkers(bytes)) {
      throw new Error(`Unresolved merge markers in upstream file: ${destination}`);
    }
    const executable = after.mode === "100755";
    if (local?.bytes.equals(bytes) && local.executable === executable) continue;
    if (before && !local) {
      throw new Error(`Locally deleted managed path: ${destination}; protect and reconcile this path.`);
    }
    if (local && (!before || !local.bytes.equals(normalizedBlob(before, sourceRoot)) ||
        local.executable !== (before.mode === "100755"))) {
      throw new Error(`Local adaptation on unprotected path: ${destination}; protect and reconcile this path.`);
    }
    operations.push({ destination, bytes, executable });
  }
  // Check again after planning: all bytes come from Git objects, never a dirty
  // working tree, and the lock must still describe this exact checked HEAD.
  assertSourceClean(sourceRoot, commit);
  await validateReview(args.reviewed, lock, commit, conflicts);
  for (const operation of operations) {
    if (args.dryRun) continue;
    const path = join(root, operation.destination);
    if (operation.remove) {
      await rm(path);
    } else {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, operation.bytes);
      await chmod(path, operation.executable ? 0o755 : 0o644);
    }
  }
  console.log(`${args.dryRun ? "Would update" : "Updated"} ${operations.length} managed files:`);
  for (const operation of operations) {
    console.log(`- ${operation.destination}${operation.remove ? " (delete)" : ""}`);
  }
  if (!args.dryRun) {
    await writeFile(lockPath, `${JSON.stringify({ ...lock, commit }, null, 2)}\n`);
  }
  console.log(`${args.dryRun ? "Would pin" : "Pinned"} upstream ${commit}.`);
  return 0;
}

function assertSourceClean(sourceRoot, commit) {
  if (git(["rev-parse", "--show-toplevel"], sourceRoot) !== sourceRoot ||
      git(["rev-parse", "HEAD"], sourceRoot) !== commit ||
      git(["status", "--porcelain", "--untracked-files=all"], sourceRoot)) {
    throw new Error("Source must be a clean repository root at the reviewed HEAD (including untracked files).");
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.mode) {
    console.error("Usage: sync-upstream.mjs --check [--source DIR]");
    console.error("       sync-upstream.mjs --apply [--dry-run] [--source DIR] [--reviewed FILE]");
    console.error("       sync-upstream.mjs --prepare-review NEW_DIR [--source DIR]");
    return 64;
  }
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const source = await sourceRepository(lock, args.source);
  try {
    const commit = git(["rev-parse", "HEAD"], source.path);
    assertSourceClean(source.path, commit);
    console.log(`pinned=${lock.commit}`);
    console.log(`latest=${commit}`);
    if (args.mode === "check") {
      if (commit !== lock.commit) return 10;
      console.log("Upstream is already pinned at the latest checked revision.");
      return 0;
    }
    if (args.mode === "prepare-review") {
      return await prepareReview(lock, source.path, commit, args.reviewDirectory);
    }
    return await applyUpdate(lock, source.path, commit, args);
  } finally {
    if (source.cleanup) await rm(source.cleanup, { recursive: true, force: true });
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
