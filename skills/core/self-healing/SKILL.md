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

I provide patterns and procedures for implementing self-healing agent workflows - automatically catching and fixing errors without user intervention.

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

```markdown
### Step X: Validate Chunk

Run static validation:

```bash
cd backend && go vet ./...
cd web-frontend && npx tsc --noEmit
make lint
```

If any command fails:

```
Delegate to @validation-guard:
- Mode: static
- Changed files: <list>
- Phase: <chunk-name>
```

Based on validation-guard output:
- If PASS → Proceed to commit
- If BLOCKERS → Delegate to @auto-fix for each BLOCKER
- If only WARNINGS → Log and proceed

After auto-fix completes:
- Re-run validation
- Retry up to 3 times
- If still failing → Escalate to user
```

### Post-Implementation Runtime Validation

```markdown
### Runtime Validation Phase

Check if dev-suite is running:

```bash
curl -sf http://localhost:3000/health > /dev/null 2>&1 && echo "running" || echo "stopped"
```

If running:
```
Delegate to @validation-guard:
- Mode: runtime
- Changed files: <all-changed-files>
- Phase: post-implementation
```

Process findings:
- All BLOCKERS → Delegate to @auto-fix
- Re-validate after fixes (max 3 attempts)
- WARNINGS → Log but proceed

If dev-suite not running:
- Add WARNING: "Runtime validation skipped - dev-suite not running"
- Proceed to reviews
```

## Auto-Fix Delegation Pattern

### Single Issue Fix

```markdown
Fix individual BLOCKER:

```
@auto-fix

Source: validation-guard
Issue: SQL query failing - column "owner_id" does not exist
File: backend/internal/handlers/workshop.go:45
Context: SELECT owner_id FROM workshops WHERE id = $1
Attempt: 1
```

Wait for auto-fix response:
- If SUCCESS → Note commit hash, continue
- If RETRY NEEDED → Re-delegate with Attempt: 2
- If ESCALATION → Stop workflow, report to user
```

### Multiple Issues Fix

Process BLOCKERS in order of severity:

```markdown
1. SQL/Database errors (break functionality)
2. Handler errors (500 errors)
3. UI errors (broken interactions)
4. Type errors (compilation)
5. Lint errors (code quality)

For each BLOCKER:
- Delegate to @auto-fix
- Wait for result
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
2. Delegate to @auto-fix with attempt number
3. If SUCCESS → break
4. If ESCALATION → escalate to user
5. If attempts >= max_attempts → escalate to user
6. Re-validate after fix
7. If still failing → continue loop
```

### Validation Retry

After auto-fix commits changes:

```markdown
Re-validation:

```bash
# Run the same checks that found the issue
cd backend && go vet ./...
cd web-frontend && npx tsc --noEmit
make lint
make test-backend  # or affected tests
```

If validation passes:
- ✓ Fix successful

If validation fails with SAME error:
- Increment retry counter
- Re-delegate to @auto-fix

If validation fails with NEW error:
- Treat as new issue
- Reset retry counter
- Delegate to @auto-fix
```

## Review Integration Pattern

### Auto-Fix After Reviews

```markdown
After @review-standard or @review-independent:

Parse review output for BLOCKERS:

For each 🔴 BLOCKER:
```
@auto-fix

Source: review-standard
Issue: <blocker description>
File: <file>:<line>
Context: <code snippet from review>
Attempt: 1
```

Wait for all auto-fixes to complete:
- All SUCCESS → Re-run review
- Any ESCALATION → Report to user with findings

After re-review:
- If still BLOCKERS → Re-run auto-fix (Attempt 2)
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
2. Delegate to @review-standard
3. If PASS → proceed to @review-independent
4. If BLOCKERS:
   - Delegate to @auto-fix
   - If cycle >= max_cycles → Escalate to user
   - Else → continue loop
```

## Error Classification Guide

### Auto-Fixable Errors

These can be automatically fixed:

| Error Type | Example | Fix Approach |
|------------|---------|--------------|
| SQL column typo | `owner_id` vs `user_id` | Check schema, correct column name |
| Missing import | `undefined: WorkshopInput` | Add import statement |
| Missing error check | `workshop, _ := ...` | Add error handling |
| Missing handler | Button without onClick | Add handler reference |
| Type mismatch | `useState<string>(0)` | Correct type annotation |
| Syntax error | Missing comma | Add punctuation |
| Stale content | Old component still present | Remove old code |
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
  "validation_mode": "static",
  "findings": {
    "blockers": [...],
    "warnings": [...]
  },
  "retry_counts": {
    "file:line:error": 2
  },
  "commits": [...]
}
```

## Communication Patterns

### Silent Operation

Self-healing should be silent unless:
- Errors found (report findings)
- Fix applied (report commit)
- Escalation needed (report to user)

### Success Reporting

Minimal success messages:
```
✓ Chunk 2 validated and committed
✓ 3 issues auto-fixed (commits: abc123, def456, ghi789)
✓ Runtime validation passed
```

### Failure Reporting

Comprehensive failure messages:
```
❌ Validation Failed After 3 Attempts

Issue: SQL query still failing after auto-fix attempts
File: backend/internal/handlers/workshop.go:45

Attempts:
1. Changed owner_id → user_id - Result: Still failing
2. Checked schema, changed to ownerId - Result: Still failing  
3. Added debug logging - Result: Error persists

Current Error: column "ownerId" does not exist
Recommendation: Check actual database schema with \d workshops
Requires user intervention.
```

## Best Practices

1. **Fail Fast**: Run validation immediately after each change
2. **Minimal Fixes**: Auto-fix should make smallest possible change
3. **Validate Fixes**: Never assume fix works - always re-validate
4. **Retry Limits**: Max 3 attempts prevents infinite loops
5. **Clear Logging**: Track what was tried and why it failed
6. **Safe Escalation**: When in doubt, escalate to user
7. **Commit Often**: Each fix gets its own commit for traceability

## Integration Example

Complete workflow integration:

```markdown
## Phase 3: Implement (with Self-Healing)

For each chunk:

1. **Implement**
   - Write code following patterns
   
2. **Static Validation** (automatic)
   ```bash
   go vet && tsc --noEmit && make lint
   ```
   If fails → @validation-guard → @auto-fix (max 3x)
   
3. **Unit Tests** (automatic)
   ```bash
   make test-backend  # or frontend-test
   ```
   If fails → Analyze failures → @auto-fix test issues
   
4. **Commit**
   - Commit working code

## Phase 4: Runtime Validation (automatic)

If dev-suite running:
1. @validation-guard (runtime mode)
2. For each BLOCKER: @auto-fix
3. Re-validate (max 3x)

## Phase 5-6: Reviews (with Auto-Fix)

1. @review-standard
2. For each 🔴 BLOCKER: @auto-fix
3. Re-review (max 3 cycles)
4. @review-independent
5. Same auto-fix loop
```

## Quick Reference

```bash
# Validation commands
go vet ./...
npx tsc --noEmit
make lint
make test-backend
make frontend-test
curl http://localhost:3000/health

# Delegation templates
@validation-guard
Mode: static | runtime
Changed files: [list]
Phase: [name]

@auto-fix
Source: validation-guard | review-standard | review-independent
Issue: [description]
File: [path]:[line]
Context: [code]
Attempt: [1-3]
```
