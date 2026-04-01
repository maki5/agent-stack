/**
 * setup_wizard — interactive project setup tool for agent-stack.
 *
 * Called by the setup agent. Launches a terminal prompt session that:
 *  1. Auto-detects project metadata from the filesystem
 *  2. Prompts the user to confirm / fill in each field
 *  3. Returns a filled ProfileData JSON object to the agent
 *
 * The agent then writes profile.json and updates opencode.json silently.
 */

import { tool } from "@opencode-ai/plugin";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as readline from "readline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
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
  stacks: {
    backend: string;
    frontend: string;
    mobile: string;
    infra: string;
    database: string;
  };
  paths: {
    backend_src: string;
    frontend_src: string;
    mobile_src: string;
  };
  commands: {
    build: string;
    test: string;
    lint: string;
    format: string;
    typecheck: string;
    e2e: string;
  };
  model_choice: "A" | "B" | "C";
}

// ─── Detection helpers ────────────────────────────────────────────────────────

function detectProject(dir: string): Partial<ProfileData> {
  const detected: Partial<ProfileData> = {};

  // Project name from package.json or directory name
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) detected.project_name = pkg.name;
      if (pkg.description) detected.description = pkg.description;

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps["next"]) detected.stacks = { ...detected.stacks, frontend: "Next.js/React" } as any;
      else if (deps["nuxt"]) detected.stacks = { ...detected.stacks, frontend: "Nuxt/Vue 3" } as any;
      else if (deps["@sveltejs/kit"]) detected.stacks = { ...detected.stacks, frontend: "SvelteKit" } as any;
      else if (deps["react"]) detected.stacks = { ...detected.stacks, frontend: "React" } as any;
      else if (deps["vue"]) detected.stacks = { ...detected.stacks, frontend: "Vue 3" } as any;

      if (deps["express"] || deps["fastify"] || deps["hono"]) {
        detected.stacks = { ...detected.stacks, backend: deps["express"] ? "Node/Express" : deps["fastify"] ? "Node/Fastify" : "Node/Hono" } as any;
      }
    } catch {}
  }

  if (!detected.project_name) {
    detected.project_name = dir.split("/").pop() ?? "";
  }

  // Default branch from git
  const headPath = join(dir, ".git", "HEAD");
  if (existsSync(headPath)) {
    const head = readFileSync(headPath, "utf-8").trim();
    const match = head.match(/^ref: refs\/heads\/(.+)$/);
    if (match) detected.default_branch = match[1];
  }
  if (!detected.default_branch) detected.default_branch = "main";

  // Layer detection
  if (existsSync(join(dir, "go.mod"))) {
    detected.has_backend = true;
    detected.stacks = { ...detected.stacks, backend: "Go" } as any;
    detected.commands = { ...detected.commands, build: "go build ./...", test: "go test ./...", lint: "golangci-lint run", format: "gofmt -w ." } as any;
  }
  if (existsSync(join(dir, "requirements.txt")) || existsSync(join(dir, "pyproject.toml"))) {
    detected.has_backend = true;
    detected.stacks = { ...detected.stacks, backend: "Python" } as any;
  }
  if (existsSync(join(dir, "Cargo.toml"))) {
    detected.has_backend = true;
    detected.stacks = { ...detected.stacks, backend: "Rust" } as any;
  }
  if (existsSync(join(dir, "pubspec.yaml"))) {
    detected.has_mobile = true;
    detected.stacks = { ...detected.stacks, mobile: "Flutter/Dart" } as any;
  }
  if (existsSync(join(dir, "android")) || existsSync(join(dir, "ios"))) {
    detected.has_mobile = true;
  }
  if (existsSync(join(dir, "docker-compose.yml")) || existsSync(join(dir, "Dockerfile"))) {
    detected.has_infra = true;
  }
  if (
    existsSync(join(dir, "migrations")) ||
    existsSync(join(dir, "schema.sql")) ||
    existsSync(join(dir, "prisma"))
  ) {
    detected.has_database = true;
  }

  // Detect frontend from package.json presence (already handled above via deps)
  if (detected.stacks?.frontend) detected.has_frontend = true;

  // npm scripts
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const s = pkg.scripts ?? {};
      detected.commands = {
        build: s.build ? "npm run build" : detected.commands?.build ?? "",
        test: s.test ? "npm test" : detected.commands?.test ?? "",
        lint: s.lint ? "npm run lint" : detected.commands?.lint ?? "",
        format: s.format ? "npm run format" : detected.commands?.format ?? "",
        typecheck: s["type-check"] || s.typecheck ? "npm run typecheck" : detected.commands?.typecheck ?? "",
        e2e: s.e2e ? "npm run e2e" : detected.commands?.e2e ?? "",
      };
    } catch {}
  }

  return detected;
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stderr });
}

async function ask(rl: readline.Interface, question: string, defaultVal = ""): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultVal ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

async function askYesNo(rl: readline.Interface, question: string, defaultVal: boolean): Promise<boolean> {
  const hint = defaultVal ? "Y/n" : "y/N";
  return new Promise((resolve) => {
    rl.question(`${question} (${hint}): `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (!a) resolve(defaultVal);
      else resolve(a === "y" || a === "yes");
    });
  });
}

