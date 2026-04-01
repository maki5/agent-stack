---
name: self-healing
description: Self-healing patterns for automatic validation and error fixing in agent workflows
tags:
  - agents
  - validation
  - auto-fix
  - quality
license: MIT
compatibility: opencode
metadata:
  audience: coordinator-agents
  category: agent-patterns
---

# Self-Healing Skill

## What I Do

I provide patterns and procedures for implementing self-healing agent workflows — automatically catching and fixing errors without user intervention.

## When to Use Me

Use this skill when:
- Building coordinator agents that need self-healing capabilities
- Implementing validation-guard delegation patterns
- Adding auto-fix loops to existing workflows
- Creating retry logic for failed validations

## Core Pattern: Validation Gate

Every implementation chunk should pass through a validation gate:

```
[Implement Chunk] → [Validation Gate] → [Pass?]
                              ↓
                        [Yes] → [Commit]
                              ↓
                        [No]  → [Auto-Fix] → [Re-validate]
                                              ↓
                                        [Pass?]
                                              ↓
                                        [Yes] → [Commit]
                                              ↓
                                        [No]  → [Retry] (max 3x)
                                              ↓
                                        [Fail] → [Escalate to User]
```

## Validation Gate Pattern

### After Each Implementation Chunk

Read `profile.commands` from `.opencode/opencode.json` to get the actual validation commands. Then:

```markdown
### Step X: Validate Chunk

Run static validation using commands from profile.commands:

```bash
# profile.commands.typecheck (if set)
# profile.commands.lint
```

If any command fails:
- Identify the failing file and error
- Attempt auto-fix (see Auto-Fix Delegation Pattern below)
- Re-run validation
- Retry up to 3 times
- If still failing → Escalate to user
```

### Post-Implementation Runtime Validation

If the project has a running dev environment, perform a runtime check:

```markdown
### Runtime Validation Phase

Check if the dev environment is running (project-specific health check).

If running:
- Run integration/smoke tests
- For each BLOCKER: attempt auto-fix
- Re-validate (max 3 attempts)
- WARNINGS → Log but proceed

If dev environment not running:
- Add WARNING: "Runtime validation skipped — dev environment not running"
- Proceed to reviews
```

## Auto-Fix Delegation Pattern

### Single Issue Fix

```markdown
Fix individual BLOCKER:

Source: validation
Issue: <error description>
File: <path>:<line>
Context: <relevant code snippet>
Attempt: 1

Wait for fix:
- If SUCCESS → Note commit, continue
- If RETRY NEEDED → Re-attempt with Attempt: 2
- If ESCALATION → Stop workflow, report to user
```

### Multiple Issues Fix

Process BLOCKERs in order of severity:

```markdown
1. Database/schema errors (break functionality)
2. Compilation/type errors
3. Runtime errors
4. Lint errors (code quality)

For each BLOCKER:
- Attempt fix
- Verify fix
- If successful, proceed to next
- If escalated, stop and report all pending issues
```

## Retry Logic Pattern

### Counter Management

Track retry attempts per issue:

```markdown
Retry state:
- issue_id: <file>:<line>:<error-type>
- attempts: 0
- max_attempts: 3

Loop:
1. attempts += 1
2. Attempt fix
3. If SUCCESS → break
4. If ESCALATION → escalate to user
5. If attempts >= max_attempts → escalate to user
6. Re-validate after fix
7. If still failing → continue loop
```

### Validation Retry

After fix is applied:

```markdown
Re-validation:

Run the same commands that found the issue (from profile.commands).

If validation passes:
- Fix successful ✓

If validation fails with SAME error:
- Increment retry counter
- Re-attempt fix

If validation fails with NEW error:
- Treat as new issue
- Reset retry counter
- Begin new fix attempt
```

## Review Integration Pattern

### Auto-Fix After Reviews

```markdown
After review pass:

Parse review output for BLOCKERS (P1):

For each P1 BLOCKER:
- Identify the file and line
- Delegate fix to the appropriate developer agent
- Re-run tests to verify
- Re-run review to confirm fix

Wait for all fixes to complete:
- All SUCCESS → Re-run review
- Any ESCALATION → Report to user with all findings

After re-review:
- If still BLOCKERS → Re-attempt fix (Attempt 2)
- Max 3 review cycles total
```

### Review Cycle Limit

Prevent infinite loops:

```markdown
Review cycle counter:
- cycle: 0
- max_cycles: 3

Loop:
1. cycle += 1
2. Run review pass
3. If PASS → proceed to next pass
4. If BLOCKERS:
   - Delegate fixes
   - If cycle >= max_cycles → Escalate to user
   - Else → continue loop
```

## Error Classification Guide

### Auto-Fixable Errors

These can be automatically fixed:

| Error Type | Example | Fix Approach |
|------------|---------|--------------|
| Column/field name typo | Wrong field name in query | Check schema, correct name |
| Missing import | Undefined symbol | Add import statement |
| Missing error check | Ignored error return | Add error handling |
| Type mismatch | Wrong type annotation | Correct type |
| Syntax error | Missing bracket/comma | Add punctuation |
| Stale content | Old code still present | Remove old code |
| Simple lint error | Unused variable | Remove or use variable |

### Non-Auto-Fixable Errors

These require user intervention:

| Error Type | Example | Reason |
|------------|---------|--------|
| Architectural | Need to redesign data flow | Requires design decisions |
| Schema change | New table/column needed | Needs migration |
| API contract | Changes response format | Breaks other services |
| Performance | Query needs optimization | May need indexes |
| Security | Auth logic issue | Critical, needs review |
| Complex logic | Business rule wrong | Needs understanding |
| Ambiguous | Error unclear | Root cause unknown |

## State Management

Track state across validation/fix cycles:

```markdown
Validation State:
{
  "phase": "chunk-2",
  "files_changed": [...],
  "findings": {
    "blockers": [...],
    "warnings": [...]
  },
  "retry_counts": {
    "file:line:error": 2
  }
}
```

## Communication Patterns

### Silent Operation

Self-healing should be silent unless:
- Errors found (report findings)
- Fix applied (report what was fixed)
- Escalation needed (report to user)

### Success Reporting

Minimal success messages:
```
✓ Chunk 2 validated
✓ 3 issues auto-fixed
✓ Runtime validation passed
```

### Failure Reporting

Comprehensive failure messages:
```
❌ Validation Failed After 3 Attempts

Issue: <error description>
File: <path>:<line>

Attempts:
1. <what was tried> — Result: Still failing
2. <what was tried> — Result: Still failing
3. <what was tried> — Result: Error persists

Current Error: <error message>
Recommendation: <what human should investigate>
Requires user intervention.
```

## Best Practices

1. **Fail Fast**: Run validation immediately after each change
2. **Minimal Fixes**: Auto-fix should make smallest possible change
3. **Validate Fixes**: Never assume fix works — always re-validate
4. **Retry Limits**: Max 3 attempts prevents infinite loops
5. **Clear Logging**: Track what was tried and why it failed
6. **Safe Escalation**: When in doubt, escalate to user
7. **Read Commands from Profile**: Always use `profile.commands` — never hardcode tool commands
