/**
 * Generator — copies universal agent-stack files into <target>/.opencode/
 * and writes a stub opencode.json that the user fills in via /setup.
 *
 * Directory layout produced:
 *
 *   <target>/.opencode/
 *     opencode.json          ← stub; model config
 *     profile.json           ← written by 'bunx agent-stack setup'
 *     agents/
 *       *.md                 ← copied from agents/core/
 *     commands/
 *       setup.md             ← /setup slash command (agent post-setup: generates dev agents)
 *     skills/
 *       <name>/SKILL.md      ← copied from skills/core/
 */

import { existsSync, mkdirSync, writeFileSync, cpSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Resolve package root ──────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = join(dirname(__filename), "..");

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

// ─── Stub opencode.json ───────────────────────────────────────────────────────

const OPENCODE_JSON_STUB = `{
  "$schema": "https://opencode.ai/config.json",

  "theme": "opencode",

  "model": "opencode/qwen3.6-plus-free",

  "agent": {
    "implementer": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "debugger": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "setup": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "researcher": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "designer": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "ui-designer": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "planner": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "plan-reviewer": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "tester": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "reviewer": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "cleaner": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "formatter": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "commiter": {
      "model": "opencode/qwen3.6-plus-free"
    },
    "issue-manager": {
      "model": "opencode/qwen3.6-plus-free"
    }
  }
}
`;

// ─── Stub profile.json ────────────────────────────────────────────────────────

const PROFILE_JSON_STUB = `{
  "project_name": "",
  "description": "",
  "default_branch": "main",
  "arch_pattern": "",
  "has_backend": false,
  "has_frontend": false,
  "has_mobile": false,
  "has_infra": false,
  "has_database": false,
  "platform": "",
  "repo": "",
  "stacks": {
    "backend": "",
    "frontend": "",
    "mobile": "",
    "infra": "",
    "database": ""
  },
  "paths": {
    "backend_src": "",
    "frontend_src": "",
    "mobile_src": ""
  },
  "agents": {},
  "commands": {},
  "skills": {}
}
`;

// ─── Main generator ───────────────────────────────────────────────────────────

export interface GenerateOptions {
  /** Absolute path to the target project directory. Defaults to cwd. */
  targetDir?: string;
}

export async function generate(opts: GenerateOptions = {}): Promise<void> {
  const targetDir = opts.targetDir ?? process.cwd();
  const opencodeDir = join(targetDir, ".opencode");

  console.log("\nGenerating .opencode/ ...\n");

  // ── 1. opencode.json stub ──────────────────────────────────────────────────
  const opencodeJsonPath = join(opencodeDir, "opencode.json");
  if (!existsSync(opencodeJsonPath)) {
    writeFile(opencodeJsonPath, OPENCODE_JSON_STUB);
    console.log("  ✓ .opencode/opencode.json");
  } else {
    console.log("  ↷ .opencode/opencode.json already exists — skipped");
  }

  // ── 1b. profile.json stub ─────────────────────────────────────────────────
  const profileJsonPath = join(opencodeDir, "profile.json");
  if (!existsSync(profileJsonPath)) {
    writeFile(profileJsonPath, PROFILE_JSON_STUB);
    console.log("  ✓ .opencode/profile.json (stub — complete via /setup)");
  } else {
    console.log("  ↷ .opencode/profile.json already exists — skipped");
  }

  // ── 2. Core agents ─────────────────────────────────────────────────────────
  const coreAgentsSrc = join(PACKAGE_ROOT, "agents", "core");
  const coreAgentsDest = join(opencodeDir, "agents");
  copyDir(coreAgentsSrc, coreAgentsDest);
  console.log("  ✓ .opencode/agents/");

  // ── 3. /setup command ──────────────────────────────────────────────────────
  const setupCommandPath = join(opencodeDir, "commands", "setup.md");
  if (!existsSync(setupCommandPath)) {
    writeFile(
      setupCommandPath,
      `---\ndescription: Run the project setup wizard\nagent: setup\n---\nRun the setup wizard to configure this project.\n`
    );
    console.log("  ✓ .opencode/commands/setup.md");
  } else {
    console.log("  ↷ .opencode/commands/setup.md already exists — skipped");
  }

  // ── 4. Core skills ──────────────────────────────────────────────────────────
  const coreSkillsSrc = join(PACKAGE_ROOT, "skills", "core");
  const coreSkillsDest = join(opencodeDir, "skills");
  copyDir(coreSkillsSrc, coreSkillsDest);
  console.log("  ✓ .opencode/skills/ (core skills)");

  console.log("\nDone.\n");
  console.log("Next step: run  bunx agent-stack setup  to configure your project.");
  console.log("Then open it in OpenCode — agents will be ready.\n");
}
