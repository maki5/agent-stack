#!/usr/bin/env bun
/**
 * agent-stack CLI entrypoint.
 *
 * Usage:
 *   npx agent-stack init           — run wizard and generate .opencode/ in cwd
 *   npx agent-stack init --dir <p> — generate into a specific directory
 *   npx agent-stack --version      — print version
 *   npx agent-stack --help         — print help
 */

import kleur from "kleur";
import { runWizard } from "../src/wizard.ts";
import { generate } from "../src/generator.ts";
import { installSkillsShSkills } from "../src/skills-installer.ts";

// ─── Version ──────────────────────────────────────────────────────────────────

// Bun can import JSON directly
import pkg from "../package.json";
const VERSION: string = pkg.version;

// ─── Argument parsing (no external dep needed) ────────────────────────────────

function parseArgs(argv: string[]): {
  command: string | null;
  targetDir: string;
  showHelp: boolean;
  showVersion: boolean;
} {
  const args = argv.slice(2); // strip 'bun' + script path
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
OpenCode agent workflow setup for any tech stack.

${kleur.yellow("USAGE")}
  npx agent-stack <command> [options]

${kleur.yellow("COMMANDS")}
  init          Run the wizard and generate .opencode/ setup in the current
                directory (or --dir <path>).

${kleur.yellow("OPTIONS")}
  --dir, -d     Target project directory (default: current directory)
  --version, -v Print version
  --help, -h    Print this help

${kleur.yellow("EXAMPLES")}
  cd my-project && npx agent-stack init
  npx agent-stack init --dir /path/to/project
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
      // Run wizard
      const answers = await runWizard();

      // Generate .opencode/ files; returns resolved profile + skills
      const { skills } = await generate(answers, { targetDir });

      // Install any skills.sh extras (bundled ones already copied by generate)
      const extraSkillsShRefs = skills.filter((s) => s.source === "skills.sh");
      if (extraSkillsShRefs.length > 0) {
        await installSkillsShSkills(extraSkillsShRefs, targetDir);
      }

      console.log(
        kleur.cyan().bold(
          "✓ agent-stack setup complete!\n\n" +
            "Open your project in OpenCode and type /implementer to get started.\n"
        )
      );
    } catch (err) {
      if (err instanceof Error) {
        console.error(kleur.red(`\nError: ${err.message}`));
      } else {
        console.error(kleur.red("\nUnknown error occurred."));
      }
      process.exit(1);
    }
  } else {
    console.error(kleur.red(`Unknown command: ${command}`));
    printHelp();
    process.exit(1);
  }
}

main();
