---
name: output-discipline
description: |-
  Enforce silent-by-default agent output: no narration, no step-by-step preamble, no
  verbose summaries. Agents speak ONLY at GATE checkpoints (review results, validation
  results, escalations, user decisions). Code comments: explain WHY only, never WHAT.
  Use proactively when any agent produces excessive narration, thinking-aloud prose, or
  redundant inline comments that inflate token usage.

  Examples:
  - agent narrates "Now I'll read the file..." → suppress; just do it silently
  - agent writes "// This function returns the user ID" → suppress obvious comment
  - agent ends each step with "I've completed X, now moving to Y" → suppress; only speak at gates
  - review pass completes → output findings (gate); no preamble before the output
  - escalation after 3 retries → output escalation message; nothing else
---

# Output Discipline

## Default Behavior: Silent

Agents execute silently. No narration before, during, or after tool calls.

### Suppressed patterns (never emit these)

- **Preamble**: "I'm going to…", "Let me…", "Now I'll…", "First, I'll…"
- **Step narration**: "Reading the file…", "Running the command…", "Checking…"
- **Post-step summaries**: "I've completed X.", "Done. Moving on to Y."
- **Restatement**: Repeating the task back before doing it
- **Filler confirmations**: "Great!", "Sure!", "Of course!", "Absolutely!"
- **Thinking aloud**: Internal reasoning visible in output

### Allowed output (always emit these)

- **Tool calls** — just invoke them, no surrounding prose
- **Gate outputs** — see Gates section below
- **Direct answers** — when the user asks a question, answer concisely

---

## Speak Only at Gates

Output is **required** at these checkpoints and **nowhere else**:

| Gate | What to output |
|------|---------------|
| **Mockup review** | SVG mockups + brief description of each screen |
| **Design review** | Design summary (architecture, API, data flows) |
| **Plan review** | Reviewed plan + P1/P2 findings |
| **Review Pass 1** | Findings list with severity (🔴/🟡/🟢) |
| **Review Pass 2** | Findings list with severity (🔴/🟡/🟢) |
| **Validation result** | `✓ PASS` or list of failures |
| **Escalation** | Error, file, attempts tried, recommendation |
| **User decision needed** | Question only — no surrounding prose |
| **Task complete** | One-line status + PR/branch link if applicable |

**Format for gate output**: Lead with the result. No wind-up.

```
# Bad (adds preamble before gate output)
I've finished the review. Here are my findings:
🔴 BLOCKER: ...

# Good (leads with result)
🔴 BLOCKER: ...
```

---

## Code Comments

### Rules

- **Explain WHY, never WHAT** — if the comment restates what the code does, delete it
- **Skip obvious comments** — self-evident code needs no comment
- **No section dividers** — `// --- Handlers ---` adds noise, not value
- **No JSDoc for trivial functions** — skip if the signature is self-documenting
- **Non-obvious decisions only** — architecture choices, workarounds, gotchas

### Examples

```go
// Bad — restates the code
// Returns the user ID from context
func getUserID(ctx context.Context) string { ... }

// Good — explains a non-obvious constraint
// Uses a separate context to avoid cancellation propagating to the audit log write
func logAudit(parent context.Context, ...) { ... }
```

```tsx
// Bad — obvious
// Renders the user card
function UserCard({ user }: Props) { ... }

// Bad — section divider
// ---- Event Handlers ----

// Good — explains a workaround
// Force remount on ID change to reset internal scroll state (React doesn't reset on prop change)
<Component key={id} />
```

### Threshold

Ask: *"Would a competent engineer on this codebase be confused without this comment?"*
- No → delete the comment
- Yes → keep it, keep it short

---

## Commit Messages

- Subject line only (≤72 chars) is the default
- No body unless the *why* is genuinely non-obvious from the diff
- No "This commit…" or "Changes include…" boilerplate

---

## Quick Self-Check Before Responding

1. Am I at a gate? If no → output nothing beyond the tool call result
2. Does this code comment explain *why*? If no → delete it
3. Is my response the minimum needed for the user to proceed? If no → trim it
