import { describe, expect, test } from "bun:test";
import { entries, manifest, themes } from "./manifest.ts";

// The canonical page URL list, mirrored in test/Test/Main.purs (spago test).
// Both sides pin the same list so drift between the catalog pages (PureScript)
// and the agent-facing manifest (this file) fails in CI.
const expectedUrls = [
  "/",
  "/component/layout",
  "/component/link",
  "/component/not-found",
  "/component/theme",
  "/tokens/color",
  "/tokens/radius",
  "/tokens/shadow",
];

describe("manifest", () => {
  test("lists every catalog page URL in order", () => {
    expect(["/", ...entries.map((e) => e.url)]).toEqual(expectedUrls);
  });

  test("every entry has a name, kind, summary and at least one story", () => {
    for (const entry of entries) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(["component", "design-token"]).toContain(entry.kind);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.stories.length).toBeGreaterThan(0);
    }
  });

  test("story URLs are direct URLs anchored on their entry page", () => {
    for (const entry of entries) {
      for (const story of entry.stories) {
        expect(story.url).toBe(`${entry.url}#story-${story.id}`);
        expect(story.id).toMatch(/^[a-z0-9-]+$/);
        expect(story.title.length).toBeGreaterThan(0);
      }
    }
  });

  test("story ids are unique per entry", () => {
    for (const entry of entries) {
      const ids = entry.stories.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("themes match design-tokens data-color / data-shape values", () => {
    expect(themes.colors).toEqual(["catppuccin-mocha", "tokyo-night"]);
    expect(themes.shapes).toEqual(["rounded", "sharp"]);
  });

  test("manifest top-level shape", () => {
    expect(manifest.app).toBe("ui-catalog");
    expect(manifest.themes).toBe(themes);
    expect(manifest.entries).toBe(entries);
  });
});
