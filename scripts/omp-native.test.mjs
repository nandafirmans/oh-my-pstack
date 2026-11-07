import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");
const executable = process.env.PSTACK_OMP_BIN || "omp";
const enabled = process.env.PSTACK_OMP_NATIVE_TESTS === "1";
const native = (name, run) => test(name, { skip: !enabled, timeout: 90000 }, run);

async function withOmp({ plugin = true, flags = [], config = "" } = {}, run) {
  const directory = await mkdtemp(join(tmpdir(), "pstack-omp-native-"));
  let child;
  let lines;
  const pending = new Map();
  const frames = [];
  const env = {
    PATH: process.env.PATH,
    HOME: join(directory, "home"),
    XDG_CONFIG_HOME: join(directory, "config"),
    XDG_DATA_HOME: join(directory, "data"),
    XDG_CACHE_HOME: join(directory, "cache"),
    PI_CODING_AGENT_DIR: join(directory, "agent"),
    PI_NO_TITLE: "1", PI_NO_PTY: "1",
  };
  try {
    assert.match(execFileSync(executable, ["--version"], { env, encoding: "utf8", timeout: 15000 }),
      new RegExp(`^(?:omp/)?${(process.env.PSTACK_OMP_VERSION || "18.18.0").replaceAll(".", "\\.")}\\s*$`));
    await mkdir(join(directory, ".omp"));
    await writeFile(join(directory, ".omp", "config.yml"), config);
    child = spawn(executable, [
      "--mode", "rpc", "--session-dir", join(directory, "sessions"),
      "--system-prompt", "Run only the deterministic offline compatibility fixture.",
      "--no-title", "--no-lsp", "--no-context-files", "--no-rules",
      "--model", "pstack-offline/fixture", "--max-time", "60s", "--max-cost", "0.01",
      "--extension", join(root, "scripts/fixtures/omp-offline-provider.mjs"),
      ...(plugin ? ["--plugin-dir", root] : []), ...flags,
    ], { cwd: directory, env, stdio: ["pipe", "pipe", "pipe"] });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    lines = createInterface({ input: child.stdout });
    const ready = Promise.withResolvers();
    const startTimer = setTimeout(() => ready.reject(new Error("OMP ready timeout")), 20000);
    child.once("error", error => ready.reject(error));
    child.once("close", () => {
      ready.reject(new Error("OMP exited before ready"));
      for (const value of pending.values()) value.reject(new Error("OMP exited during RPC command"));
    });
    lines.on("line", line => {
      let frame;
      try { frame = JSON.parse(line); } catch { return; }
      frames.push(frame);
      if (frame.type === "ready") ready.resolve(frame);
      if (frame.type === "response") {
        const value = pending.get(frame.id);
        if (!value) return;
        pending.delete(frame.id);
        if (frame.success) value.resolve(frame.data ?? {});
        else value.reject(new Error(frame.error));
      }
    });
    try { await ready.promise; } finally { clearTimeout(startTimer); }
    let serial = 0;
    async function command(type, args = {}) {
      const id = `compat-${++serial}`;
      const value = Promise.withResolvers();
      pending.set(id, value);
      const timer = setTimeout(() => value.reject(new Error(`${type} timeout`)), 20000);
      child.stdin.write(`${JSON.stringify({ id, type, ...args })}\n`);
      try { return await value.promise; }
      finally { clearTimeout(timer); pending.delete(id); }
    }
    async function invoke(name, args = "") {
      const promptId = `compat-${serial + 1}`;
      await command("prompt", { message: `/skill:${name} ${args}`.trim() });
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const state = await command("get_state");
        if (!state.isStreaming) {
          const result = frames.findLast(frame => frame.type === "prompt_result" && frame.id === promptId);
          if (result) {
            assert.equal(result.status, "completed", JSON.stringify(result));
            return (await command("get_messages")).messages;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error("Native skill invocation did not settle");
    }
    await run({ command, invoke, frames });
    const stats = await command("get_session_stats");
    assert.equal(stats.cost, 0);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "close");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
      try { await exited; } finally { clearTimeout(timer); }
    }
    lines?.close();
    await rm(directory, { recursive: true, force: true });
  }
}

