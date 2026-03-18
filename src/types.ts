// ─── Project Profile ──────────────────────────────────────────────────────────

export interface ImplAgent {
  /** Stable role name used as the key in opencode.json agent config */
  role: "backend-developer" | "frontend-developer" | "infra-developer";
  /** Tech variant — maps to agents/impl/<category>/<tech>.md */
  tech: string;
  /** Category under agents/impl/ */
  category: "backend" | "frontend" | "mobile" | "infra";
}

export interface Profile {
  project_name: string;
  description: string;

  // ── Component flags ────────────────────────────────────────────────────────
  has_backend: boolean;
  has_frontend: boolean;
  has_infra: boolean;
  has_database: boolean;
  is_mobile: boolean;

  // ── Tech context (free-form, informational for agents) ─────────────────────
  languages: string[];
  frameworks: string[];

  // ── Impl agent assignments ─────────────────────────────────────────────────
  impl_agents: Partial<Record<"backend" | "frontend" | "infra", ImplAgent>>;

  // ── Tooling ───────────────────────────────────────────────────────────────
  test: {
    unit_cmd: string;
    e2e_tool: string | null;
  };
  ci_platform: string;

  // ── Model configuration ───────────────────────────────────────────────────
  model_provider: string;
  model_complex: string;
  model_fast: string;

  // ── Git ───────────────────────────────────────────────────────────────────
  default_branch: string;
}

// ─── Wizard Answers (raw, before resolution) ─────────────────────────────────

export interface WizardAnswers {
  project_name: string;
  description: string;
  languages: string; // comma-separated free text
  frameworks: string; // comma-separated free text
  has_backend: boolean;
  has_frontend: boolean;
  is_mobile: boolean;
  has_infra: boolean;
  has_database: boolean;
  backend_tech: string | null;
  frontend_tech: string | null;
  infra_tech: string | null;
  unit_test_cmd: string;
  e2e_tool: string;
  ci_platform: string;
  model_provider: string;
  model_complex: string;
  model_fast: string;
  default_branch: string;
  // Skills from skills.sh to install (owner/repo format)
  extra_skills: string[];
}

// ─── Skill descriptor ─────────────────────────────────────────────────────────

export interface SkillDescriptor {
  /** Skill name (directory name under skills/) */
  name: string;
  /** Where the skill comes from */
  source: "bundled" | "skills.sh";
  /** For skills.sh skills: owner/repo format */
  registry_ref?: string;
  /** Whether this skill should always be installed */
  core: boolean;
}

// ─── Agent config entry (for opencode.json generation) ───────────────────────

export interface AgentConfig {
  name: string;
  mode: "primary" | "subagent";
  model: string;
  temperature: number;
  tools?: Record<string, boolean>;
  promptFile: string; // path relative to .opencode/agents/
}

// ─── Generation context (passed to Handlebars templates) ─────────────────────

export interface GenerationContext {
  profile: Profile;
  agents: AgentConfig[];
  skills: SkillDescriptor[];
  timestamp: string;
}
