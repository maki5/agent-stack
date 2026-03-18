---
name: git-workflow
description: Git branching conventions, commit message formats, and release management for SmartGarage
license: MIT
compatibility: opencode
metadata:
  audience: all-developers
  category: workflow
---

# Git Workflow Skill

## What I Do

I help you follow SmartGarage's git conventions:

- Create properly named branches
- Write conventional commit messages
- Prepare releases with changelogs
- Navigate PR workflows

## When to Use Me

Use this skill when:

- Starting a new feature/fix
- Writing commit messages
- Preparing a release
- Setting up a new repository

## Branch Naming

### Patterns

| Type        | Pattern                        | Example                      |
| ----------- | ------------------------------ | ---------------------------- |
| Feature     | `feature/<short-description>`  | `feature/ratings-reviews`    |
| Bugfix      | `fix/<short-description>`      | `fix/offer-payload-mismatch` |
| Refactor    | `refactor/<short-description>` | `refactor/consolidate-types` |
| Chore/Infra | `chore/<short-description>`    | `chore/update-dependencies`  |

### Creating a Branch

```bash
# 1. Start from dev (not main)
git checkout dev && git pull origin dev

# 2. Create branch with proper naming
git checkout -b feature/<short-description>

# 3. Push to origin
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
- **chore**: Maintenance tasks (deps, config)
- **test**: Adding/updating tests
- **docs**: Documentation changes

### Scopes

> **CRITICAL: Only these scopes are accepted by CI. Any other scope will fail the PR title check.**

| Scope | Use for |
|-------|---------|
| `backend` | Go backend code |
| `frontend` | Next.js/React code |
| `api` | API contracts/endpoints |
| `db` | Database/migrations |
| `ci` | CI/CD pipeline configs, GitHub Actions workflows, PR automation |
| `infra` | Terraform and infrastructure changes |
| `e2e` | E2E tests |

> **Scope distinction:** Use `infra` for Terraform and infrastructure changes (e.g. `feat(infra): add Lambda function`). Use `ci` for CI/CD pipeline configs, GitHub Actions workflows, and PR automation (e.g. `feat(ci): add staging deploy job`).

### Examples

```
feat(backend): add ratings repository and service

fix(frontend): correct offer card selector on user page
refactor(e2e): extract shared workflow helpers
chore: update Go dependencies to v1.26
test(backend): add handler tests for ratings endpoint
docs(api): update swagger annotations for workshops
```

### Rules

1. **Subject line**: Maximum 72 characters (hard limit to avoid git hook warnings)
   - Count characters: `echo "feat(backend): message" | wc -c`
   - If >72 chars, shorten or split into body
2. **Imperative mood**: "add" not "added"
3. **Keep it concise**: No investigation reports in commits
4. **No period at end**: Not a sentence
5. **Reference issues**: `Fixes #123` in footer if applicable

## Release Management

### Preparing a Release

```bash
# 1. Ensure dev is up to date
git checkout dev && git pull origin dev

# 2. Create release branch (optional for hotfixes)
git checkout -b release/v1.2.0

# 3. Update version files if needed
# - backend/internal/version/version.go
# - web-frontend/package.json

# 4. Run full validation
make validate

# 5. Commit version bump
version bump
git commit -m "chore: bump version to v1.2.0"

# 6. Create tag
git tag -a v1.2.0 -m "Release v1.2.0"

# 7. Push tag
git push origin v1.2.0

# 8. Create GitHub release (CI will deploy)
gh release create v1.2.0 --generate-notes
```

### Changelog Generation

Use conventional commits to auto-generate changelogs:

```bash
# View changes since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Group by type
feat: git log ... --grep="^feat"
fix: git log ... --grep="^fix"
```

## PR Workflow

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
- Added ratings repository
- Added ratings service
- Added ratings handler

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
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

## Safety Rules

1. **Never commit directly to main** — always use a branch
2. **One branch per task** — don't mix unrelated changes
3. **Keep branches short-lived** — merge and delete after completion
4. **Always run `make validate` before pushing**
5. **Never force-push to main**

## Troubleshooting

### Wrong branch name

```bash
# Rename branch locally and remotely
git branch -m old-name new-name
git push origin --delete old-name
git push origin -u new-name
```

### Forgot to branch from dev

```bash
# If you have uncommitted changes on dev
git stash
git checkout dev
git pull origin dev
git checkout -b feature/my-feature
git stash pop
```

### Commit message too long

```bash
# Amend last commit message
git commit --amend -m "new message"
git push --force-with-lease  # If already pushed
```

## Quick Reference

```bash
# Create feature branch
git checkout dev && git pull origin dev && git checkout -b feature/name

# Commit with conventional format
git commit -m "feat(backend): add feature"

# Push and create PR
git push -u origin feature/name && gh pr create --fill

# View recent commits
git log --oneline -10
```
