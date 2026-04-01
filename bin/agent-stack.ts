#!/usr/bin/env bun
/**
 * agent-stack CLI entrypoint.
 *
 * Usage:
 *   bunx agent-stack init             — copy universal files into .opencode/ in cwd
 *   bunx agent-stack init --dir <p>   — generate into a specific directory
 *   bunx agent-stack setup            — interactive wizard: detect project, prompt user,
 *                                       write .opencode/profile.json + update opencode.json
 *   bunx agent-stack setup --dir <p>  — run wizard for a specific directory
 *   bunx agent-stack --version        — print version
 *   bunx agent-stack --help           — print help
 */

import kleur from "kleur";
import { generate } from "../src/generator.ts";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

// ─── Version ──────────────────────────────────────────────────────────────────

import pkg from "../package.json";
const VERSION: string = pkg.version;

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  command: string | null;
  targetDir: string;
  showHelp: boolean;
  showVersion: boolean;
} {
  const args = argv.slice(2);
  let command: string | null = null;
  let targetDir = process.cwd();
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") {
      showHelp = true;
    } else if (a === "--version" || a === "-v") {
      showVersion = true;
    } else if ((a === "--dir" || a === "-d") && args[i + 1]) {
      targetDir = args[++i];
    } else if (!a.startsWith("-")) {
      command = a;
    }
  }

  return { command, targetDir, showHelp, showVersion };
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${kleur.cyan().bold("agent-stack")} v${VERSION}
OpenCode multi-agent workflow setup for any tech stack.

${kleur.yellow("USAGE")}
  bunx agent-stack <command> [options]

${kleur.yellow("COMMANDS")}
  init          Copy universal agents, skills, and config stubs into .opencode/
                in the current directory (or --dir <path>).

  setup         Interactive wizard: detects your project and prompts you to
                confirm each field. Writes .opencode/profile.json and updates
                opencode.json with your model choices. Run this after init,
                before opening OpenCode.

${kleur.yellow("OPTIONS")}
  --dir, -d     Target project directory (default: current directory)
  --version, -v Print version
  --help, -h    Print this help

${kleur.yellow("TYPICAL WORKFLOW")}
  cd my-project
  bunx agent-stack init       # copy agents, skills, config stubs
  bunx agent-stack setup      # fill in profile.json interactively
  opencode                    # open OpenCode — agents are ready
