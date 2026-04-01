---
name: github-issues
description: Create and manage GitHub issues following project conventions. Use when creating bug reports, feature requests, investigation issues, or updating existing issues. Covers issue types, templates, labels, and conventions. Triggers include "create issue", "open issue", "file a bug", "report bug", "feature request", "update issue", "close issue", "list issues", "triage".
metadata:
  author: agent-stack
  version: "1.0.0"
  category: project-management
  tags: [issues, github, bug-tracking, feature-requests, triage]
  complexity: lightweight
license: MIT
---

# GitHub Issues Skill

This skill covers how to create, update, and manage GitHub issues. It encodes standard issue types, templates, label conventions, and `gh` CLI workflows.

## Repository

Replace `OWNER/REPO` in all commands with the target repository (e.g. `acme/my-project`).

---

## Issue Types & Templates

Four standard issue types, each with a fixed title prefix and label.

| Type | Title prefix | Label | When to use |
|------|-------------|-------|-------------|
| **Bug Report** | `[Bug] ` | `bug` | Unexpected behavior or error in the system |
| **Feature Request** | `[Feature] ` | `enhancement` | New capability or improvement |
| **Investigation** | `[Investigation] ` | `investigation` | Unclear root cause; needs research before scoping |
| **Blank** | (any) | (any) | Use only when none of the above apply |

---

## Issue Templates (Fields)

### Bug Report

Required fields:
- **What happened?** — describe the bug and expected behavior
- **Steps to reproduce** — numbered steps to trigger the bug
- **Environment** — `Local` | `Staging` | `Production`
- **Affected area** — e.g. `Frontend` | `Backend` | `Infrastructure` | `Other`

Optional fields:
- **Error output / logs** — stack traces, console output
- **Related PRs** — e.g. `#36, #29`
- **Related Issues** — e.g. `#12, #8`
- **External references** — Sentry, Jira, Notion URL

### Feature Request

Required fields:
- **Problem / motivation** — what problem it solves and who is affected
- **Proposed solution** — specific behavior, UI description, data requirements
- **Affected area** — e.g. `Frontend only` | `Backend only` | `Frontend + Backend` | `Infrastructure`
- **Acceptance criteria** — checklist of conditions that define "done"

Optional fields:
- **Related PRs**
- **Related Issues**
- **External references** — Figma, Notion, Jira URL

### Investigation

Required fields:
- **What was observed?** — unexpected behavior or uncertainty that triggered this
- **Investigation goal** — specific questions this investigation must answer
- **Affected area** — e.g. `Frontend` | `Backend` | `Infrastructure` | `Database` | `Unknown`
- **Environment where observed** — `Local` | `Staging` | `Production` | `All environments`

Optional fields:
- **Evidence / context** — logs, metrics, reproduction steps
- **Current hypothesis** — theory about root cause
- **Related Issues**
- **External references** — runbook, Sentry, CloudWatch

---

## Creating Issues

### Bug Report

```bash
gh issue create \
  --repo OWNER/REPO \
  --title "[Bug] <short description>" \
  --label "bug" \
  --body "$(cat <<'EOF'
## What happened?

<describe the bug and what was expected>

## Steps to reproduce

1. <step 1>
2. <step 2>
3. <step 3>

## Environment

<Local | Staging | Production>

## Affected area

<Frontend | Backend | Infrastructure | Other>

## Error output / logs

```
<paste stack trace or console output if available>
```

## Related PRs

<#number or N/A>

## Related Issues

<#number or N/A>

## External references

<URL or N/A>
EOF
)"
```

### Feature Request

```bash
gh issue create \
  --repo OWNER/REPO \
  --title "[Feature] <short description>" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Problem / motivation

<what problem does this solve? who is affected?>

## Proposed solution

<specific behavior, UI details, data requirements>

## Affected area

<Frontend only | Backend only | Frontend + Backend | Infrastructure>

## Acceptance criteria

- [ ] <condition 1>
- [ ] <condition 2>
- [ ] <condition 3>

## Related PRs

<#number or N/A>

## Related Issues

<#number or N/A>

## External references

<URL or N/A>
EOF
)"
```

### Investigation

