---
name: git-workflow
description: Universal git branching conventions, commit message formats, and PR workflow for any project
license: MIT
compatibility: opencode
metadata:
  audience: all-developers
  category: workflow
---

# Git Workflow Skill

## What I Do

I help you follow git conventions consistently across any project:

- Create properly named branches
- Write conventional commit messages
- Navigate PR workflows
- Prepare releases with changelogs

## When to Use Me

Use this skill when:

- Starting a new feature/fix
- Writing commit messages
- Creating pull requests
- Preparing a release

## Branch Naming

### Patterns

| Type        | Pattern                        | Example                      |
| ----------- | ------------------------------ | ---------------------------- |
| Feature     | `feature/<short-description>`  | `feature/user-ratings`       |
| Bugfix      | `fix/<short-description>`      | `fix/date-validation`        |
| Refactor    | `refactor/<short-description>` | `refactor/consolidate-types` |
| Chore/Infra | `chore/<short-description>`    | `chore/update-dependencies`  |
| Hotfix      | `hotfix/<short-description>`   | `hotfix/auth-bypass`         |

### Creating a Branch

```bash
# 1. Read profile.default_branch from .opencode/opencode.json
# 2. Start from the default branch
git checkout <default_branch> && git pull origin <default_branch>

# 3. Create branch with proper naming
git checkout -b feature/<short-description>

# 4. Push to origin
git push -u origin feature/<short-description>
```

## Commit Messages

### Conventional Commits Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code restructuring (no behavior change)
- **chore**: Maintenance tasks (deps, config) — no scope: `chore: <subject>`
- **test**: Adding/updating tests
- **docs**: Documentation changes

### Scopes

Use the project's actual layer names as scopes. Read the project's commit history to identify the conventions in use. Common examples:

| Scope | Use for |
|-------|---------|
| `backend` | Server-side / API code |
| `frontend` | Web client code |
| `mobile` | Mobile app code |
| `api` | API contracts/endpoints |
| `db` | Database/migrations |
| `infra` | Infrastructure changes |
| `ci` | CI/CD pipeline configs |
| `e2e` | End-to-end tests |

> **Note:** Adapt scope names to the project. Check `.opencode/opencode.json` `profile` and existing commits to see what scopes are established.

### Examples

```
feat(backend): add user ratings endpoint

fix(frontend): correct date picker timezone handling

refactor(mobile): extract shared navigation helpers

chore: update dependencies

test(backend): add handler tests for ratings endpoint

docs(api): update OpenAPI annotations
```

### Rules

1. **Subject line**: Maximum 72 characters (hard limit)
2. **Imperative mood**: "add" not "added"
3. **Keep it concise**: No investigation reports in commits
4. **No period at end**: Not a sentence
5. **Reference issues**: `Fixes #123` in footer if applicable

## Atomic Commits

An atomic commit contains **one logical change** — it can be understood, reviewed, and reverted in isolation without breaking anything else.

### What belongs in one commit

| Situation | Rule |
|-----------|------|
| New feature touches backend + tests | One commit — the feature and its tests are inseparable |
| Bug fix + unrelated cleanup spotted nearby | Two commits — fix first, cleanup separately |
| Schema migration + model update | One commit — they must stay in sync |
| Refactor + new feature | Two commits — never mix behavior change with refactor |
| Formatter/linter auto-fixes | Separate commit — `chore: format` or `style: lint fixes` |
| Dependency update | Separate commit — `chore: update dependencies` |
| Multiple unrelated features | One commit per feature — never bundle |

### The single-responsibility test

Before committing, ask: **"Can I describe this change in one conventional commit subject line without using 'and'?"**

- "add user ratings endpoint" → atomic
- "add user ratings endpoint and fix date picker bug" → not atomic — split it

### How to split work into commits mid-feature

A feature implementation typically produces commits in this order:

```
feat(db): add ratings migration and model
feat(backend): add ratings service and handler
test(backend): add ratings unit tests
feat(frontend): add ratings UI component
test(frontend): add ratings component tests
chore: format and lint fixes
```

Each commit builds on the previous but is independently understandable.

### When a single commit is correct for a whole feature

If the feature is small enough that all changes (backend + frontend + tests) fit naturally in one subject line and reviewing them together makes more sense than apart, one commit is fine:

```
feat(api): add health check endpoint
```

Use judgment — the goal is reviewability, not commit count.

### Never do this

- Commit partially broken code — every commit must leave the project in a working state
- Bundle a fix with unrelated cleanup to keep the count low
- Leave formatter changes mixed into feature commits — they obscure the real diff

### Creating a PR

```bash
# 1. Push branch
git push -u origin feature/my-feature

# 2. Create PR with gh CLI
gh pr create \
  --title "feat(backend): add ratings feature" \
  --body "## Summary
Brief description of changes

## Changes
- <list of changes>

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing done

## Related
Closes #123"
```

### PR Best Practices

- Use same format as commits for PR title
- Fill out PR template completely
- Link related issues with `Closes #123`
- Keep PRs focused (one feature/fix per PR)
- Request review from code owners

## Release Management

### Preparing a Release

```bash
# 1. Ensure default branch is up to date
git checkout <default_branch> && git pull origin <default_branch>

# 2. Create release branch (optional for hotfixes)
git checkout -b release/v1.2.0

# 3. Update version files as required by the project

# 4. Commit version bump
git commit -m "chore: bump version to v1.2.0"

# 5. Create tag
git tag -a v1.2.0 -m "Release v1.2.0"

# 6. Push tag
git push origin v1.2.0

# 7. Create GitHub release
gh release create v1.2.0 --generate-notes
```

### Changelog Generation

```bash
# View changes since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Group by type
git log ... --grep="^feat"
git log ... --grep="^fix"
```

## Safety Rules

1. **Never commit directly to the default branch** — always use a branch
2. **One branch per task** — don't mix unrelated changes
3. **Keep branches short-lived** — merge and delete after completion
4. **Run validation before pushing** — use `profile.commands` to find the right command
5. **Never force-push to the default branch**

## Troubleshooting

### Wrong branch name

```bash
# Rename branch locally and remotely
git branch -m old-name new-name
git push origin --delete old-name
git push origin -u new-name
```

### Forgot to branch from default branch

```bash
# If you have uncommitted changes on default branch
git stash
git checkout <default_branch>
git pull origin <default_branch>
git checkout -b feature/my-feature
git stash pop
```

### Commit message too long

```bash
# Amend last commit message (only if not yet pushed)
git commit --amend -m "shorter message"
```

## Quick Reference

```bash
# Create feature branch
git checkout <default_branch> && git pull origin <default_branch> && git checkout -b feature/name

# Commit with conventional format
git commit -m "feat(scope): add feature"

# Push and create PR
git push -u origin feature/name && gh pr create --fill

# View recent commits
git log --oneline -10
```
