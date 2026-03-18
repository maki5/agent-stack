/**
 * Skills installer — handles the post-generation step of installing skills
 * that come from the skills.sh registry (not bundled in this repo).
 *
 * Bundled skills (core/ and tech/) are already copied by generator.ts during
 * the main generation pass. This module only deals with "source: skills.sh"
 * entries, which require running `npx skills add <ref>` in the target project.
 */

import { execSync } from "child_process";
import kleur from "kleur";
import type { SkillDescriptor } from "./types.ts";

export interface InstallResult {
  ref: string;
  success: boolean;
  error?: string;
}

/**
 * Install a list of skills.sh skills into the target project directory.
 *
 * Each skill is installed by running:
 *   npx skills add <registry_ref>
 *
 * in the target project directory (so the skill lands in
 * <targetDir>/.opencode/skills/<name>/).
 */
export async function installSkillsShSkills(
  skills: SkillDescriptor[],
  targetDir: string
): Promise<InstallResult[]> {
  const shSkills = skills.filter(
    (s) => s.source === "skills.sh" && s.registry_ref
  );

  if (shSkills.length === 0) return [];

  console.log(
    kleur.yellow("\nInstalling extra skills from skills.sh registry...\n")
  );

  const results: InstallResult[] = [];

  for (const skill of shSkills) {
    const ref = skill.registry_ref!;
    console.log(`  → npx skills add ${ref}`);
    try {
      execSync(`npx skills add ${ref}`, {
        cwd: targetDir,
        stdio: "inherit",
      });
      console.log(kleur.green(`  ✓ Installed ${ref}\n`));
      results.push({ ref, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(kleur.yellow(`  ⚠ Failed to install ${ref}: ${msg}\n`));
      results.push({ ref, success: false, error: msg });
    }
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.log(
      kleur.yellow(
        `\n${failed.length} skill(s) could not be installed automatically.\n` +
          "You can install them manually later:\n"
      )
    );
    for (const f of failed) {
      console.log(`  npx skills add ${f.ref}`);
    }
    console.log();
  }

  return results;
}