```bash
gh issue create \
  --repo OWNER/REPO \
  --title "[Investigation] <short description>" \
  --label "investigation" \
  --body "$(cat <<'EOF'
## What was observed?

<unexpected behavior or area of uncertainty>

## Investigation goal

- <specific question 1>
- <specific question 2>

## Affected area

<Frontend | Backend | Infrastructure | Database | Unknown>

## Environment where observed

<Local | Staging | Production | All environments>

## Evidence / context

```
<logs, metrics, or reproduction steps>
```

## Current hypothesis

<theory about root cause, or N/A>

## Related Issues

<#number or N/A>

## External references

<URL or N/A>
EOF
)"
```

---

## Viewing Issues

```bash
# List open issues
gh issue list --repo OWNER/REPO

# Filter by label
gh issue list --repo OWNER/REPO --label bug
gh issue list --repo OWNER/REPO --label enhancement
gh issue list --repo OWNER/REPO --label investigation

# List all states (open + closed)
gh issue list --repo OWNER/REPO --state all

# View a specific issue
gh issue view 42 --repo OWNER/REPO

# View with comments
gh issue view 42 --repo OWNER/REPO --comments
```

---

## Updating Issues

```bash
# Add a comment
gh issue comment 42 --repo OWNER/REPO --body "Update: root cause identified — see #55."

# Add a label
gh issue edit 42 --repo OWNER/REPO --add-label "priority:high"

# Remove a label
gh issue edit 42 --repo OWNER/REPO --remove-label "investigation"

# Change the title
gh issue edit 42 --repo OWNER/REPO --title "[Bug] Corrected title"

# Change the body (full replacement)
gh issue edit 42 --repo OWNER/REPO --body "Updated description..."

# Assign to someone
gh issue edit 42 --repo OWNER/REPO --add-assignee "@me"

# Close an issue
gh issue close 42 --repo OWNER/REPO

# Reopen an issue
gh issue reopen 42 --repo OWNER/REPO
```

---

## Searching Issues

```bash
# Search open bugs
gh search issues --repo OWNER/REPO "label:bug is:open"

# Search by keyword
gh search issues --repo OWNER/REPO "login error is:open"

# Issues assigned to me
gh issue list --repo OWNER/REPO --assignee "@me"

# JSON output for processing
gh issue list --repo OWNER/REPO --json number,title,labels,state
```

---

## Label Conventions

| Label | Used for |
|-------|---------|
| `bug` | Bug reports |
| `enhancement` | Feature requests |
| `investigation` | Investigation issues |
| `priority:high` | High-priority items |
| `priority:low` | Low-priority items |

---

## Title Conventions

- **Always** start with the correct prefix: `[Bug] `, `[Feature] `, `[Investigation] `
- Keep the title concise and specific (≤ 72 characters after the prefix)
- Use sentence case, not title case
- Good: `[Bug] Login page blank after form submit`
- Bad: `[Bug] It doesn't work`

---

## Body Conventions

- Use the section headings from the templates above — do not omit required sections
- For optional fields with no value, write `N/A` rather than leaving blank
- Acceptance criteria **must** use GitHub task list syntax (`- [ ]`)
- Steps to reproduce **must** be numbered
- Logs/stack traces **must** use fenced code blocks

---

## Linking Issues to Pull Requests

When creating a PR that resolves an issue, use closing keywords in the PR body so GitHub auto-closes the issue on merge:

```
Closes #42
Fixes #42
Resolves #42
```

---

## Quick Reference

```bash
# Create bug
gh issue create --repo OWNER/REPO --title "[Bug] ..." --label bug --body "..."

# Create feature
gh issue create --repo OWNER/REPO --title "[Feature] ..." --label enhancement --body "..."

# Create investigation
gh issue create --repo OWNER/REPO --title "[Investigation] ..." --label investigation --body "..."

# View issue
gh issue view NUMBER --repo OWNER/REPO

# Comment
gh issue comment NUMBER --repo OWNER/REPO --body "..."

# Edit labels
gh issue edit NUMBER --repo OWNER/REPO --add-label LABEL

# Close
gh issue close NUMBER --repo OWNER/REPO
```