native("native plugin discovery, invocation provenance, and skill URI playbook reads", async () => {
  await withOmp({}, async ({ command, invoke }) => {
    const commands = (await command("get_available_commands")).commands;
    for (const name of ["poteto-mode", "pstack-pi"]) {
      assert.ok(commands.some(item => item.name === `skill:${name}` && item.source === "skill"));
    }
    assert.ok((await command("get_state")).systemPrompt.join("\n").includes('<skill name="pstack-pi">'));
    const router = await readFile(join(root, "skills/poteto-mode/SKILL.md"), "utf8");
    const playbooks = [...new Set([...router.matchAll(/skill:\/\/poteto-mode\/(playbooks\/[\w-]+\.md)/g)].map(match => match[1]))];
    assert.ok(playbooks.includes("playbooks/bug-fix.md"));
    for (const target of ["pstack-pi", ...playbooks.map(file => `poteto-mode/${file}`)]) {
      await command("new_session");
      const messages = await invoke("poteto-mode", `PSTACK_OFFLINE_READ skill://${target}`);
      const record = messages.findLast(message => message.customType === "skill-prompt");
      assert.equal(record.details.name, "poteto-mode");
      assert.equal(record.details.path, join(root, "skills/poteto-mode/SKILL.md"));
      assert.equal(record.details.prompt, `/skill:poteto-mode PSTACK_OFFLINE_READ skill://${target}`);
      assert.ok(record.details.lineCount > 0);
      const result = messages.findLast(message => message.role === "toolResult" && message.toolName === "read");
      assert.equal(result.isError, false, JSON.stringify(result));
      const text = result.content.map(part => part.text ?? "").join("\n");
      const file = target === "pstack-pi" ? "skills/pstack-pi/SKILL.md" : `skills/${target}`;
      const body = await readFile(join(root, file), "utf8");
      assert.ok(text.includes(body.split("\n").find(line => /^#{1,6} /u.test(line))), target);
    }
    const adapterMessages = await invoke("pstack-pi");
    assert.equal(adapterMessages.findLast(message => message.customType === "skill-prompt").details.name, "pstack-pi");
  });
});

native("manualSkills hides model catalog entries without disabling native commands", async () => {
  await withOmp({ config: 'skills:\n  manualSkills: ["*"]\n' }, async ({ command, invoke }) => {
    const state = await command("get_state");
    assert.ok(!state.systemPrompt.join("\n").includes('<skill name="pstack-pi">'));
    const commands = (await command("get_available_commands")).commands;
    assert.ok(commands.some(item => item.name === "skill:pstack-pi"));
    const messages = await invoke("poteto-mode", "PSTACK_OFFLINE_READ skill://pstack-pi");
    assert.equal(messages.findLast(item => item.toolName === "read").isError, false);
  });
});

native("missing or disabled skills cannot satisfy host capability preflight", async () => {
  for (const options of [{ plugin: false }, { flags: ["--no-skills"] },
    { config: "skills:\n  enableSkillCommands: false\n" }]) {
    await withOmp(options, async ({ command }) => {
      const commands = (await command("get_available_commands")).commands;
      for (const name of ["poteto-mode", "pstack-pi"]) {
        assert.ok(!commands.some(item => item.name === `skill:${name}`));
      }
      assert.deepEqual((await command("get_messages")).messages, []);
    });
  }
});

native("native task advertises configured batch, isolation, effort, and agent capabilities", async () => {
  for (const batch of [false, true]) {
    await withOmp({ config: `task:\n  batch: ${batch}\n  isolation:\n    enabled: true\n  enableEffort: true\n  workerThreads: 0\n` }, async ({ command }) => {
      const state = await command("get_state");
      const task = state.dumpTools.find(tool => tool.name === "task");
      assert.ok(task);
      for (const name of ["task", "scout", "reviewer", "security-reviewer", "sonic", "poteto-agent", "comment-sicko"]) {
        assert.ok(task.description.includes(`\`${name}\``), name);
      }
      const item = batch ? task.parameters.properties.tasks.items : task.parameters;
      for (const name of ["agent", "task", "solutionSpace", "model", "isolated", "effort"]) {
        assert.ok(item.properties[name], name);
      }
      assert.ok(!item.required.includes("agent"));
      assert.equal(Boolean(task.parameters.properties.tasks), batch);
      assert.deepEqual((await command("get_subagents")).subagents, []);
    });
  }
});

native("native batch dispatch resolves configured roles without provider inference", async () => {
  const config = `modelRoles:
  task: pstack-offline/fixture
  smol: pstack-offline/fixture
  advisor: pstack-offline/fixture
task:
  workerThreads: 0
  agentModelOverrides:
    scout: "@task"
    reviewer: "@task"
    security-reviewer: "@task"
    sonic: "@smol"
`;
  await withOmp({ config }, async ({ command, invoke, frames }) => {
    await command("set_subagent_subscription", { level: "events" });
    const tasks = [undefined, "scout", "reviewer", "security-reviewer", "sonic"].map((agent, index) => ({
      name: `OfflineWorker${index}`,
      ...(agent ? { agent } : {}),
      task: "Return the offline fixture response. Do not call task or start subagents. Do not edit files.",
      solutionSpace: "One fixed offline response; no implementation or design choice.",
    }));
    const messages = await invoke("pstack-pi", `PSTACK_OFFLINE_TASK ${JSON.stringify({ context: "Disposable provider-free compatibility probe.", tasks })}`);
    const dispatch = messages.findLast(message => message.role === "toolResult" && message.toolName === "task");
    assert.ok(dispatch, JSON.stringify(messages));
    assert.equal(dispatch.isError, false, JSON.stringify(dispatch));
    const deadline = Date.now() + 20000;
    let agents = [];
    while (Date.now() < deadline) {
      const completed = frames.filter(frame => frame.type === "subagent_lifecycle" && frame.payload.status === "completed");
      agents = [...new Map(completed.map(frame => [frame.payload.id, frame.payload])).values()];
      if (agents.length === tasks.length) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(agents.length, tasks.length, JSON.stringify({ agents, dispatch }));
    assert.deepEqual(agents.map(agent => agent.agent).sort(), ["task", "scout", "reviewer", "security-reviewer", "sonic"].sort());
    for (const agent of agents) {
      const transcript = await command("get_subagent_messages", { subagentId: agent.id });
      const reply = transcript.messages.findLast(message => message.role === "assistant");
      assert.equal(reply.provider, "pstack-offline");
      assert.equal(reply.model, "fixture");
      assert.equal(reply.content.find(part => part.type === "text").text, "Offline fixture completed. No inference occurred.");
    }
  });
});

native("native session statistics include completed child usage without double counting", async () => {
  const config = `modelRoles:
  task: pstack-offline/fixture
async:
  enabled: false
task:
  workerThreads: 0
`;
  await withOmp({ config }, async ({ command, invoke }) => {
    const tasks = [{
      name: "AccountingWorker",
      task: "Return the fixed offline response. Do not call task, start subagents, or edit files.",
      solutionSpace: "One fixed offline response.",
    }];
    const messages = await invoke("pstack-pi", `PSTACK_OFFLINE_TASK ${JSON.stringify({ context: "Synthetic usage accounting check, not provider billing.", tasks })}`);
    const result = messages.findLast(message => message.role === "toolResult" && message.toolName === "task");
    assert.equal(result.isError, false, JSON.stringify(result));
    assert.equal(result.details.usage.totalTokens, 10);
    const stats = await command("get_session_stats");
    assert.equal(stats.tokens.input, 21);
    assert.equal(stats.tokens.output, 9);
    assert.equal(stats.tokens.total, 30);
  });
});