async function askChoice(rl: readline.Interface, question: string, choices: string[], defaultVal: string): Promise<string> {
  const list = choices.map((c, i) => `  ${i + 1}) ${c}`).join("\n");
  return new Promise((resolve) => {
    process.stderr.write(`${question}\n${list}\nChoice [${defaultVal}]: `);
    rl.once("line", (answer) => {
      const a = answer.trim();
      const n = parseInt(a);
      if (!a) resolve(defaultVal);
      else if (n >= 1 && n <= choices.length) resolve(choices[n - 1][0]); // return first char as key
      else resolve(defaultVal);
    });
  });
}

// ─── Tool definition ──────────────────────────────────────────────────────────

export default tool({
  description:
    "Interactive project setup wizard. Detects project metadata and prompts the user to confirm each field. Returns a filled ProfileData object for the agent to write to profile.json.",
  args: {},
  async execute(_args, context) {
    const dir = context.worktree ?? context.directory ?? process.cwd();
    const detected = detectProject(dir);

    const rl = createRL();

    process.stderr.write("\n=== agent-stack setup ===\n\n");
    process.stderr.write("Press Enter to accept detected values, or type to override.\n\n");

    // ── Project ──────────────────────────────────────────────────────────────
    process.stderr.write("── Project ─────────────────────────────────────────\n");
    const project_name = await ask(rl, "Name", detected.project_name ?? "");
    const default_branch = await ask(rl, "Default branch", detected.default_branch ?? "main");
    const description = await ask(rl, "One-sentence description", detected.description ?? "");
    const arch_pattern = await ask(rl, "Architecture (monolith/microservices/monorepo/serverless)", "monolith");
    const repo = await ask(rl, "GitHub repo (OWNER/REPO, optional)", "");

    // ── Layers ───────────────────────────────────────────────────────────────
    process.stderr.write("\n── Layers ──────────────────────────────────────────\n");
    const has_backend = await askYesNo(rl, "Backend?", detected.has_backend ?? false);
    const has_frontend = await askYesNo(rl, "Frontend (web)?", detected.has_frontend ?? false);
    const has_mobile = await askYesNo(rl, "Mobile?", detected.has_mobile ?? false);
    const has_infra = await askYesNo(rl, "Infrastructure (IaC)?", detected.has_infra ?? false);
    const has_database = await askYesNo(rl, "Database?", detected.has_database ?? false);

    // ── Tech stacks ──────────────────────────────────────────────────────────
    process.stderr.write("\n── Tech stacks ─────────────────────────────────────\n");
    const backend_stack = has_backend ? await ask(rl, "Backend stack (e.g. Go/Fiber, Python/FastAPI)", detected.stacks?.backend ?? "") : "";
    const frontend_stack = has_frontend ? await ask(rl, "Frontend stack (e.g. Next.js/React, Vue 3)", detected.stacks?.frontend ?? "") : "";
    const mobile_stack = has_mobile ? await ask(rl, "Mobile stack (e.g. Kotlin/Android, Flutter)", detected.stacks?.mobile ?? "") : "";
    const infra_stack = has_infra ? await ask(rl, "Infra stack (e.g. Terraform/AWS, Pulumi/GCP)", detected.stacks?.infra ?? "") : "";
    const database_stack = has_database ? await ask(rl, "Database (e.g. PostgreSQL, MySQL, MongoDB)", detected.stacks?.database ?? "") : "";
    const platform = has_mobile ? await ask(rl, "Mobile platform (android/ios/cross)", "") : "";

    // ── Source paths ─────────────────────────────────────────────────────────
    process.stderr.write("\n── Source paths ────────────────────────────────────\n");
    const backend_src = has_backend ? await ask(rl, "Backend source dir (e.g. backend/, api/, cmd/)", "") : "";
    const frontend_src = has_frontend ? await ask(rl, "Frontend source dir (e.g. frontend/, web/)", "") : "";
    const mobile_src = has_mobile ? await ask(rl, "Mobile source dir (e.g. android/, mobile/)", "") : "";

    // ── Commands ─────────────────────────────────────────────────────────────
    process.stderr.write("\n── Commands (leave blank if not applicable) ────────\n");
    const build = await ask(rl, "Build", detected.commands?.build ?? "");
    const test = await ask(rl, "Test", detected.commands?.test ?? "");
    const lint = await ask(rl, "Lint", detected.commands?.lint ?? "");
    const format = await ask(rl, "Format", detected.commands?.format ?? "");
    const typecheck = await ask(rl, "Type check", detected.commands?.typecheck ?? "");
    const e2e = await ask(rl, "E2E", detected.commands?.e2e ?? "");

    // ── Models ───────────────────────────────────────────────────────────────
    process.stderr.write("\n── Model assignment ────────────────────────────────\n");
    process.stderr.write("Your agents default to opencode/gpt-5-nano (free).\n");
    process.stderr.write("  1) A — keep all on free model\n");
    process.stderr.write("  2) B — thinkers on claude-sonnet-4-5, mechanics on claude-haiku-4-5\n");
    process.stderr.write("  3) C — I'll pick per agent\n");
    const model_raw = await ask(rl, "Choice", "A");
    const model_choice = (["A", "B", "C"].includes(model_raw.toUpperCase()) ? model_raw.toUpperCase() : "A") as "A" | "B" | "C";

    rl.close();

    process.stderr.write("\n");

    const result: ProfileData = {
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
      stacks: {
        backend: backend_stack,
        frontend: frontend_stack,
        mobile: mobile_stack,
        infra: infra_stack,
        database: database_stack,
      },
      paths: {
        backend_src,
        frontend_src,
        mobile_src,
      },
      commands: { build, test, lint, format, typecheck, e2e },
      model_choice,
    };

    return JSON.stringify(result, null, 2);
  },
});
