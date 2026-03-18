---
name: code-review
description: 2-pass code review process with checklists, severity classification, and cleanup identification
tags:
  - review
  - quality
  - standards
  - checklist
license: MIT
compatibility: opencode
metadata:
  audience: all-developers
  category: quality
---

# Code Review Skill

## What I Do

I guide you through the mandatory 2-pass code review process, ensuring hard rules compliance, comprehensive testing, and code quality. I help classify findings by severity and identify cleanup opportunities.

## When to Use Me

Use this skill when:
- Performing code reviews (Pass 1 or Pass 2)
- Preparing code for review
- Evaluating review findings
- Planning cleanup tasks

## 2-Pass Review Process

### Overview

Every code change requires **TWO independent review passes** before completion:

```
Implementation → Pass 1 (Standard) → [Fix if needed] → Pass 2 (Independent) → [Fix if needed] → Format → Validate
```

**Fast-path:** If both passes produce 0 findings, skip to Format → Validate.

## Pass 1 — Standard Review

### Purpose
Check for hard rule violations, basic quality, and test coverage.

### Checklist

#### A. Hard Rule Violations 🔴

Check changed files for:

- [ ] **API Types** — Using `types/api.ts` (not manually defined)
  ```typescript
  // ❌ WRONG
  interface Workshop { name: string }
  
  // ✅ CORRECT
  import { Workshop } from '@/types/api'
  ```

- [ ] **SQL Safety** — Parameterized queries only
  ```go
  // ❌ WRONG
  query := fmt.Sprintf("SELECT * FROM users WHERE id = %d", id)
  
  // ✅ CORRECT
  query := "SELECT * FROM users WHERE id = $1"
  db.Query(ctx, query, id)
  ```

- [ ] **Error Handling** — Internal errors not exposed
  ```go
  // ❌ WRONG
  return nil, err // Raw error to client
  
  // ✅ CORRECT
  return nil, apperrors.NotFound("user not found")
  ```

- [ ] **No Secrets** — No keys/tokens in code
  ```go
  // ❌ WRONG
  apiKey := "sk-abc123xyz"
  
  // ✅ CORRECT
  apiKey := os.Getenv("API_KEY")
  ```

- [ ] **Migration Safety** — User approval for migrations
  - New migration files require explicit user approval
  - Check for UP and DOWN sections

#### B. Layer Separation 🟡

- [ ] **No business logic in handlers** — Should be in services
- [ ] **No DB calls outside repositories** — Services use repos
- [ ] **Frontend doesn't call DB directly** — Uses API client

#### C. Error Handling 🟡

- [ ] All errors handled (no naked returns)
- [ ] User-friendly error messages
- [ ] Proper error types used (`apperrors` package)
- [ ] Context passed through layers

#### D. Testing Coverage 🔴

- [ ] Tests exist for new code
- [ ] **Not just happy-path** — Minimum requirements:
  - Go handlers: 4+ test cases (success + 3 error/edge)
  - React components: 5+ test cases
  - E2E flows: 2+ scenarios
- [ ] Mock setup is correct
- [ ] Table-driven test pattern used

#### E. Database Performance 🔴

**CRITICAL: Check for performance issues in repository layer:**

- [ ] **N+1 Query Detection**
  ```go
  // ❌ WRONG - N+1 Query Pattern
  users, _ := repo.GetAllUsers(ctx)
  for _, user := range users {
      // This executes N additional queries!
      orders, _ := repo.GetOrdersByUserID(ctx, user.ID)
  }
  
  // ✅ CORRECT - Single Query with JOIN
  query := `
      SELECT u.*, o.* FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE ...
  `
  ```
  - [ ] Check loops that call repository methods
  - [ ] Check nested repository calls in services
  - [ ] Verify batch operations use single queries

- [ ] **Slow Query Detection**
  - [ ] Queries without indexes on WHERE/JOIN columns
  - [ ] SELECT * queries returning unnecessary columns
  - [ ] Missing LIMIT on large result sets
  - [ ] Unnecessary subqueries that could be JOINs
  - [ ] Queries with complex nested loops

- [ ] **Optimization Opportunities**
  - [ ] Consider adding database indexes (document in PR)
  - [ ] Use SELECT specific columns instead of *
  - [ ] Add pagination for list endpoints
  - [ ] Use connection pooling properly
  - [ ] Consider caching for frequently accessed data

