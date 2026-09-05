// Agent-facing catalog manifest, served at /manifest.json (see index.ts).
// The PureScript side mirrors this list in src/App/Catalog.purs; both are
// pinned to the same URL list by manifest.test.ts (bun test) and
// test/Test/Main.purs (spago test), so drift fails CI.

export type StoryEntry = { id: string; title: string; url: string };

export type CatalogEntry = {
  name: string;
  kind: "component" | "design-token";
  summary: string;
  url: string;
  stories: StoryEntry[];
};

export const themes = {
  colors: ["catppuccin-mocha", "tokyo-night"],
  shapes: ["rounded", "sharp"],
} as const;

export const entries: CatalogEntry[] = [
  {
    name: "Layout",
    kind: "component",
    summary: "document / shell / navBar / contentArea — page shell primitives",
    url: "/component/layout",
    stories: [
      { id: "navbar", title: "navBar", url: "/component/layout#story-navbar" },
      { id: "content-area", title: "contentArea", url: "/component/layout#story-content-area" },
      { id: "document", title: "document / shell", url: "/component/layout#story-document" },
    ],
  },
  {
    name: "Link",
    kind: "component",
    summary: "navLink — client-side navigation link",
    url: "/component/link",
    stories: [
      { id: "nav-link", title: "navLink", url: "/component/link#story-nav-link" },
    ],
  },
  {
    name: "NotFound",
    kind: "component",
    summary: "notFound — 404 view",
    url: "/component/not-found",
    stories: [
      { id: "not-found", title: "notFound", url: "/component/not-found#story-not-found" },
    ],
  },
  {
    name: "Theme",
    kind: "component",
    summary: "Theme class constants (background / text / accent / shape / composites)",
    url: "/component/theme",
    stories: [
      { id: "background", title: "Background", url: "/component/theme#story-background" },
      { id: "text", title: "Text", url: "/component/theme#story-text" },
      { id: "accent-border", title: "Accent / Border", url: "/component/theme#story-accent-border" },
      { id: "shape", title: "Shape", url: "/component/theme#story-shape" },
      { id: "composites", title: "Composites", url: "/component/theme#story-composites" },
    ],
  },
  {
    name: "Colors",
    kind: "design-token",
    summary: "Color tokens (Catppuccin Mocha / Tokyo Night)",
    url: "/tokens/color",
    stories: [
      { id: "palette", title: "Palette", url: "/tokens/color#story-palette" },
    ],
  },
  {
    name: "Radius",
    kind: "design-token",
    summary: "Radius tokens (rounded / sharp)",
    url: "/tokens/radius",
    stories: [
      { id: "scale", title: "Scale", url: "/tokens/radius#story-scale" },
    ],
  },
  {
    name: "Shadow",
    kind: "design-token",
    summary: "Shadow tokens",
    url: "/tokens/shadow",
    stories: [
      { id: "elevation", title: "Elevation", url: "/tokens/shadow#story-elevation" },
    ],
  },
];

export const manifest = { app: "ui-catalog", themes, entries } as const;
