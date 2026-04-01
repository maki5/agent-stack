---
name: skills-creator
description: Teaches the setup agent how to write well-structured SKILL.md files with correct YAML frontmatter, clear when-to-use guidance, and actionable workflow sections.
---

# Skills Creator

This skill teaches you how to write `SKILL.md` files for the agent-stack skills system. Follow every rule here when generating new skills for developer agents or when no existing skill covers a required domain.

## What is a Skill?

A skill is a Markdown file that an agent loads at runtime via `skill("<name>")`. It provides domain-specific knowledge, patterns, and workflows that extend the agent's behaviour for a particular technology or task type.

Skills are:
- **Loaded on demand** — agents load them as needed, not all at once
- **Self-contained** — each skill covers one domain completely
- **Tech-specific** — this is where hardcoded technology knowledge lives (unlike agent files, which must be generic)
- **Read by the AI model** — write clearly; use concrete examples and explicit patterns

## File Location and Naming

```
.opencode/skills/<skill-name>/SKILL.md
```

The directory name is the skill ID used in `skill("<name>")` calls.

Examples:
- `skill("go-backend-patterns")` → `.opencode/skills/go-backend-patterns/SKILL.md`
- `skill("react-frontend-patterns")` → `.opencode/skills/react-frontend-patterns/SKILL.md`
- `skill("kotlin-android-patterns")` → `.opencode/skills/kotlin-android-patterns/SKILL.md`

## Required YAML Frontmatter

Every SKILL.md MUST start with YAML frontmatter:

```yaml
---
name: <skill-id>
description: <one sentence: what this skill provides and when to use it>
---
```

### Frontmatter rules

| Field | Rules |
|-------|-------|
| `name` | Must match the directory name exactly |
| `description` | One sentence, max 25 words. Start with a verb (e.g. "Provides...", "Teaches...", "Guides...") |

## Required Sections

Every skill file must contain these sections:

1. **H1 title** — matches the skill name
2. **When to Use This Skill** — explicit list of situations that trigger loading
3. **Core Patterns** — the actual knowledge (tech-specific patterns, idioms, examples)
4. **Common Mistakes** — anti-patterns to avoid

Optional sections (include when relevant):
- **Commands Reference** — shell commands used in this domain
- **File Patterns** — file naming conventions and directory structure
- **Testing Patterns** — how to test code in this domain
- **Security Considerations** — security patterns relevant to this domain

## When to Use This Skill section

This section must be explicit and actionable. List concrete situations:

```markdown
## When to Use This Skill

Load this skill when:
- Implementing or modifying <layer> code in this project
- Writing tests for <layer> components
- Debugging <layer> errors
- Reviewing <layer> code changes
```

Bad example (too vague):
```markdown
## When to Use This Skill

Use this skill for backend development.
```

## Core Patterns section

This is the main body of the skill. Include:

1. **Idiomatic code patterns** with short, concrete examples
2. **Architectural conventions** specific to the tech stack
3. **Error handling patterns** for the tech stack
4. **Naming conventions** (files, functions, variables, types)

Example structure for a backend skill:

```markdown
## Core Patterns

### Project Structure
\```
src/
  handlers/     ← HTTP handlers, thin — call services only
  services/     ← business logic
  models/       ← data types / entities
  db/           ← database access layer
\```

### Handler Pattern
\```<lang>
// Handler is thin — validate input, call service, return response
func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }
    user, err := userService.Create(r.Context(), req)
    if err != nil {
        handleError(w, err)
        return
    }
    respond(w, http.StatusCreated, user)
}
\```

### Service Pattern
\```<lang>
// Service contains business logic — no HTTP concerns
func (s *UserService) Create(ctx context.Context, req CreateUserRequest) (*User, error) {
    if err := req.Validate(); err != nil {
        return nil, fmt.Errorf("validation: %w", err)
    }
    return s.repo.Insert(ctx, req.ToModel())
}
\```
```

## Tech-Specific Commands

If the skill covers a tech stack with specific commands, include them explicitly:

```markdown
## Commands Reference

All commands come from `profile.commands` in `.opencode/opencode.json`. The typical values for this stack are:

| Profile key | Typical value for this stack |
|-------------|------------------------------|
| `commands.build` | `go build ./...` |
| `commands.test` | `go test ./...` |
| `commands.lint` | `golangci-lint run` |
| `commands.format` | `gofmt -w .` |
| `commands.typecheck` | _(not applicable for Go)_ |
```

> Always note that actual values come from the profile — these are just typical examples for the stack.

## Common Mistakes section

Every skill should end with common mistakes relevant to the domain:

```markdown
## Common Mistakes

1. **<mistake>** — <why it's wrong and what to do instead>
2. **<mistake>** — <why it's wrong and what to do instead>
```

## Skill Granularity

- One skill per tech domain (e.g. `go-backend-patterns`, not `go-patterns` mixing frontend and backend)
- Avoid skills that are too broad (e.g. `all-patterns`) or too narrow (e.g. `go-http-handler-naming`)
- A skill should be completable in one read — keep it focused, typically 100–400 lines

## Example Minimal Skill

```markdown
---
name: fastapi-backend-patterns
description: Provides FastAPI architectural patterns, routing conventions, dependency injection, and Pydantic model usage for backend development.
---

# FastAPI Backend Patterns

## When to Use This Skill

Load this skill when:
- Implementing or modifying FastAPI route handlers
- Writing Pydantic models for request/response schemas
- Adding dependency injection with `Depends()`
- Writing async database access with SQLAlchemy

## Core Patterns

### Project Structure
\```
app/
  routers/      ← APIRouter modules, one per domain
  services/     ← business logic, no HTTP
  models/       ← SQLAlchemy ORM models
  schemas/      ← Pydantic request/response schemas
  deps.py       ← shared FastAPI Depends() factories
\```

### Router Pattern
\```python
router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    user = await service.create(db, payload)
    return UserResponse.model_validate(user)
\```

### Service Pattern
\```python
class UserService:
    async def create(self, db: AsyncSession, payload: CreateUserRequest) -> User:
        user = User(**payload.model_dump())
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
\```

## Common Mistakes

1. **Business logic in routers** — Routers are thin; all logic belongs in services.
2. **Using `dict()` instead of `model_dump()`** — Pydantic v2 uses `model_dump()`.
3. **Sync DB calls in async routes** — Always use `await` with async SQLAlchemy sessions.
```
