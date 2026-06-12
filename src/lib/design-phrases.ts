/** Single-word design terms used as login suffixes (e.g. abdulbasit.wireframe). */
const NOUNS = [
  "wireframe", "prototype", "mockup", "layout", "grid", "pixel", "vector", "bezier",
  "pencil", "sketch", "stencil", "eraser", "marker", "brush", "ink", "pen", "chalk",
  "canvas", "artboard", "component", "variant", "token", "palette", "gradient", "shadow",
  "blur", "opacity", "contrast", "spacing", "margin", "padding", "radius", "border",
  "stroke", "fill", "layer", "frame", "group", "mask", "clip", "path", "anchor",
  "handle", "node", "curve", "line", "shape", "ellipse", "polygon", "rectangle",
  "icon", "glyph", "symbol", "badge", "chip", "tag", "label", "caption", "heading",
  "body", "display", "serif", "sans", "mono", "kerning", "leading", "tracking",
  "baseline", "capheight", "xheight", "ascender", "descender", "ligature", "swash",
  "persona", "journey", "flow", "funnel", "heatmap", "scroll", "tap", "swipe",
  "gesture", "hover", "focus", "active", "disabled", "loading", "skeleton", "shimmer",
  "toast", "modal", "drawer", "sheet", "popover", "tooltip", "dropdown", "menu",
  "navbar", "sidebar", "footer", "header", "hero", "banner", "carousel", "slider",
  "toggle", "checkbox", "radio", "input", "textarea", "select", "picker", "stepper",
  "tab", "accordion", "breadcrumb", "pagination", "avatar", "thumbnail", "gallery",
  "card", "tile", "list", "table", "chart", "graph", "metric", "dashboard", "widget",
  "insight", "feedback", "survey", "rating", "review", "comment", "thread", "inbox",
  "notification", "alert", "banner", "snackbar", "dialog", "overlay", "backdrop",
  "scrim", "portal", "stack", "queue", "deck", "board", "kanban", "timeline",
  "calendar", "agenda", "schedule", "deadline", "sprint", "backlog", "epic", "story",
  "task", "ticket", "issue", "bug", "fix", "patch", "release", "deploy", "build",
  "ship", "launch", "iterate", "pivot", "scale", "grow", "retain", "engage", "convert",
  "onboard", "signup", "login", "logout", "profile", "settings", "preference", "theme",
  "light", "dark", "mode", "contrast", "accessibility", "a11y", "wcag", "aria",
  "semantic", "atomic", "modular", "system", "library", "pattern", "template", "block",
  "snippet", "plugin", "extension", "integration", "api", "endpoint", "webhook", "sync",
  "async", "stream", "buffer", "cache", "state", "store", "context", "hook", "prop",
  "slot", "render", "mount", "unmount", "hydrate", "bundle", "chunk", "tree", "shake",
  "lint", "format", "test", "spec", "mock", "stub", "fixture", "snapshot", "coverage",
  "review", "critique", "crit", "workshop", "studio", "lab", "hub", "guild", "squad",
  "tribe", "crew", "circle", "forum", "meetup", "summit", "expo", "fair", "showcase",
  "demo", "pitch", "deck", "slide", "storyboard", "moodboard", "inspo", "reference",
  "benchmark", "audit", "heuristic", "usability", "utility", "desirability", "viability",
  "feasibility", "impact", "effort", "matrix", "quadrant", "venn", "diagram", "map",
  "sitemap", "wireflow", "userflow", "taskflow", "blueprint", "spec", "brief", "scope",
  "goal", "objective", "outcome", "metric", "northstar", "okr", "kpi", "target",
  "milestone", "checkpoint", "handoff", "deliverable", "artifact", "asset", "export",
  "import", "sync", "link", "share", "collab", "comment", "mention", "react", "resolve",
  "approve", "reject", "merge", "branch", "fork", "clone", "copy", "paste", "duplicate",
  "mirror", "flip", "rotate", "scale", "skew", "align", "distribute", "stack", "pin",
  "lock", "hide", "show", "zoom", "pan", "fit", "crop", "trim", "slice", "section",
  "auto", "manual", "smart", "fluid", "fixed", "sticky", "static", "relative", "absolute",
  "flex", "grid", "stack", "wrap", "gap", "gutter", "column", "row", "span", "offset",
  "breakpoint", "viewport", "device", "mobile", "tablet", "desktop", "watch", "tv",
  "responsive", "adaptive", "native", "hybrid", "web", "app", "pwa", "spa", "ssr",
  "isr", "edge", "cloud", "local", "offline", "online", "realtime", "live", "draft",
];

function buildDesignPhrases(): string[] {
  return [...new Set(NOUNS)];
}

export const DESIGN_PHRASES = buildDesignPhrases();

export function shufflePhrases(): string[] {
  const copy = [...DESIGN_PHRASES];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
