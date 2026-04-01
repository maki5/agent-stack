// ─── Project Profile ──────────────────────────────────────────────────────────

export interface ProfileCommands {
  build: string;
  test: string;
  lint: string;
  format: string;
  typecheck: string;
  e2e?: string;
  [key: string]: string | undefined;
}

export interface ProfilePaths {
  backend_src?: string;
  frontend_src?: string;
  mobile_src?: string;
  [key: string]: string | undefined;
}

export interface Profile {
  project_name: string;
  description: string;

  // ── Git ───────────────────────────────────────────────────────────────────
  default_branch: string;

  // ── Layer flags ───────────────────────────────────────────────────────────
  has_backend: boolean;
  has_frontend: boolean;
  has_mobile: boolean;
  has_infra: boolean;
  has_database: boolean;

  // ── Platform / architecture ───────────────────────────────────────────────
  /** e.g. "web", "mobile-android", "mobile-ios", "mobile-cross-platform", "api-only" */
  platform: string;
  /** e.g. "layered-mvc", "mvvm", "clean", "serverless" */
  arch_pattern: string;

  // ── Runtime commands (read by agents to run build/test/lint/format) ───────
  commands: ProfileCommands;

  // ── Source paths (read by agents to locate files) ─────────────────────────
  paths: ProfilePaths;

  // ── Per-agent skill lists (populated by setup agent) ─────────────────────
  /** Keys are agent role names; values are arrays of skill names to load */
  skills: Record<string, string[]>;

  // ── Optional: target GitHub repo for issue-manager ───────────────────────
  repo?: string;
}
