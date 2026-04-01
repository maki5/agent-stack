/**
 * Generator — takes WizardAnswers, builds the GenerationContext, and writes
 * the .opencode/ directory tree into the target project.
 *
 * Directory layout produced:
 *
 *   <target>/.opencode/
 *     opencode.json               ← rendered from templates/opencode.json.hbs
 *     agents/
 *       core/                     ← copied from agents/core/
 *       impl/                     ← only selected impl agents
 *     skills/
 *       <name>/SKILL.md           ← bundled core + tech skills
 *   <target>/AGENTS.md            ← rendered from templates/AGENTS.md.hbs
 *   <target>/.github/instructions/
 *       *.instructions.md         ← rendered from instructions/*.hbs
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { render } from "./template-engine.ts";
import { IMPL_AGENT_MAP } from "./registry.ts";
import type { WizardAnswers, Profile, GenerationContext, SkillDescriptor } from "./types.ts";

// ─── Resolve package root (where agent-stack is installed/cloned) ─────────────

const __filename = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = join(dirname(__filename), "..");

// ─── Profile resolution ───────────────────────────────────────────────────────

function resolveProfile(answers: WizardAnswers): Profile {
  const impl_agents: Profile["impl_agents"] = {};

  if (answers.has_backend && answers.backend_tech && answers.backend_tech !== "__custom__") {
    const entry = IMPL_AGENT_MAP[answers.backend_tech];
    if (entry) {
      impl_agents.backend = {
        role: "backend-developer",
        tech: answers.backend_tech,
        category: "backend",
      };
    }
  }

  if (answers.has_frontend && answers.frontend_tech && answers.frontend_tech !== "__custom__") {
    const category = answers.is_mobile ? "mobile" : "frontend";
    const entry = IMPL_AGENT_MAP[answers.frontend_tech];
    if (entry) {
      impl_agents.frontend = {
        role: "frontend-developer",
        tech: answers.frontend_tech,
        category,
      };
    }
  }

  if (answers.has_infra && answers.infra_tech && answers.infra_tech !== "__custom__") {
    const entry = IMPL_AGENT_MAP[answers.infra_tech];
    if (entry) {
      impl_agents.infra = {
        role: "infra-developer",
        tech: answers.infra_tech,
        category: "infra",
      };
    }
  }

  return {
    project_name: answers.project_name,
    description: answers.description,
    has_backend: answers.has_backend,
    has_frontend: answers.has_frontend,
    has_infra: answers.has_infra,
    has_database: answers.has_database,
    is_mobile: answers.is_mobile,
    languages: answers.languages.split(",").map((s) => s.trim()).filter(Boolean),
    frameworks: answers.frameworks.split(",").map((s) => s.trim()).filter(Boolean),
    impl_agents,
    test: {
      unit_cmd: answers.unit_test_cmd,
      e2e_tool: answers.e2e_tool,
    },
    ci_platform: answers.ci_platform,
    model_provider: answers.model_provider,
    model_complex: answers.model_complex,
    model_fast: answers.model_fast,
    default_branch: answers.default_branch,
  };
}

// ─── Skill list resolution ────────────────────────────────────────────────────

function resolveSkills(answers: WizardAnswers): SkillDescriptor[] {
  const skills: SkillDescriptor[] = [];
  const added = new Set<string>();

  function addBundled(name: string, core: boolean) {
    if (added.has(name)) return;
    added.add(name);
    skills.push({ name, source: "bundled", core });
  }

  // Always-on core skills
  for (const name of [
    "git-workflow",
    "code-review",
    "self-healing",
    "three-layer-testing",
    "output-discipline",
    "find-skills",
    "mermaid-diagrams",
    "c4-architecture",
    "architecture-patterns",
    "implement-design",
    "ui-ux-pro-max",
    "web-design-guidelines",
    "research",
    "github-issues",
    "github-workflow",
  ]) {
    addBundled(name, true);
  }

  // Tech skills from selected impl agents
  const techKeys = [answers.backend_tech, answers.frontend_tech, answers.infra_tech].filter(
    (t): t is string => !!t && t !== "__custom__"
  );
  for (const tech of techKeys) {
    const entry = IMPL_AGENT_MAP[tech];
    if (entry) {
      for (const skill of entry.defaultSkills) {
        addBundled(skill, false);
      }
    }
  }

  // Extra skills from skills.sh
  for (const ref of answers.extra_skills) {
    skills.push({ name: ref, source: "skills.sh", registry_ref: ref, core: false });
  }

  return skills;
}

// ─── File utilities ───────────────────────────────────────────────────────────

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function writeFile(p: string, content: string) {
  ensureDir(dirname(p));
  writeFileSync(p, content, "utf-8");
}

function copyDir(src: string, dest: string) {
  if (!existsSync(src)) return;
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}

function readTemplate(relPath: string): string {
  const full = join(PACKAGE_ROOT, relPath);
  if (!existsSync(full)) throw new Error(`Template not found: ${full}`);
  return readFileSync(full, "utf-8");
}

// ─── Main generator ───────────────────────────────────────────────────────────

export interface GenerateOptions {
  /** Absolute path to the target project directory. Defaults to cwd. */
  targetDir?: string;
  /** Skip confirmation prompts (for tests). */
  force?: boolean;
}

