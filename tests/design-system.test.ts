import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buttonClass } from "../components/ui/Button";
import { badgeClass } from "../components/ui/Badge";
import { alertClass } from "../components/ui/Alert";

/**
 * Guards for the design system and the public marketing surface.
 *
 * The landing page is the first thing an institution sees: it must never
 * carry invented customers, dead links or claims the product cannot defend.
 * The primitive tests pin the class contract the screens rely on.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("primitive class contract", () => {
  it("maps button variants and sizes", () => {
    expect(buttonClass("primary")).toBe("ui-btn ui-btn-primary");
    expect(buttonClass("secondary", "sm")).toBe("ui-btn ui-btn-secondary ui-btn-sm");
    expect(buttonClass("ghost")).toContain("ui-btn-ghost");
    expect(buttonClass("danger")).toContain("ui-btn-danger");
  });

  it("maps badge and alert tones", () => {
    expect(badgeClass("success")).toBe("ui-badge ui-badge-success");
    expect(badgeClass("danger")).toContain("ui-badge-danger");
    expect(alertClass("warning")).toBe("ui-alert ui-alert-warning");
    expect(alertClass("danger")).toContain("ui-alert-danger");
  });

  it("styles primitives from tokens only", () => {
    const offenders: string[] = [];
    for (const entry of readdirSync(join(root, "components", "ui"))) {
      if (!entry.endsWith(".tsx")) continue;
      if (/#[0-9a-fA-F]{3,8}\b/.test(read(join("components", "ui", entry)))) offenders.push(entry);
    }
    expect(offenders).toEqual([]);
  });

  it("defines styles for every primitive", () => {
    const css = read("app/components.css");
    for (const selector of [
      ".ui-btn", ".ui-field", ".ui-label", ".ui-control", ".ui-textarea", ".ui-badge",
      ".ui-card", ".ui-metric", ".ui-table", ".ui-alert", ".ui-empty", ".ui-skeleton",
      ".ui-dialog", ".ui-toast", ".ui-toolbar", ".ui-segmented", ".ui-form",
    ]) {
      expect(css).toContain(selector);
    }
  });
});

describe("token wiring", () => {
  it("bridges tokens into Tailwind utilities", () => {
    const tokens = read("app/tokens.css");
    expect(tokens).toContain("@theme inline");
    for (const mapping of ["--color-primary-600", "--color-ink-900", "--color-surface", "--font-sans"]) {
      expect(tokens).toContain(mapping);
    }
  });

  it("loads the component layer", () => {
    expect(read("app/globals.css")).toContain('@import "./components.css"');
  });
});

describe("landing honesty", () => {
  const landing = read("app/page.tsx");

  it("names no invented customers or figures", () => {
    const banned = [
      "240+", "Trusted by", "BRIGHTON", "ST. MARY", "RIVERSIDE", "HORIZON PREP",
      "AI ", "artificial intelligence", "14-day free trial", "No credit card required",
    ];
    for (const phrase of banned) {
      expect(landing).not.toContain(phrase);
    }
  });

  it("links only to routes and anchors that exist", () => {
    const dead: string[] = [];
    for (const match of landing.matchAll(/href="(\/[^"]*)"/g)) {
      const href = match[1];
      if (href.startsWith("/#")) continue;
      const page = join(root, "app", href, "page.tsx");
      if (!existsSync(page)) dead.push(href);
    }
    expect(dead).toEqual([]);

    for (const match of landing.matchAll(/href="(#[^"]*)"/g)) {
      expect(landing).toContain(`id="${match[1].slice(1)}"`);
    }
  });

  it("speaks in the school's own terms", () => {
    for (const term of ["session", "term", "admission", "bursar"]) {
      expect(landing.toLowerCase()).toContain(term);
    }
  });
});

describe("brand unity", () => {
  function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(join(root, dir))) {
      const rel = join(dir, entry);
      if (entry === "node_modules" || entry === ".next") continue;
      if (/\.(tsx|ts|css|md|json)$/.test(entry)) found.push(rel);
      else if (!entry.includes(".")) sources(rel, found);
    }
    return found;
  }

  it("carries the Horizons name everywhere", () => {
    const offenders: string[] = [];
    for (const file of [...sources("app"), ...sources("components"), ...sources("lib"), ...sources("docs"), ...sources("public")]) {
      if (/edumanage/i.test(read(file))) offenders.push(file);
    }
    for (const file of ["README.md", "SECURITY.md", "CONTRIBUTING.md"]) {
      if (/edumanage/i.test(read(file))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("references no missing brand assets", () => {
    // Asset URLs that would 404. The report-card generator is exempt: it
    // probes the filesystem for an optional logo and falls back to the app
    // icon, so its path is never served blind.
    const offenders: string[] = [];
    for (const file of [...sources("app"), ...sources("components"), "app/globals.css", "app/components.css"]) {
      if (file.endsWith(join("results", "[student]", "pdf", "route.ts"))) continue;
      const text = read(file);
      if (/["']\/(brand|marketing)\//.test(text) || /url\(\/(brand|marketing)\//.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe("stylesheet collapse", () => {
  const css = read("app/globals.css");

  it("keeps removed systems out of the stylesheet", () => {
    for (const selector of [
      "hero-command", "mini-stat-grid", "uploaded-brand-logo", "marketing-hero",
      "marketing-nav", "module-card", "role-section", "auth-mode-switch",
      "field-label", "student-toolbar", "student-search", "dashboard-shell",
      "command-trigger", "session-badge", "visual-story-card", "ds-display",
    ]) {
      expect(css).not.toMatch(new RegExp(`\\.${selector}(?![A-Za-z0-9_-])`));
    }
  });

  it("keeps the previous brand mark styles out", () => {
    expect(css).not.toMatch(/(?<![A-Za-z0-9_-])\.brand-logo(?![A-Za-z0-9_-])/);
  });
});
