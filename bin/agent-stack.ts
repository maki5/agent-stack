#!/usr/bin/env bun
/**
 * agent-stack CLI entrypoint.
 *
 * Usage:
 *   npx agent-stack init           — copy universal files into .opencode/ in cwd
 *   npx agent-stack init --dir <p> — generate into a specific directory
 *   npx agent-stack --version      — print version
 *   npx agent-stack --help         — print help
 *
 * After running init, open your project in OpenCode and run /setup to complete
 * the configuration and generate your tech-specific developer agents.
 */

import kleur from "kleur";
import { generate } from "../src/generator.ts";

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
  npx agent-stack <command> [options]

${kleur.yellow("COMMANDS")}
  init          Copy universal agents and skills into .opencode/ in the current
                directory (or --dir <path>), and write a stub opencode.json.
                Then open the project in OpenCode and run /setup to complete
                configuration and generate your tech-specific developer agents.

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
      await generate({ targetDir });

      console.log(
        kleur.cyan().bold(
          "✓ agent-stack init complete!\n\n" +
          "Open your project in OpenCode and run /setup to complete configuration.\n"
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
