---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, and onboarding mental models. Use why for motivation."
disable-model-invocation: true
---

# How

Follow the [portable runtime contract](../pstack-pi/references/runtime.md) for explorer and synthesizer roles, model choices, and host fallbacks. Every child is read-only. Use the configured `how explorer` and `how explainer` choices when present; otherwise use the canonical `explorer` and `synthesizer` roles. `auto` and `inherit-parent` leave the model unset. Report unavailable choices and use a live host-supported fallback, never a hard-coded provider slug.

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem: enough to build a working mental model, not annotated source code.

## 1. Assess complexity

If scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, small utility, or narrow question like "how does function X work"): no explorers. Launch one read-only explainer that explores and explains in one pass, built from `references/explainer-prompt.md` without the explorer-findings section. Go to step 4.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, or a broad architectural question): use parallel explorers, then an explainer.

When in doubt, start simple. A single explainer can read more files if needed.

## 2. Explore (complex only)

Decompose the question into 2 to 4 angles, each a distinct slice of the subsystem. Launch all explorers concurrently through the host's task facility, using `references/explorer-prompt.md` with the angle filled in. Give each a standalone brief. Use host file search, text or symbol search, and file reads; trace actual entry points and data flow, never guessed file names. Report gaps rather than inventing missing connections.

## 3. Synthesize (complex only)

Once all explorers have returned, launch one explainer using `references/explainer-prompt.md` with every explorer's findings filled in. Reconcile overlaps and resolve contradictions against the code.

## 4. Present

Present the explainer's output. Light edits for clarity and context from the conversation are fine. Do not substantially rewrite it.

## Output format

Use the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