`);
}

// ─── Setup wizard ─────────────────────────────────────────────────────────────

interface Profile {
  project_name: string;
  description: string;
  default_branch: string;
  arch_pattern: string;
  has_backend: boolean;
  has_frontend: boolean;
  has_mobile: boolean;
  has_infra: boolean;
  has_database: boolean;
  platform: string;
  repo: string;
  stacks: Record<string, string>;
  paths: { backend_src: string; frontend_src: string; mobile_src: string };
  commands: { build: string; test: string; lint: string; format: string; typecheck: string; e2e: string };
}

interface AgentModelConfig {
  model: string;
}

function detectProject(dir: string): Partial<Profile> {
  const d: Partial<Profile> = {};

  // Git branch
  const headPath = join(dir, ".git", "HEAD");
  if (existsSync(headPath)) {
    const m = readFileSync(headPath, "utf-8").trim().match(/^ref: refs\/heads\/(.+)$/);
    if (m) d.default_branch = m[1];
  }
  if (!d.default_branch) d.default_branch = "main";

  // package.json
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) d.project_name = pkg.name;
      if (pkg.description) d.description = pkg.description;
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const stacks: Record<string, string> = {};
      if (deps["next"]) stacks.frontend = "Next.js/React";
      else if (deps["nuxt"]) stacks.frontend = "Nuxt/Vue 3";
      else if (deps["@sveltejs/kit"]) stacks.frontend = "SvelteKit";
      else if (deps["react"]) stacks.frontend = "React";
      else if (deps["vue"]) stacks.frontend = "Vue 3";
      if (deps["express"]) stacks.backend = "Node/Express";
      else if (deps["fastify"]) stacks.backend = "Node/Fastify";
      else if (deps["hono"]) stacks.backend = "Node/Hono";
      if (Object.keys(stacks).length) d.stacks = stacks;
      if (stacks.frontend) d.has_frontend = true;
      if (stacks.backend) d.has_backend = true;
      const s = pkg.scripts ?? {};
      d.commands = {
        build: s.build ? "npm run build" : "",
        test: s.test ? "npm test" : "",
        lint: s.lint ? "npm run lint" : "",
        format: s.format ? "npm run format" : "",
        typecheck: s["type-check"] || s.typecheck ? "npm run typecheck" : "",
        e2e: s.e2e ? "npm run e2e" : "",
      };
    } catch {}
  }

  if (!d.project_name) d.project_name = dir.split("/").pop() ?? "";

  if (existsSync(join(dir, "go.mod"))) {
    d.has_backend = true;
    d.stacks = { ...d.stacks, backend: "Go" };
    d.commands = { build: "go build ./...", test: "go test ./...", lint: "golangci-lint run", format: "gofmt -w .", typecheck: "", e2e: "", ...d.commands };
  }
  if (existsSync(join(dir, "requirements.txt")) || existsSync(join(dir, "pyproject.toml"))) {
    d.has_backend = true;
    d.stacks = { ...d.stacks, backend: d.stacks?.backend ?? "Python" };
  }
  if (existsSync(join(dir, "Cargo.toml"))) {
    d.has_backend = true;
    d.stacks = { ...d.stacks, backend: d.stacks?.backend ?? "Rust" };
  }
  if (existsSync(join(dir, "pubspec.yaml"))) {
    d.has_mobile = true;
    d.stacks = { ...d.stacks, mobile: "Flutter/Dart" };
  }
  if (existsSync(join(dir, "android")) || existsSync(join(dir, "ios"))) {
    d.has_mobile = true;
  }
  if (existsSync(join(dir, "docker-compose.yml")) || existsSync(join(dir, "Dockerfile")) || existsSync(join(dir, "terraform"))) {
    d.has_infra = true;
  }
  if (existsSync(join(dir, "migrations")) || existsSync(join(dir, "schema.sql")) || existsSync(join(dir, "prisma"))) {
    d.has_database = true;
  }

  return d;
}

function rl(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(iface: readline.Interface, question: string, def = ""): Promise<string> {
  const prompt = def ? `${question} ${kleur.dim(`[${def}]`)}: ` : `${question}: `;
  return new Promise((res) => iface.question(prompt, (a) => res(a.trim() || def)));
}

function askBool(iface: readline.Interface, question: string, def: boolean): Promise<boolean> {
  const hint = def ? kleur.dim("Y/n") : kleur.dim("y/N");
  return new Promise((res) =>
    iface.question(`${question} (${hint}): `, (a) => {
      const v = a.trim().toLowerCase();
      res(!v ? def : v === "y" || v === "yes");
    })
  );
}

async function runSetup(targetDir: string) {
  const opencodeDir = join(targetDir, ".opencode");
  const profilePath = join(opencodeDir, "profile.json");
  const opencodeJsonPath = join(opencodeDir, "opencode.json");

  if (!existsSync(opencodeDir)) {
    console.error(kleur.red(`\n.opencode/ not found in ${targetDir}. Run 'bunx agent-stack init' first.\n`));
    process.exit(1);
  }

  const d = detectProject(targetDir);
  const iface = rl();

  console.log(`\n${kleur.cyan().bold("agent-stack setup")}\n`);
  console.log(kleur.dim("Detected values shown in brackets. Press Enter to accept, or type to override.\n"));

  // ── Project ──
  console.log(kleur.yellow("Project"));
  const project_name = await ask(iface, "  Name", d.project_name ?? "");
  const default_branch = await ask(iface, "  Default branch", d.default_branch ?? "main");
  const description = await ask(iface, "  One-sentence description", d.description ?? "");
  const arch_pattern = await ask(iface, "  Architecture (monolith/microservices/monorepo/serverless)", "monolith");
  const repo = await ask(iface, "  GitHub repo (OWNER/REPO, optional)", "");

  // ── Layers ──
  console.log(`\n${kleur.yellow("Layers")}`);
  const has_backend = await askBool(iface, "  Backend?", d.has_backend ?? false);
  const has_frontend = await askBool(iface, "  Frontend (web)?", d.has_frontend ?? false);
  const has_mobile = await askBool(iface, "  Mobile?", d.has_mobile ?? false);
  const has_infra = await askBool(iface, "  Infrastructure (IaC)?", d.has_infra ?? false);
  const has_database = await askBool(iface, "  Database?", d.has_database ?? false);

  // ── Tech stacks ──
  console.log(`\n${kleur.yellow("Tech stacks")} ${kleur.dim("(only for active layers)")}`);
  const backend_stack = has_backend ? await ask(iface, "  Backend (e.g. Go/Fiber, Python/FastAPI)", d.stacks?.backend ?? "") : "";
  const frontend_stack = has_frontend ? await ask(iface, "  Frontend (e.g. Next.js/React, Vue 3)", d.stacks?.frontend ?? "") : "";
  const mobile_stack = has_mobile ? await ask(iface, "  Mobile (e.g. Kotlin/Android, Flutter)", d.stacks?.mobile ?? "") : "";
  const infra_stack = has_infra ? await ask(iface, "  Infra (e.g. Terraform/AWS, Pulumi/GCP)", d.stacks?.infra ?? "") : "";
  const database_stack = has_database ? await ask(iface, "  Database (e.g. PostgreSQL, MySQL, MongoDB)", d.stacks?.database ?? "") : "";
  const platform = has_mobile ? await ask(iface, "  Mobile platform (android/ios/cross)", "") : "";

  // ── Source paths ──
  console.log(`\n${kleur.yellow("Source paths")} ${kleur.dim("(only for active layers)")}`);
  const backend_src = has_backend ? await ask(iface, "  Backend source dir (e.g. backend/, api/, cmd/)", "") : "";
  const frontend_src = has_frontend ? await ask(iface, "  Frontend source dir (e.g. frontend/, web/)", "") : "";
  const mobile_src = has_mobile ? await ask(iface, "  Mobile source dir (e.g. android/, mobile/)", "") : "";

  // ── Commands ──
  console.log(`\n${kleur.yellow("Commands")} ${kleur.dim("(leave blank if not applicable)")}`);
  const build = await ask(iface, "  Build", d.commands?.build ?? "");
  const test = await ask(iface, "  Test", d.commands?.test ?? "");
  const lint = await ask(iface, "  Lint", d.commands?.lint ?? "");
  const format = await ask(iface, "  Format", d.commands?.format ?? "");
  const typecheck = await ask(iface, "  Type check", d.commands?.typecheck ?? "");
  const e2e = await ask(iface, "  E2E", d.commands?.e2e ?? "");

  // ── Models ──
  console.log(`\n${kleur.yellow("Model assignment")}`);
  console.log(`  ${kleur.dim("A)")} Keep all agents on free model ${kleur.dim("(opencode/gpt-5-nano)")}`);
  console.log(`  ${kleur.dim("B)")} Opinionated split — thinkers on claude-sonnet-4-5, mechanics on claude-haiku-4-5`);
  console.log(`  ${kleur.dim("C)")} I'll configure models manually in opencode.json`);
  const model_raw = await ask(iface, "  Choice", "A");
  const model_choice = (["a", "b", "c"].includes(model_raw.toLowerCase()) ? model_raw.toUpperCase() : "A") as "A" | "B" | "C";

  iface.close();

  // ── Write profile.json ──
  const profile = {
    project_name,
    description,
    default_branch,
    arch_pattern,
    has_backend,
    has_frontend,
    has_mobile,
    has_infra,
    has_database,
    platform,
    repo,
    stacks: { backend: backend_stack, frontend: frontend_stack, mobile: mobile_stack, infra: infra_stack, database: database_stack },
    paths: { backend_src, frontend_src, mobile_src },
    commands: { build, test, lint, format, typecheck, e2e },
    agents: {},
    skills: {},
  };
  writeFileSync(profilePath, JSON.stringify(profile, null, 2) + "\n", "utf-8");

  // ── Update opencode.json model assignments ──
  if (existsSync(opencodeJsonPath) && model_choice !== "A") {
    try {
      const cfg = JSON.parse(readFileSync(opencodeJsonPath, "utf-8"));

      const thinkers = ["implementer", "debugger", "setup", "researcher", "designer", "ui-designer",
        "planner", "plan-reviewer", "tester", "reviewer", "issue-manager",
        "backend-developer", "frontend-developer", "mobile-developer", "infra-developer"];
      const mechanics = ["cleaner", "formatter", "commiter"];

      if (model_choice === "B") {
        cfg.model = "opencode/claude-sonnet-4-5";
        cfg.agent = cfg.agent ?? {};
        for (const role of thinkers) cfg.agent[role] = { model: "opencode/claude-sonnet-4-5" };
        for (const role of mechanics) cfg.agent[role] = { model: "opencode/claude-haiku-4-5" };
      }

      writeFileSync(opencodeJsonPath, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
    } catch {
      console.warn(kleur.yellow("  ⚠ Could not update opencode.json — update model assignments manually."));
    }
  }

  // ── Summary ──
  const activeLayers = [
    has_backend && "backend",
    has_frontend && "frontend",
    has_mobile && "mobile",
    has_infra && "infra",
    has_database && "database",
  ].filter(Boolean).join(", ") || "none";

  const modelSummary = { A: "all on gpt-5-nano (free)", B: "thinkers on claude-sonnet-4-5, mechanics on claude-haiku-4-5", C: "not configured — edit opencode.json manually" }[model_choice];

  console.log(`
${kleur.green().bold("✓ Setup complete")}

  Project : ${project_name} (${default_branch})
  Layers  : ${activeLayers}
  Models  : ${modelSummary}
  Profile : ${profilePath}

${kleur.cyan("Next steps:")}
  1. Open this project in OpenCode: ${kleur.dim("opencode")}
  2. The setup agent will generate your developer agents (Tab → setup, then /setup)
  3. Switch to the implementer agent to start building (Tab → implementer)
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { command, targetDir, showHelp, showVersion } = parseArgs(process.argv);

  if (showVersion) {
    console.log(`agent-stack v${VERSION}`);
    process.exit(0);
  }

  if (showHelp || command === null) {
    printHelp();
    process.exit(command === null && !showHelp ? 1 : 0);
  }

  if (command === "init") {
    try {
      await generate({ targetDir });
      console.log(kleur.cyan().bold(
        "✓ agent-stack init complete!\n\n" +
        `Next: run ${kleur.white("bunx agent-stack setup")} to configure your project.\n`
      ));
    } catch (err) {
      console.error(kleur.red(`\nError: ${err instanceof Error ? err.message : "Unknown error"}`));
      process.exit(1);
    }
  } else if (command === "setup") {
    try {
      await runSetup(targetDir);
    } catch (err) {
      console.error(kleur.red(`\nError: ${err instanceof Error ? err.message : "Unknown error"}`));
      process.exit(1);
    }
  } else {
    console.error(kleur.red(`Unknown command: ${command}`));
    printHelp();
    process.exit(1);
  }
}

main();
