/**
 * Generator — copies universal agent-stack files into <target>/.opencode/
 * and writes a stub opencode.json that the user fills in via /setup.
 *
 * Directory layout produced:
 *
 *   <target>/.opencode/
 *     opencode.json          ← stub; completed by /setup agent
 *     agents/
 *       core/                ← copied from agents/core/
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

  "model": "anthropic/claude-sonnet-4-5",

  "agents": {
    "implementer": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "debugger": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "researcher": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "designer": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "ui-designer": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "planner": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "plan-reviewer": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "tester": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "reviewer": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "cleaner": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "formatter": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "commiter": {
      "model": "anthropic/claude-sonnet-4-5"
    },
    "issue-manager": {
      "model": "anthropic/claude-sonnet-4-5"
    }
  },

  "profile": {
    "TODO": "Run /setup in OpenCode to complete this section",
    "project_name": "",
    "description": "",
    "default_branch": "main",
    "has_backend": false,
    "has_frontend": false,
    "has_mobile": false,
    "has_infra": false,
    "has_database": false,
    "platform": "",
    "arch_pattern": "",
    "commands": {
      "build": "",
      "test": "",
      "lint": "",
      "format": "",
      "typecheck": "",
      "e2e": ""
    },
    "paths": {
      "backend_src": "",
      "frontend_src": "",
      "mobile_src": ""
    },
    "agents": {},
    "skills": {}
  }
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
    console.log("  ✓ .opencode/opencode.json (stub — complete via /setup)");
  } else {
    console.log("  ↷ .opencode/opencode.json already exists — skipped");
  }

  // ── 2. Core agents ─────────────────────────────────────────────────────────
  const coreAgentsSrc = join(PACKAGE_ROOT, "agents", "core");
  const coreAgentsDest = join(opencodeDir, "agents", "core");
  copyDir(coreAgentsSrc, coreAgentsDest);
  console.log("  ✓ .opencode/agents/core/");

  // ── 3. Core skills ──────────────────────────────────────────────────────────
  const coreSkillsSrc = join(PACKAGE_ROOT, "skills", "core");
  const coreSkillsDest = join(opencodeDir, "skills");
  copyDir(coreSkillsSrc, coreSkillsDest);
  console.log("  ✓ .opencode/skills/ (core skills)");

  console.log("\nDone.\n");
  console.log("Next step: open this project in OpenCode and run /setup");
  console.log("The setup agent will complete opencode.json and generate your developer agents.\n");
}