export interface GenerateResult {
  profile: Profile;
  skills: SkillDescriptor[];
}

export async function generate(
  answers: WizardAnswers,
  opts: GenerateOptions = {}
): Promise<GenerateResult> {
  const targetDir = opts.targetDir ?? process.cwd();
  const opencodeDir = join(targetDir, ".opencode");

  const profile = resolveProfile(answers);
  const skills = resolveSkills(answers);
  const ctx: GenerationContext = {
    profile,
    agents: [], // populated by template directly
    skills,
    timestamp: new Date().toISOString(),
  };

  console.log("\nGenerating .opencode/ ...\n");

  // ── 1. opencode.json ────────────────────────────────────────────────────────
  const opencodeJsonTpl = readTemplate("templates/opencode.json.hbs");
  const opencodeJson = render(opencodeJsonTpl, ctx);
  writeFile(join(opencodeDir, "opencode.json"), opencodeJson);
  console.log("  ✓ .opencode/opencode.json");

  // ── 2. Core agents ──────────────────────────────────────────────────────────
  const coreAgentsSrc = join(PACKAGE_ROOT, "agents", "core");
  const coreAgentsDest = join(opencodeDir, "agents", "core");
  copyDir(coreAgentsSrc, coreAgentsDest);
  console.log("  ✓ .opencode/agents/core/ (14 agents)");

  // ── 3. Impl agent variants (selected only) ─────────────────────────────────
  const implSrcRoot = join(PACKAGE_ROOT, "agents", "impl");
  const implDestRoot = join(opencodeDir, "agents", "impl");

  const selectedImpl = [
    { tech: answers.backend_tech, key: "backend" },
    { tech: answers.frontend_tech, key: "frontend" },
    { tech: answers.infra_tech, key: "infra" },
  ].filter((x): x is { tech: string; key: string } => !!x.tech && x.tech !== "__custom__");

  for (const { tech } of selectedImpl) {
    const entry = IMPL_AGENT_MAP[tech];
    if (!entry) continue;
    const src = join(implSrcRoot, entry.agentFile);
    const dest = join(implDestRoot, entry.agentFile);
    if (existsSync(src)) {
      ensureDir(dirname(dest));
      writeFileSync(dest, readFileSync(src));
      console.log(`  ✓ .opencode/agents/impl/${entry.agentFile}`);
    }
  }

  // ── 4. Bundled skills ───────────────────────────────────────────────────────
  const bundledSkills = skills.filter((s) => s.source === "bundled");
  for (const skill of bundledSkills) {
    // Try core/ first, then tech/
    let src = join(PACKAGE_ROOT, "skills", "core", skill.name);
    if (!existsSync(src)) {
      src = join(PACKAGE_ROOT, "skills", "tech", skill.name);
    }
    if (existsSync(src)) {
      const dest = join(opencodeDir, "skills", skill.name);
      copyDir(src, dest);
      console.log(`  ✓ .opencode/skills/${skill.name}/`);
    } else {
      console.warn(`  ⚠ skill '${skill.name}' not found in bundled skills — skipping`);
    }
  }

  // ── 5. AGENTS.md ───────────────────────────────────────────────────────────
  const agentsMdTpl = readTemplate("templates/AGENTS.md.hbs");
  const agentsMd = render(agentsMdTpl, ctx);
  writeFile(join(targetDir, "AGENTS.md"), agentsMd);
  console.log("  ✓ AGENTS.md");

  // ── 6. Instruction files ────────────────────────────────────────────────────
  const instrSrcDir = join(PACKAGE_ROOT, "instructions");
  if (existsSync(instrSrcDir)) {
    const instrDestDir = join(targetDir, ".github", "instructions");
    const instrFiles = readdirSync(instrSrcDir).filter((f) => f.endsWith(".hbs"));
    for (const hbsFile of instrFiles) {
      const tpl = readFileSync(join(instrSrcDir, hbsFile), "utf-8");
      const rendered = render(tpl, ctx);
      const outName = basename(hbsFile, ".hbs");
      writeFile(join(instrDestDir, outName), rendered);
      console.log(`  ✓ .github/instructions/${outName}`);
    }
  }

  console.log("\nDone. Your .opencode/ setup is ready.\n");

  return { profile, skills };
}
