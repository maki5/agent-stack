/**
 * Wizard — interactive Q&A that collects all information needed to generate
 * the project's .opencode/ setup.
 *
 * Uses the `prompts` library for terminal I/O.
 */

import prompts from "prompts";
import kleur from "kleur";
import type { WizardAnswers } from "./types.ts";
import { IMPL_AGENT_MAP } from "./registry.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function banner() {
  console.log(
    kleur.cyan().bold(`
╔═══════════════════════════════════════╗
║         agent-stack  init             ║
║  OpenCode agent setup for any stack   ║
╚═══════════════════════════════════════╝
`)
  );
  console.log(
    kleur.gray("Answer the questions below to generate your .opencode/ setup.\n")
  );
}

function section(title: string) {
  console.log("\n" + kleur.yellow().bold(`── ${title} ──`));
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export async function runWizard(): Promise<WizardAnswers> {
  banner();

  // ── Project basics ─────────────────────────────────────────────────────────
  section("Project basics");
  const basics = await prompts(
    [
      {
        type: "text",
        name: "project_name",
        message: "Project name?",
        validate: (v: string) => v.trim().length > 0 || "Required",
      },
      {
        type: "text",
        name: "description",
        message: "Short description (optional)?",
        initial: "",
      },
      {
        type: "text",
        name: "languages",
        message:
          "Primary programming language(s)? (comma-separated, e.g. Go, TypeScript)",
        validate: (v: string) => v.trim().length > 0 || "Required",
      },
      {
        type: "text",
        name: "frameworks",
        message:
          "Frameworks / platforms? (comma-separated, e.g. Gin, Next.js, Terraform)",
        initial: "",
      },
    ],
    { onCancel }
  );

  // ── Project components ─────────────────────────────────────────────────────
  section("Project components");
  const components = await prompts(
    [
      {
        type: "confirm",
        name: "has_backend",
        message: "Does the project have a backend API?",
        initial: true,
      },
      {
        type: "confirm",
        name: "has_frontend",
        message: "Does the project have a frontend / UI?",
        initial: true,
      },
      {
        type: (prev: boolean) => (prev ? "confirm" : null),
        name: "is_mobile",
        message: "Is the frontend a mobile app?",
        initial: false,
      },
      {
        type: "confirm",
        name: "has_infra",
        message: "Does the project have cloud infrastructure to manage (Terraform, Helm, etc.)?",
        initial: false,
      },
      {
        type: "confirm",
        name: "has_database",
        message: "Does the project use a relational/document database?",
        initial: true,
      },
    ],
    { onCancel }
  );

  // ── Impl agent selection ───────────────────────────────────────────────────
  section("Implementation agents");
  console.log(
    kleur.gray(
      "Select the agent variant that matches your tech stack.\n" +
        "These determine which developer agents will be used.\n"
    )
  );

  const implAgents: { backend_tech: string | null; frontend_tech: string | null; infra_tech: string | null } = {
    backend_tech: null,
    frontend_tech: null,
    infra_tech: null,
  };

  if (components.has_backend) {
    const backendChoices = buildChoices("backend");
    const { backend_tech } = await prompts(
      {
        type: "select",
        name: "backend_tech",
        message: "Backend agent variant?",
        choices: backendChoices,
      },
      { onCancel }
    );
    implAgents.backend_tech = backend_tech;
  }

  if (components.has_frontend) {
    const category = components.is_mobile ? "mobile" : "frontend";
    const frontendChoices = buildChoices(category);
    const { frontend_tech } = await prompts(
      {
        type: "select",
        name: "frontend_tech",
        message: components.is_mobile
          ? "Mobile agent variant?"
          : "Frontend agent variant?",
        choices: frontendChoices,
      },
      { onCancel }
    );
    implAgents.frontend_tech = frontend_tech;
  }

  if (components.has_infra) {
    const infraChoices = buildChoices("infra");
    const { infra_tech } = await prompts(
      {
        type: "select",
        name: "infra_tech",
        message: "Infrastructure agent variant?",
        choices: infraChoices,
      },
      { onCancel }
    );
    implAgents.infra_tech = infra_tech;
  }

  // ── Tooling ────────────────────────────────────────────────────────────────
  section("Tooling");
  const tooling = await prompts(
    [
      {
        type: "text",
        name: "unit_test_cmd",
        message: "Unit test command? (e.g. make test, npm test, ./gradlew test)",
        initial: "make test",
      },
      {
        type: "text",
        name: "e2e_tool",
        message: "E2E test tool? (e.g. Playwright, Espresso, Detox — or 'none')",
        initial: "none",
      },
      {
        type: "text",
        name: "ci_platform",
        message: "CI/CD platform? (e.g. GitHub Actions, GitLab CI, CircleCI)",
        initial: "GitHub Actions",
      },
    ],
    { onCancel }
  );

  // ── Model configuration ────────────────────────────────────────────────────
  section("Model configuration");
  const models = await prompts(
    [
      {
        type: "text",
        name: "model_provider",
        message: "Model provider? (e.g. github-copilot, anthropic, openai)",
        initial: "github-copilot",
      },
      {
        type: "text",
        name: "model_complex",
        message: "Model for complex agents (researcher, designer, planner)?",
        initial: "github-copilot/claude-sonnet-4.6",
      },
      {
        type: "text",
        name: "model_fast",
        message: "Model for fast agents (tester, cleaner, formatter)?",
        initial: "github-copilot/claude-haiku-4.5",
      },
    ],
    { onCancel }
  );

  // ── Git ────────────────────────────────────────────────────────────────────
  section("Git");
  const git = await prompts(
    {
      type: "text",
      name: "default_branch",
      message: "Default branch name?",
      initial: "main",
    },
    { onCancel }
  );

  // ── Extra skills from skills.sh ────────────────────────────────────────────
  section("Extra skills (optional)");
  console.log(
    kleur.gray(
      "You can install additional skills from skills.sh (https://skills.sh).\n" +
        "Enter owner/repo references separated by commas, or leave blank.\n" +
        "Example: expo/skills/building-native-ui, vercel-labs/next-skills/next-cache-components\n"
    )
  );
  const { extra_skills_raw } = await prompts(
    {
      type: "text",
      name: "extra_skills_raw",
      message: "Extra skills to install from skills.sh?",
      initial: "",
    },
    { onCancel }
  );

  const extra_skills = (extra_skills_raw as string)
    .split(",")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  // ── Assemble ───────────────────────────────────────────────────────────────
  return {
    project_name: basics.project_name,
    description: basics.description || "",
    languages: basics.languages,
    frameworks: basics.frameworks || "",
    has_backend: components.has_backend ?? false,
    has_frontend: components.has_frontend ?? false,
    is_mobile: components.is_mobile ?? false,
    has_infra: components.has_infra ?? false,
    has_database: components.has_database ?? false,
    backend_tech: implAgents.backend_tech,
    frontend_tech: implAgents.frontend_tech,
    infra_tech: implAgents.infra_tech,
    unit_test_cmd: tooling.unit_test_cmd,
    e2e_tool: tooling.e2e_tool === "none" ? null : tooling.e2e_tool,
    ci_platform: tooling.ci_platform,
    model_provider: models.model_provider,
    model_complex: models.model_complex,
    model_fast: models.model_fast,
    default_branch: git.default_branch,
    extra_skills,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function onCancel() {
  console.log(kleur.red("\nSetup cancelled."));
  process.exit(1);
}

function buildChoices(category: "backend" | "frontend" | "mobile" | "infra") {
  const entries = Object.entries(IMPL_AGENT_MAP).filter(
    ([, v]) => v.category === category
  );
  const choices = entries.map(([key, v]) => ({
    title: v.label,
    description: v.description,
    value: key,
  }));
  choices.push({
    title: "Other / custom",
    description: "I'll configure the agent manually after setup",
    value: "__custom__",
  });
  return choices;
}
