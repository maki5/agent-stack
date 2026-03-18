/**
 * Template engine — thin Handlebars wrapper.
 *
 * Registers a small set of helpers and exposes a single `render()` function
 * that takes a template string and a context object, returning the rendered
 * string.
 */

import Handlebars from "handlebars";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * {{json value}} — pretty-prints a value as indented JSON (useful inside .hbs
 * that emit .json files).
 */
Handlebars.registerHelper("json", (value: unknown) =>
  JSON.stringify(value, null, 2)
);

/**
 * {{jsonInline value}} — single-line JSON (for embedding in arrays/objects).
 */
Handlebars.registerHelper("jsonInline", (value: unknown) =>
  JSON.stringify(value)
);

/**
 * {{#if_flag flagName profile}} … {{/if_flag}}
 * Renders the block only when profile[flagName] is truthy.
 *
 * Usage in templates:
 *   {{#if_flag "has_backend" profile}}…{{/if_flag}}
 */
Handlebars.registerHelper(
  "if_flag",
  function (
    this: unknown,
    flag: string,
    profile: Record<string, unknown>,
    options: Handlebars.HelperOptions
  ) {
    return profile[flag] ? options.fn(this) : options.inverse(this);
  }
);

/**
 * {{upper str}} — uppercases a string.
 */
Handlebars.registerHelper("upper", (str: string) =>
  typeof str === "string" ? str.toUpperCase() : str
);

/**
 * {{lower str}} — lowercases a string.
 */
Handlebars.registerHelper("lower", (str: string) =>
  typeof str === "string" ? str.toLowerCase() : str
);

/**
 * {{eq a b}} — strict equality check for use in {{#if}} blocks.
 *
 * Usage:
 *   {{#if (eq profile.model_provider "github-copilot")}}…{{/if}}
 */
Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compile and render a Handlebars template string with the given context.
 */
export function render(templateStr: string, context: unknown): string {
  const compiled = Handlebars.compile(templateStr, { noEscape: true });
  return compiled(context);
}
