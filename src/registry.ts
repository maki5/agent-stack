/**
 * IMPL_AGENT_MAP — registry of all available implementation agent variants.
 *
 * Each key is the "tech" value stored in the profile. The wizard uses this to
 * build selection menus. The generator uses it to resolve agent file paths and
 * default skills to install.
 */

export interface ImplAgentEntry {
  /** Category under agents/impl/ */
  category: "backend" | "frontend" | "mobile" | "infra";
  /** Human-readable label shown in wizard */
  label: string;
  /** One-line description shown as hint in wizard */
  description: string;
  /** Relative path under agents/impl/, e.g. "backend/go.md" */
  agentFile: string;
  /** Bundled skill names to install when this agent is selected */
  defaultSkills: string[];
}

export const IMPL_AGENT_MAP: Record<string, ImplAgentEntry> = {
  // ── Backend ──────────────────────────────────────────────────────────────────
  go: {
    category: "backend",
    label: "Go",
    description: "Go backend (chi, gin, echo, net/http, pgx, sqlx, gorm…)",
    agentFile: "backend/go.md",
    defaultSkills: [
      "go-backend-patterns",
      "go-backend-microservices",
      "golang-testing",
    ],
  },
  nodejs: {
    category: "backend",
    label: "Node.js",
    description: "Node.js backend (Express, Fastify, NestJS, Hono…)",
    agentFile: "backend/nodejs.md",
    defaultSkills: [],
  },
  python: {
    category: "backend",
    label: "Python",
    description: "Python backend (FastAPI, Django, Flask…)",
    agentFile: "backend/python.md",
    defaultSkills: [],
  },

  // ── Frontend ─────────────────────────────────────────────────────────────────
  nextjs: {
    category: "frontend",
    label: "Next.js",
    description: "Next.js App Router (React, TypeScript, Tailwind, Zustand…)",
    agentFile: "frontend/nextjs.md",
    defaultSkills: [
      "nextjs-app-router",
      "next-best-practices",
    ],
  },
  vue: {
    category: "frontend",
    label: "Vue / Nuxt",
    description: "Vue 3 or Nuxt 3 (Composition API, Pinia…)",
    agentFile: "frontend/vue.md",
    defaultSkills: [],
  },
  "react-native": {
    category: "frontend",
    label: "React Native (web)",
    description: "React Native for Web / Expo Web",
    agentFile: "frontend/react-native.md",
    defaultSkills: [],
  },

  // ── Mobile ───────────────────────────────────────────────────────────────────
  "kotlin-android": {
    category: "mobile",
    label: "Kotlin (Android)",
    description: "Native Android with Kotlin, Jetpack Compose, Hilt…",
    agentFile: "mobile/kotlin-android.md",
    defaultSkills: [],
  },
  "swift-ios": {
    category: "mobile",
    label: "Swift (iOS)",
    description: "Native iOS with Swift, SwiftUI, Combine…",
    agentFile: "mobile/swift-ios.md",
    defaultSkills: [],
  },
  "react-native-mobile": {
    category: "mobile",
    label: "React Native (mobile)",
    description: "Cross-platform mobile with React Native / Expo",
    agentFile: "mobile/react-native.md",
    defaultSkills: [],
  },

  // ── Infra ────────────────────────────────────────────────────────────────────
  "aws-terraform": {
    category: "infra",
    label: "AWS + Terraform",
    description: "AWS infrastructure managed with Terraform / OpenTofu",
    agentFile: "infra/aws-terraform.md",
    defaultSkills: [
      "terraform-best-practices",
      "terraform-specialist",
      "aws-lambda",
    ],
  },
  "gcp-terraform": {
    category: "infra",
    label: "GCP + Terraform",
    description: "Google Cloud infrastructure managed with Terraform",
    agentFile: "infra/gcp-terraform.md",
    defaultSkills: [
      "terraform-best-practices",
      "terraform-specialist",
    ],
  },
  "k8s-helm": {
    category: "infra",
    label: "Kubernetes + Helm",
    description: "Kubernetes workloads managed with Helm charts",
    agentFile: "infra/k8s-helm.md",
    defaultSkills: [],
  },
};