- [ ] **Transaction Boundaries**
  - [ ] Multi-step operations wrapped in transactions
  - [ ] Proper rollback handling on errors
  - [ ] Minimal transaction scope (don't hold locks too long)

#### F. Code Quality 🟡

- [ ] **Naming** — Clear, descriptive names
  ```go
  // ❌ WRONG
  func doThing(w http.ResponseWriter, r *http.Request)
  
  // ✅ CORRECT
  func (h *WorkshopHandler) CreateWorkshop(w http.ResponseWriter, r *http.Request)
  ```

- [ ] **Comments** — Where needed (not obvious code)
  ```go
  // ❌ WRONG
  i++ // increment i
  
  // ✅ CORRECT
  // Rate limiting: allow 100 requests per minute per user
  ```

- [ ] **Formatting** — Follows project standards
  - Run `make format` if unsure

- [ ] **No obvious bugs** — Null checks, bounds checks, etc.

### Implementation of Performance Fixes

When database performance issues are identified:

**Step 1: Analyze**
- Document the exact issue (N+1 query, missing index, etc.)
- Identify the code location causing the problem
- Estimate impact (query count, execution time)

**Step 2: Implement Fix**
- Rewrite queries to use JOINs instead of loops
- Add database indexes where appropriate
- Implement pagination for large datasets
- Add caching if beneficial

**Step 3: Verify**
- Re-run tests to ensure no regressions
- Verify fix resolves the performance issue
- Check edge cases still work

**Step 4: Document**
- Note performance improvements in commit message
- Add comments explaining complex optimizations
- Update API docs if pagination added

### Pass 1 Output Format

For each finding, classify severity:

```markdown
## Pass 1 Findings

### 🔴 BLOCKER (Must Fix)
1. **File:** `backend/internal/handlers/workshop.go:45`
   **Issue:** SQL string interpolation (Hard Rule #4)
   **Fix:** Use parameterized query: `WHERE id = $1`

2. **File:** `web-frontend/components/WorkshopCard.tsx`
   **Issue:** Manually defined Workshop interface (Hard Rule #3)
   **Fix:** Import from `types/api.ts`

### 🟡 WARNING (Should Fix)
1. **File:** `backend/internal/services/workshop.go:78`
   **Issue:** Business logic should be in service, not handler
   **Fix:** Move validation to service layer

### 🟢 SUGGESTION (Nice to Have)
1. **File:** `backend/internal/models/workshop.go`
   **Suggestion:** Add JSON tags to all fields for consistency
```

## Pass 2 — Independent + Cleanup Review

### Purpose
Fresh perspective on design, maintainability, and technical debt.

### Checklist

#### A. Design Review 🟡

- [ ] **Architecture makes sense**
  - Are layers properly separated?
  - Is the code maintainable?
  - Can it be extended?

- [ ] **Complexity is appropriate**
  - Not over-engineered
  - No premature abstraction
  - Clear responsibilities

- [ ] **Future extensibility**
  - Easy to add features?
  - Breaking changes minimized?

#### B. Naming & Semantics 🟡

- [ ] **Function names** describe what they do
- [ ] **Variable names** are clear
- [ ] **No confusing abbreviations**

```go
// ❌ WRONG
func calc(w http.ResponseWriter, r *http.Request)
ws := &WorkshopSvc{}

// ✅ CORRECT
func (h *WorkshopHandler) CalculateTotalPrice(w http.ResponseWriter, r *http.Request)
workshopService := &WorkshopService{}
```

#### C. Performance & Optimization 🟡

- [ ] **Query execution count**
  - Trace code paths and count database queries
  - Flag any increase in query count per request
  - Verify no queries execute in loops (N+1)

- [ ] **Algorithmic complexity**
  - O(n²) or worse nested loops on large datasets
  - Inefficient data structures
  - Unnecessary computations

- [ ] **Resource usage**
  - Large memory allocations in loops
  - Unclosed resources
  - Missing context cancellation checks

#### D. Edge Cases 🟡

- [ ] **Boundary conditions** handled
  ```go
  // Check for empty slice
  if len(items) == 0 {
      return nil, apperrors.NotFound("no items found")
  }
  ```

- [ ] **Null/undefined safety**
  ```go
  // Check pointers
  if user == nil {
      return nil, apperrors.NotFound("user not found")
  }
  ```

- [ ] **Concurrent access** (if applicable)
  ```go
  // Thread-safe map access
  mu.RLock()
  defer mu.RUnlock()
  ```

- [ ] **Resource cleanup**
  ```go
  // Close resources
  defer rows.Close()
  defer file.Close()
  ```

#### D. Maintainability 🟡

- [ ] **Code is readable**
  - Clear flow
  - No deeply nested conditionals
  - Functions under ~50 lines

- [ ] **Duplication minimized**
  - DRY principle
  - Shared utilities used

- [ ] **Documentation adequate**
  - Complex logic explained
  - API contracts documented
  - Swagger annotations present

#### E. Cleanup Identification 🟢

Flag for removal:

- [ ] **Dead code** — Functions never called
- [ ] **Unused imports** — Go/TypeScript
- [ ] **Stale references** — Old function names, imports
- [ ] **Commented-out code** — Delete (it's in git history)
- [ ] **Unused variables** — Assigned but never used
- [ ] **TODO comments** — Should be addressed or tracked

### Pass 2 Output Format

```markdown
## Pass 2 Findings

### 🟡 WARNING (Should Fix)
1. **Design:** `backend/internal/services/booking.go`
   **Issue:** Service is doing too much (SRP violation)
   **Suggestion:** Extract payment logic to PaymentService

2. **Edge Case:** `backend/internal/handlers/user.go:89`
   **Issue:** No check for empty email string
   **Fix:** Add validation: `if input.Email == ""`

### 🟢 SUGGESTION (Nice to Have)
1. **Naming:** `backend/internal/models/`
   **Suggestion:** Rename `WS` to `Workshop` for clarity

### 🧹 CLEANUP OPPORTUNITIES
1. **Dead code:** `backend/internal/utils/old.go:45-67`
   Function `calculateLegacy` is never called

2. **Unused import:** `web-frontend/components/Card.tsx`
   Remove: `import { useEffect } from 'react'`

3. **Stale reference:** `backend/internal/handlers/README.md`
   References old handler name `UserHandler` (now `AccountHandler`)
```

## Severity Classification

### 🔴 BLOCKER
**Must fix before merge.** Hard rule violations, security issues, broken functionality.

Examples:
- Hard rule violation (#1-13)
- SQL injection vulnerability
- Exposed secrets
- Missing authentication check
- Breaking API change without versioning

### 🟡 WARNING
**Should fix before merge.** Code quality issues, maintainability concerns, edge cases.

Examples:
- Business logic in wrong layer
- Missing error handling
- Poor naming
- Incomplete test coverage
- Obvious edge case not handled

### 🟢 SUGGESTION
**Nice to have.** Style preferences, minor improvements.

Examples:
- Variable could be renamed
- Function could be extracted
- Comment could be clearer
- Alternative implementation suggested

## Fixing Findings

### What You Can Fix Automatically

- Minor formatting issues
- Unused imports
- Dead code (with verification)
- Simple naming improvements
- Missing semicolons/brackets

### What Must Be Flagged for User

- 🔴 Blockers
- Architectural concerns
- Major design changes
- Breaking changes
- Anything requiring domain knowledge

## Review Workflow in Agents

### For @implement, @fix, @refactor

```yaml
Phase: Post-Implementation Review

Step 1: Pass 1 Review
  - Get changed files: git diff --name-only main...HEAD
  - Delegate to Reviewer agent (mode: standard)
  - If 🔴 or 🟡 findings: Delegate to Implementer to fix
  - Run go vet + tsc --noEmit after fixes

Step 2: Pass 2 Review
  - Delegate to Reviewer agent (mode: independent)
  - If 🔴 or 🟡 findings: Delegate to Implementer to fix
  - Run go vet + tsc --noEmit after fixes

Step 3: Conditional Retest
  - If either pass had findings: make test
  - If 0 findings both passes: Skip to Format

Step 4: Format
  - make format

Step 5: Validate
  - make validate
```

## Example Review Session

### Input
```
Changed files:
- backend/internal/handlers/rating.go (new)
- backend/internal/services/rating.go (new)
- backend/internal/repository/rating.go (new)
- backend/internal/models/rating.go (new)
- backend/migrations/001_add_ratings_table.sql (new)
```

### Pass 1 Output
```markdown
## Pass 1 Review Results

### 🔴 BLOCKER (1)
1. `backend/migrations/001_add_ratings_table.sql`
   Missing DOWN migration. Add rollback SQL.

### 🟡 WARNING (2)
1. `backend/internal/handlers/rating.go:67`
   Not using `apperrors` package for error. Use `apperrors.BadRequest()`.

2. `backend/internal/handlers/rating_test.go`
   Only 2 test cases. Minimum required: 4 (add validation + not found tests).

### 🟢 SUGGESTION (1)
1. `backend/internal/services/rating.go:45`
   Consider extracting magic number (5) to constant `maxRatingScore`.
```

### After Fixes
```markdown
## Pass 2 Review Results

### 🟡 WARNING (1)
1. `backend/internal/repository/rating.go:89`
   No index on `workshop_id` column. Consider adding for query performance.

### 🧹 CLEANUP
1. `backend/internal/handlers/rating.go:23`
   Unused import: `fmt`
```

### Final State
✅ All 🔴 and 🟡 findings fixed
✅ 0 critical issues remaining
✅ Ready for format + validate

## Quick Reference

### Review Checklist Summary

**Pass 1 (Must Have):**
- [ ] No hard rule violations
- [ ] Tests comprehensive (not just happy path)
- [ ] Error handling proper
- [ ] SQL injection safe
- [ ] No secrets exposed

**Pass 2 (Should Have):**
- [ ] Design is maintainable
- [ ] Edge cases handled
- [ ] Naming is clear
- [ ] No dead code

### Commands

```bash
# Get changed files
git diff --name-only main...HEAD

# Check formatting
cd backend && gofmt -l .
cd web-frontend && npx prettier --check "**/*.{ts,tsx}"

# Run vet
cd backend && go vet ./...

# Run tests
make test

# Full validation
make validate
```
