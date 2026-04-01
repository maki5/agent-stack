---
name: coding-discipline
description: How to implement code changes correctly — read before write, incremental task loop, new vs existing file handling, cross-layer contract awareness, and build verification after each task.
tags:
  - coding
  - implementation
  - quality
license: MIT
compatibility: opencode
---

# Coding Discipline

## Core Rule: Read Before Write

Never write or edit a file without reading it first. Always read:
1. The file you are about to change
2. Closely related files (same package/module, parent component, test file)
3. Any interface or contract the file must satisfy

This prevents overwriting existing logic, missing established patterns, and generating code that diverges from the codebase style.

## Implementation Loop

Process tasks one at a time. For each task from the plan:

```
1. Read → understand the affected area
2. Write → make the minimal change needed
3. Verify → run the build; fix if broken
4. Next task
```

Never batch multiple tasks before verifying. A broken build from task 2 contaminates task 3.

## New File vs Existing File

### Adding a new file

Before creating a file, check if one already exists for that purpose:

```bash
ls <target-directory>/
```

If a file already exists for the same concern → edit it, do not create a duplicate.

If the file is genuinely new:
1. Read 2–3 sibling files in the same directory to understand naming conventions, import style, and structure
2. Mirror their structure — do not invent a new layout
3. Keep the file focused — one concern per file

### Editing an existing file

1. Read the entire file first — even if you only need to change a few lines
2. Locate the exact insertion or modification point
3. Make the smallest edit that satisfies the task
4. Do not reformat unrelated code — leave surrounding lines untouched

## Understanding the Codebase Before Coding

When implementing in an unfamiliar area:

1. Read the entry point for the affected layer (e.g. router, main handler, component index)
2. Follow the call chain to the area you need to change — read each file along the way
3. Identify the naming conventions, error handling style, and abstraction patterns in use
4. Only then write code — match the patterns you found

Do not guess patterns. Read them.

## Cross-Layer Contract Awareness

When a plan touches multiple layers (e.g. backend + frontend, API + DB), contracts between layers must be consistent:

| Contract type | Where defined | Read before touching |
|--------------|---------------|----------------------|
| API request/response shape | Backend handler + frontend fetch call | Both sides |
| Database schema | Migration file / schema file | Before writing queries |
| Shared types/interfaces | Types package, proto file, OpenAPI spec | Before implementing either side |
| Event/message format | Producer + consumer | Both sides |

If you change a contract (e.g. add a field to an API response), update **all sides** before verifying — a build that compiles but has a runtime mismatch is still broken.

## Incremental Build Verification

After completing each task, run the build:

```bash
<commands.build>
```

If the build fails:
- Read the error output fully before attempting a fix
- Identify the root file — do not fix symptoms in downstream files first
- Make one targeted fix
- Re-run the build
- Apply `self-healing` retry logic if it fails again (max 3 attempts)

Do not proceed to the next task until the build passes.

## When the Plan is Ambiguous

If a plan task is unclear about exactly what to change:

1. Read the relevant code area — the answer is usually obvious from context
2. If still ambiguous, make the smallest safe change that satisfies the described intent
3. Do not ask the coordinator for clarification mid-task unless the ambiguity would require a design decision (e.g. choosing between two data models)

## What Not to Do

- **Do not rewrite working code** — if the existing code passes the build and satisfies the plan, leave it alone
- **Do not change unrelated files** — scope every change to what the plan specifies
- **Do not add abstractions the plan didn't ask for** — implement what is described; suggest improvements in the summary if you see them
- **Do not leave dead code** — if you replace something, delete the old version
- **Do not leave TODO comments** — if you can't implement something fully, escalate; do not leave stubs silently
