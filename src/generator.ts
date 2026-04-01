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

  "model": "opencode/gpt-5-nano",

  "agent": {
    "implementer": {
      "model": "opencode/gpt-5-nano"
    },
    "debugger": {
      "model": "opencode/gpt-5-nano"
    },
    "setup": {
      "model": "opencode/gpt-5-nano"
    },
    "researcher": {
      "model": "opencode/gpt-5-nano"
    },
    "designer": {
      "model": "opencode/gpt-5-nano"
    },
    "ui-designer": {
      "model": "opencode/gpt-5-nano"
    },
    "planner": {
      "model": "opencode/gpt-5-nano"
    },
    "plan-reviewer": {
      "model": "opencode/gpt-5-nano"
    },
    "tester": {
      "model": "opencode/gpt-5-nano"
    },
    "reviewer": {
      "model": "opencode/gpt-5-nano"
    },
    "cleaner": {
      "model": "opencode/gpt-5-nano"
    },
    "formatter": {
      "model": "opencode/gpt-5-nano"
    },
    "commiter": {
      "model": "opencode/gpt-5-nano"
    },
    "issue-manager": {
      "model": "opencode/gpt-5-nano"
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
