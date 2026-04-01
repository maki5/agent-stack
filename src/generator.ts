/**
 * Generator — copies universal agent-stack files into <target>/.opencode/
 * and writes a stub opencode.json that the user fills in via /setup.
 *
 * Directory layout produced:
 *
 *   <target>/.opencode/
 *     opencode.json          ← stub; model config, completed by /setup
 *     profile.json           ← stub; project profile, completed by /setup
 *     agents/
 *       *.md                 ← copied from agents/core/
 *     commands/
 *       setup.md             ← /setup slash command
 *     skills/
 *       <name>/SKILL.md      ← copied from skills/core/
 *     tools/
 *       setup_wizard.ts      ← interactive setup wizard tool
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
  }
}
`;

// ─── Stub profile.json ────────────────────────────────────────────────────────

const PROFILE_JSON_STUB = `{
  "TODO": "Run /setup in OpenCode to complete this file",
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

  // ── 5. Tools ────────────────────────────────────────────────────────────────
  const toolsSrc = join(PACKAGE_ROOT, "tools");
  const toolsDest = join(opencodeDir, "tools");
  copyDir(toolsSrc, toolsDest);
  console.log("  ✓ .opencode/tools/ (setup_wizard)");

  console.log("\nDone.\n");
  console.log("Next step: open this project in OpenCode and run /setup");
  console.log("The setup wizard will complete your configuration and generate developer agents.\n");
}
