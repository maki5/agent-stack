# agent-stack

Scaffolds a multi-agent [OpenCode](https://opencode.ai) workflow into any project. Run one command, answer a few questions, and your project gets a fully wired `.opencode/` directory with coordinator agents, developer agents, skills, and instruction files — all tuned to your tech stack.

## Prerequisites

- [Bun](https://bun.sh) — used to run the CLI
- [OpenCode](https://opencode.ai) — the AI coding tool that runs the agents

## Setup in a new project

Navigate to your project root and run:

```bash
cd my-project
bunx agent-stack init
```

The wizard asks a series of questions:

| Section | Questions |
|---------|-----------|
| **Project basics** | Name, description, languages, frameworks |
| **Components** | Has backend? Has frontend? Mobile? Infrastructure? Database? |
| **Implementation agents** | Which tech variant to use per component (e.g. Go, Next.js, AWS+Terraform) |
| **Tooling** | Unit test command, E2E tool, CI platform |
| **Models** | Provider, complex model (for reasoning), fast model (for formatting/testing) |
| **Git** | Default branch name |
| **Extra skills** | Optional skills from [skills.sh](https://skills.sh) |

When done, the following is written into your project:

```
my-project/
├── .opencode/
│   ├── opencode.json          ← agent config + project profile
│   ├── agents/
│   │   ├── core/              ← 14 core agents (always included)
│   │   └── impl/              ← tech-specific developer agents (only selected ones)
│   └── skills/                ← bundled skills (14 core + tech-specific extras)
├── AGENTS.md                  ← agent workflow overview for this project
└── .github/
    └── instructions/          ← OpenCode instruction files (git, testing, etc.)
```

## Agents

### Coordinator agents (primary — call from OpenCode)

| Agent | How to invoke | Purpose |
|-------|--------------|---------|
| `implementer` | `/implementer` | Full feature implementation workflow |
| `debugger` | `/debugger` | Bug diagnosis and fix workflow |
| `issue-manager` | `/issue-manager` | Create and manage GitHub issues |

### Core subagents (called automatically by coordinators)

`researcher` → `ui-designer` → `designer` → `planner` → `plan-reviewer` → `coder` → `tester` → `reviewer` → `cleaner` → `formatter` → `commiter`

### Implementation agents (tech-specific)

Selected during `init` based on your stack:

| Tech | Agent | Default skills |
|------|-------|---------------|
| Go | `backend-developer` | `go-backend-patterns`, `go-backend-microservices`, `golang-testing` |
| Node.js | `backend-developer` | — |
| Python | `backend-developer` | — |
| Next.js | `frontend-developer` | `nextjs-app-router`, `next-best-practices` |
| Vue / Nuxt | `frontend-developer` | — |
| React Native (web) | `frontend-developer` | — |
| Kotlin Android | `frontend-developer` | — |
| Swift iOS | `frontend-developer` | — |
| React Native (mobile) | `frontend-developer` | — |
| AWS + Terraform | `infra-developer` | `terraform-best-practices`, `terraform-specialist`, `aws-lambda` |
| GCP + Terraform | `infra-developer` | `terraform-best-practices`, `terraform-specialist` |
| Kubernetes + Helm | `infra-developer` | — |

## Skills

Skills are markdown documents agents load at runtime via `skill("name")` to gain domain knowledge without bloating their base prompts.

### Always-installed core skills

| Skill | Purpose |
|-------|---------|
| `git-workflow` | Branch naming, commit conventions, PR workflow |
| `code-review` | Code review checklists and standards |
| `self-healing` | Error recovery and retry patterns |
| `three-layer-testing` | Unit / integration / E2E testing strategy |
| `output-discipline` | Consistent, concise agent output formatting |
| `find-skills` | How to discover and load skills at runtime |
| `mermaid-diagrams` | Mermaid syntax reference for all diagram types |
| `architecture-patterns` | Common software architecture patterns |
| `implement-design` | Translating design docs into implementation plans |
| `ui-ux-pro-max` | UX/UI best practices for frontend agents |
| `web-design-guidelines` | Web design principles and conventions |
| `research` | Structured research and caching patterns |
| `github-issues` | GitHub issue templates, labels, and `gh` CLI workflows |
| `github-workflow` | Full `gh` CLI reference for issues, PRs, and Actions |

### Tech-specific skills

Installed automatically when the matching implementation agent is selected (see table above). Additional skills can be installed from [skills.sh](https://skills.sh) during `init` or added manually to `.opencode/skills/`.

## Using OpenCode after setup

Open your project in OpenCode, then switch to a coordinator:

```
/implementer   ← implement a feature
/debugger      ← diagnose a bug
/issue-manager ← manage GitHub issues
```

The coordinator reads `.opencode/opencode.json` to understand your project's tech stack and routes work to the right subagents automatically.

## Development

Clone and run locally:

```bash
git clone https://github.com/maki5/agent-stack
cd agent-stack
bun install
bun run start         # run the CLI
bun run dev           # run with file watching
```

To test against a sample project:

```bash
mkdir /tmp/test-project
bun run start init --dir /tmp/test-project
```
