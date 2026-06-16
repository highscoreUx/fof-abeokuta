#!/usr/bin/env node
/**
 * Generates static word banks for social Hangman (UI/UX topics).
 * Run: node scripts/generate-social-hangman-words.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../src/data/social-hangman/words");

const MIN_LEN = 3;
const MAX_LEN = 18;
const TARGET_PER_TOPIC = 850;

function normalize(word) {
  return word
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValid(word) {
  if (!word || word.includes(" ")) return false;
  if (word.length < MIN_LEN || word.length > MAX_LEN) return false;
  return /^[A-Z]+$/.test(word);
}

function addWords(set, items) {
  for (const raw of items) {
    const word = normalize(raw);
    if (isValid(word)) set.add(word);
  }
}

function combinePools(set, prefixes, suffixes, nouns) {
  for (const noun of nouns) {
    const n = normalize(noun);
    if (isValid(n)) set.add(n);
    for (const prefix of prefixes) {
      const combo = normalize(`${prefix}${noun}`);
      if (isValid(combo)) set.add(combo);
    }
    for (const suffix of suffixes) {
      const combo = normalize(`${noun}${suffix}`);
      if (isValid(combo)) set.add(combo);
    }
  }
  for (const a of prefixes) {
    for (const b of nouns) {
      const combo = normalize(`${a}${b}`);
      if (isValid(combo)) set.add(combo);
    }
  }
}

const TOPIC_SEEDS = {
  "design-tools": {
    nouns: [
      "FIGMA", "SKETCH", "ADOBE", "CANVA", "PIXSO", "PENPOT", "INVISION", "ZEPLIN",
      "FRAMER", "PRINCIPLE", "PROTOPIE", "MARVEL", "BALSAMIQ", "AXURE", "MOCKFLOW",
      "WHIMSICAL", "MIRO", "MURO", "MIROBOARD", "FIGJAM", "STORYBOOK", "LOTTIE",
      "RIFFLE", "PLUGIN", "WIDGET", "TOOLBAR", "CANVAS", "FRAME", "LAYER", "ARTBOARD",
      "COMPONENT", "INSTANCE", "VARIANT", "AUTO", "LAYOUT", "CONSTRAINT", "PROTOTYPE",
      "HANDOFF", "DEVMODE", "INSPECT", "EXPORT", "IMPORT", "VECTOR", "RASTER", "BITMAP",
      "STROKE", "FILL", "OPACITY", "BLEND", "MASK", "CLIP", "BOOLEAN", "UNION",
      "SUBTRACT", "INTERSECT", "EXCLUDE", "PEN", "PENCIL", "BRUSH", "ERASER",
      "EYEDROPPER", "GRADIENT", "SHADOW", "BLUR", "NOISE", "TEXTURE", "PATTERN",
      "SYMBOL", "LIBRARY", "ASSET", "STYLE", "GUIDE", "RULER", "GRID", "SNAP",
      "PIXEL", "RETINA", "SVG", "PNG", "JPEG", "WEBP", "GIF", "PDF", "EPS",
      "SKETCHCLOUD", "CREATIVE", "CLOUD", "PHOTOSHOP", "ILLUSTRATOR", "INDESIGN",
      "XD", "AFTEREFFECTS", "PREMIERE", "LIGHTROOM", "BRIDGE", "DIMENSION",
      "SUBSTANCE", "PAINTER", "DESIGNER", "STAGER", "Fresco", "CAPTURE", "SCAN",
      "ALIGN", "DISTRIBUTE", "GROUP", "UNGROUP", "FLATTEN", "MERGE", "DUPLICATE",
      "MIRROR", "ROTATE", "SCALE", "SKEW", "TRANSFORM", "ANCHOR", "HANDLE", "NODE",
      "PATH", "CURVE", "BEZIER", "SPLINE", "CORNER", "SMOOTH", "SHARP", "ROUND",
      "DASH", "ARROW", "LINE", "RECT", "ELLIPSE", "POLYGON", "STAR", "SHAPE",
      "TEXT", "TYPE", "FONT", "GLYPH", "LIGATURE", "TRACKING", "LEADING", "BASELINE",
      "ARTIFACT", "VERSION", "HISTORY", "UNDO", "REDO", "REVERT", "BRANCH", "MERGE",
      "COMMENT", "ANNOTATE", "REVIEW", "APPROVE", "SHARE", "LINK", "EMBED", "PRESENT",
      "SLIDESHOW", "DECK", "TEMPLATE", "PRESET", "SHORTCUT", "HOTKEY", "MACRO",
      "WORKSPACE", "PANEL", "DOCK", "FLOAT", "MINIMIZE", "MAXIMIZE", "ZOOM", "PAN",
      "HAND", "SELECT", "MOVE", "MARQUEE", "LASSO", "WAND", "CROP", "RESIZE",
      "SLICE", "CHOP", "TRIM", "EXTEND", "OFFSET", "OUTLINE", "SIMPLIFY", "OPTIMIZE",
      "COMPRESS", "MINIFY", "BUNDLE", "PACKAGE", "DEPLOY", "PUBLISH", "RELEASE",
      "UPDATE", "PATCH", "FIX", "BUG", "CRASH", "LAG", "FREEZE", "RENDER", "BUFFER",
    ],
    prefixes: [
      "AUTO", "SMART", "QUICK", "LIVE", "CLOUD", "LOCAL", "GLOBAL", "MINI", "MICRO",
      "SUPER", "ULTRA", "MEGA", "OPEN", "FREE", "PRO", "TEAM", "SHARED", "COLLAB",
      "REMOTE", "ASYNC", "REAL", "DARK", "LIGHT", "FLAT", "DEEP", "HIGH", "LOW",
      "MULTI", "CROSS", "INTER", "INTRA", "EXTRA", "INTRA", "OVER", "UNDER", "SUB",
      "PRE", "POST", "RE", "UN", "NON", "ANTI", "CO", "DE", "RE", "UP", "DOWN",
      "LEFT", "RIGHT", "TOP", "BOTTOM", "FRONT", "BACK", "SIDE", "EDGE", "CORE",
      "BASE", "MAIN", "AUX", "ALT", "NEW", "OLD", "NEXT", "LAST", "FIRST", "FINAL",
    ],
    suffixes: [
      "TOOL", "TOOLS", "KIT", "HUB", "LAB", "APP", "PAD", "BOX", "SET", "PACK",
      "SUITE", "STACK", "FLOW", "MODE", "VIEW", "PANEL", "BAR", "MENU", "LIST",
      "GRID", "MAP", "BOARD", "DESK", "STUDIO", "WORKS", "CRAFT", "MAKE", "BUILD",
      "EDIT", "DRAW", "PAINT", "SKETCH", "DRAFT", "PLAN", "DESIGN", "STYLE", "FORM",
      "SHAPE", "LINE", "PATH", "NODE", "LAYER", "FRAME", "PAGE", "FILE", "DOC",
      "SHEET", "SLIDE", "DECK", "NOTE", "LOG", "TAG", "MARK", "FLAG", "PIN",
      "CLIP", "CUT", "COPY", "PASTE", "LINK", "SHARE", "SYNC", "SAVE", "LOAD",
      "OPEN", "CLOSE", "LOCK", "KEY", "CODE", "DATA", "INFO", "META", "SPEC",
    ],
  },
  typography: {
    nouns: [
      "FONT", "TYPE", "TYPEFACE", "SERIF", "SANS", "SLAB", "SCRIPT", "DISPLAY",
      "MONO", "GROTESK", "GOTHIC", "HUMANIST", "GEOMETRIC", "TRANSITIONAL",
      "MODERN", "OLDSTYLE", "DIDONE", "BLACKLETTER", "HANDWRITTEN", "CALLIGRAPHY",
      "LETTERING", "GLYPH", "LIGATURE", "KERNING", "TRACKING", "LEADING", "BASELINE",
      "XHEIGHT", "ASCENDER", "DESCENDER", "COUNTER", "APERTURE", "STRESS", "AXIS",
      "STROKE", "TERMINAL", "BOWL", "EAR", "LOOP", "SPUR", "TAIL", "SERIF", "BRACKET",
      "HEAD", "ARM", "LEG", "FOOT", "SHOULDER", "LINK", "JOINT", "VERTEX", "NODE",
      "WEIGHT", "LIGHT", "REGULAR", "MEDIUM", "SEMIBOLD", "BOLD", "EXTRABOLD",
      "BLACK", "THIN", "HAIRLINE", "ULTRALIGHT", "BOOK", "ROMAN", "ITALIC", "OBLIQUE",
      "UPRIGHT", "CONDENSED", "EXPANDED", "NARROW", "WIDE", "COMPRESSED", "EXTENDED",
      "CAPS", "SMALLCAPS", "LOWERCASE", "UPPERCASE", "TITLECASE", "SENTENCE", "CASE",
      "HIERARCHY", "SCALE", "RATIO", "MODULAR", "GOLDEN", "PERFECT", "MAJOR", "MINOR",
      "THIRD", "FOURTH", "FIFTH", "SIXTH", "OCTAVE", "INTERVAL", "STEP", "RAMP",
      "DISPLAY", "HEADLINE", "TITLE", "SUBHEAD", "BODY", "CAPTION", "LABEL", "OVERLINE",
      "UNDERLINE", "STRIKE", "SUPERSCRIPT", "SUBSCRIPT", "FRACTION", "ORDINAL",
      "NUMERAL", "TABULAR", "PROPORTIONAL", "LINING", "OLSTYLE", "FIGURE", "DIGIT",
      "PUNCTUATION", "QUOTE", "APOSTROPHE", "HYPHEN", "DASH", "EMDASH", "ENDASH",
      "ELLIPSIS", "BULLET", "ASTERISK", "DAGGER", "SECTION", "PARAGRAPH", "COPYRIGHT",
      "TRADEMARK", "REGISTERED", "DEGREE", "PLUSMINUS", "MULTIPLY", "DIVIDE", "EQUAL",
      "PARAGRAPH", "INDENT", "OUTDENT", "RAG", "RIVER", "WIDOW", "ORPHAN", "HYPHENATION",
      "JUSTIFICATION", "ALIGNMENT", "CENTER", "LEFT", "RIGHT", "FLUSH", "RAGGED",
      "OPTICAL", "METRIC", "HANGING", "FIRSTLINE", "LASTLINE", "VERTICAL", "HORIZONTAL",
      "RHYTHM", "GRID", "BASELINEGRID", "CAPHEIGHT", "MEANLINE", "BEARDLINE",
      "OPEN", "SOURCE", "LICENSE", "FOUNDRY", "FAMILY", "SUPERFAMILY", "SUBFAMILY",
      "VARIABLE", "AXIS", "WIDTH", "SLANT", "OPTICALSIZE", "GRADE", "CUSTOM",
      "WEBFONT", "WOFF", "WOFF2", "TTF", "OTF", "EOT", "SUBSET", "UNICODE",
      "CHARSET", "ENCODING", "RENDER", "HINT", "ANTIALIAS", "SUBPIXEL", "CLEARTYPE",
      "SMOOTHING", "LEGIBILITY", "READABILITY", "SCAN", "GLANCE", "SKIM", "READ",
      "PAIRING", "CONTRAST", "HARMONY", "TENSION", "BALANCE", "UNITY", "VARIETY",
      "EMPHASIS", "FOCAL", "ACCENT", "NEUTRAL", "PRIMARY", "SECONDARY", "TERTIARY",
      "QUATERNARY", "QUINARY", "SENARY", "SEPTENARY", "OCTONARY", "NONARY", "DENARY",
    ],
    prefixes: [
      "TYPE", "FONT", "TEXT", "LETTER", "WORD", "LINE", "PARA", "BLOCK", "INLINE",
      "MICRO", "MACRO", "MINI", "MAXI", "SUPER", "SUB", "OVER", "UNDER", "OUT",
      "IN", "UP", "DOWN", "LEFT", "RIGHT", "TOP", "BOTTOM", "MID", "HALF", "FULL",
      "OPEN", "CLOSED", "TIGHT", "LOOSE", "WIDE", "NARROW", "THIN", "THICK", "HEAVY",
      "LIGHT", "SOFT", "HARD", "SMOOTH", "ROUGH", "CLEAN", "DIRTY", "PURE", "MIXED",
      "TRUE", "FALSE", "REAL", "FAKE", "OLD", "NEW", "MODERN", "CLASSIC", "VINTAGE",
      "RETRO", "FUTURE", "DIGITAL", "ANALOG", "PRINT", "SCREEN", "WEB", "MOBILE",
    ],
    suffixes: [
      "FACE", "FONT", "TYPE", "STYLE", "SET", "KIT", "PACK", "SCALE", "RAMP", "GRID",
      "LINE", "RULE", "GUIDE", "MARK", "TAG", "LABEL", "CAP", "CASE", "FORM", "SIZE",
      "WEIGHT", "WIDTH", "HEIGHT", "DEPTH", "SPACE", "GAP", "PAD", "MARGIN", "EDGE",
      "RIM", "CORE", "BASE", "TOP", "TIP", "END", "START", "STOP", "FLOW", "RHYTHM",
      "BEAT", "PULSE", "WAVE", "CURVE", "ARC", "BEND", "TURN", "TWIST", "SPIN",
      "PAIR", "MATCH", "MIX", "BLEND", "FUSE", "MERGE", "SPLIT", "CUT", "TRIM",
      "FIT", "FILL", "STRETCH", "SQUEEZE", "GROW", "SHRINK", "EXPAND", "COLLAPSE",
    ],
  },
  "color-visual": {
    nouns: [
      "COLOR", "HUE", "TINT", "SHADE", "TONE", "CHROMA", "SATURATION", "VALUE",
      "LIGHTNESS", "BRIGHTNESS", "LUMINANCE", "LUMINOSITY", "INTENSITY", "PURITY",
      "VIBRANCE", "MUTED", "PALE", "DEEP", "RICH", "WARM", "COOL", "NEUTRAL",
      "PRIMARY", "SECONDARY", "TERTIARY", "COMPLEMENT", "ANALOG", "TRIAD", "TETRAD",
      "SPLIT", "MONO", "CHROME", "ACHROMATIC", "POLYCHROME", "SPECTRUM", "RAINBOW",
      "GRADIENT", "OMBR", "FADE", "BLEND", "MIX", "OVERLAY", "MULTIPLY", "SCREEN",
      "DODGE", "BURN", "SOFTLIGHT", "HARDLIGHT", "DIFFERENCE", "EXCLUSION", "HUE",
      "SATURATE", "DESATURATE", "GRAYSCALE", "SEPIA", "INVERT", "POSTERIZE", "THRESHOLD",
      "CURVE", "LEVEL", "BALANCE", "EXPOSURE", "CONTRAST", "GAMMA", "HIGHLIGHT",
      "SHADOW", "MIDTONE", "WHITES", "BLACKS", "CLARITY", "VIBRANCE", "TEMPERATURE",
      "WARMTH", "TINT", "CAST", "FILTER", "LUT", "PROFILE", "SPACE", "GAMUT",
      "SRGB", "ADOBE", "RGB", "DISPLAY", "PTHREE", "REC", "CMYK", "LAB", "HSB",
      "HSL", "HSV", "OKLCH", "OKLAB", "HEX", "RGBA", "HSLA", "ARGB", "CHANNEL",
      "ALPHA", "OPACITY", "TRANSPARENCY", "OPAQUE", "TRANSLUCENT", "GLASS", "FROST",
      "BLUR", "GLOW", "HALO", "RIM", "EDGE", "OUTLINE", "STROKE", "FILL", "SOLID",
      "PATTERN", "TEXTURE", "NOISE", "GRAIN", "DOTS", "STRIPES", "CHECKER", "GRID",
      "MESH", "RADIAL", "LINEAR", "ANGULAR", "DIAMOND", "REFLECTED", "REPEATING",
      "PALETTE", "SWATCH", "BOOK", "WHEEL", "PICKER", "EYEDROPPER", "SAMPLER",
      "THEME", "SCHEME", "SYSTEM", "TOKEN", "VARIABLE", "SEMANTIC", "PRIMITIVE",
      "BRAND", "ACCENT", "SURFACE", "BACKGROUND", "FOREGROUND", "BORDER", "DIVIDER",
      "ELEVATION", "SHADOW", "OVERLAY", "SCRIM", "VEIL", "MIST", "FOG", "SMOKE",
      "DUST", "SPARK", "FLARE", "BLOOM", "LENS", "CHROMATIC", "ABERRATION", "VIGNETTE",
      "FLAT", "MATERIAL", "GLOSS", "MATTE", "SATIN", "METAL", "PLASTIC", "WOOD",
      "STONE", "FABRIC", "LEATHER", "PAPER", "INK", "PAINT", "PIGMENT", "DYE",
      "LIGHT", "DARK", "MODE", "THEME", "INVERT", "CONTRAST", "HIGH", "LOW",
      "ACCESSIBLE", "LEGIBLE", "VISIBLE", "HIDDEN", "SUBTLE", "BOLD", "LOUD", "QUIET",
      "HARMONY", "TENSION", "BALANCE", "UNITY", "VARIETY", "RHYTHM", "EMPHASIS",
      "FOCAL", "DOMINANT", "SUBORDINATE", "ACCENT", "NEUTRAL", "EARTH", "PASTEL",
      "NEON", "FLUORESCENT", "METALLIC", "IRIDESCENT", "HOLOGRAPHIC", "GRADIENT",
    ],
    prefixes: [
      "COLOR", "CHROMA", "HUE", "TINT", "SHADE", "TONE", "LIGHT", "DARK", "MID",
      "HIGH", "LOW", "SOFT", "HARD", "WARM", "COOL", "HOT", "COLD", "DEEP", "PALE",
      "RICH", "MUTED", "VIVID", "DULL", "BRIGHT", "DIM", "FLAT", "GLOSS", "MATTE",
      "TRUE", "FALSE", "PURE", "MIXED", "BLENDED", "FADED", "WASHED", "SATURATED",
      "DESAT", "OVER", "UNDER", "MULTI", "MONO", "DUO", "TRI", "TETRA", "POLY",
      "NEO", "RETRO", "VINTAGE", "MODERN", "CLASSIC", "BOLD", "SUBTLE", "LOUD",
    ],
    suffixes: [
      "COLOR", "HUE", "TINT", "SHADE", "TONE", "WASH", "CAST", "GLOW", "HALO",
      "RIM", "EDGE", "LINE", "BAND", "RING", "DISC", "SPOT", "BLOB", "BLOCK",
      "FIELD", "PLANE", "LAYER", "MASK", "FILTER", "MODE", "SPACE", "WHEEL",
      "BOOK", "SET", "KIT", "PACK", "THEME", "SCHEME", "SYSTEM", "TOKEN", "KEY",
      "MAP", "CHART", "GRAPH", "SCALE", "RAMP", "STEP", "STOP", "POINT", "NODE",
      "ZONE", "AREA", "REGION", "SECTOR", "QUAD", "TRI", "PAIR", "MATCH", "BLEND",
    ],
  },
  "layout-grids": {
    nouns: [
      "LAYOUT", "GRID", "COLUMN", "ROW", "GUTTER", "MARGIN", "PADDING", "SPACING",
      "GAP", "STACK", "FLOW", "FLEX", "BOX", "CONTAINER", "WRAPPER", "SECTION",
      "REGION", "ZONE", "AREA", "BLOCK", "INLINE", "FLOAT", "CLEAR", "POSITION",
      "ABSOLUTE", "RELATIVE", "FIXED", "STICKY", "STATIC", "INSET", "OFFSET",
      "TOP", "RIGHT", "BOTTOM", "LEFT", "CENTER", "MIDDLE", "BASELINE", "EDGE",
      "ALIGN", "JUSTIFY", "DISTRIBUTE", "STRETCH", "SHRINK", "GROW", "BASIS",
      "WRAP", "NOWRAP", "REVERSE", "DIRECTION", "ORDER", "RANK", "PRIORITY",
      "HIERARCHY", "NEST", "DEPTH", "LEVEL", "TIER", "LAYER", "PLANE", "SURFACE",
      "FRAME", "ARTBOARD", "PAGE", "SCREEN", "VIEWPORT", "CANVAS", "STAGE",
      "BREAKPOINT", "QUERY", "MEDIA", "RESPONSIVE", "ADAPTIVE", "FLUID", "ELASTIC",
      "FIXED", "HYBRID", "MOBILE", "TABLET", "DESKTOP", "WIDE", "ULTRAWIDE",
      "PORTRAIT", "LANDSCAPE", "ORIENTATION", "ASPECT", "RATIO", "GOLDEN", "SQUARE",
      "WIDESCREEN", "CINEMA", "PHOTO", "STANDARD", "CUSTOM", "SAFE", "BLEED",
      "TRIM", "CROP", "MARGIN", "BINDING", "FOLD", "CREASE", "SPINE", "GUTTER",
      "MODULAR", "BASELINE", "VERTICAL", "HORIZONTAL", "DENSE", "LOOSE", "TIGHT",
      "RHYTHM", "BEAT", "UNIT", "MODULE", "SPAN", "TRACK", "LINE", "RULE",
      "GUIDE", "SNAP", "LOCK", "PIN", "ANCHOR", "ORIGIN", "PIVOT", "AXIS",
      "MIRROR", "FLIP", "ROTATE", "SCALE", "SKEW", "TRANSFORM", "TRANSLATE",
      "COMPOSITION", "BALANCE", "SYMMETRY", "ASYMMETRY", "TENSION", "UNITY",
      "PROXIMITY", "SIMILARITY", "CONTINUITY", "CLOSURE", "FIGURE", "GROUND",
      "NEGATIVE", "POSITIVE", "SPACE", "WHITESPACE", "BREATHING", "ROOM", "CRAMP",
      "DENSITY", "SPARSE", "PACKED", "CROWDED", "EMPTY", "FULL", "PARTIAL",
      "OVERLAP", "STACK", "LAYER", "DEPTH", "ZINDEX", "ELEVATION", "SHADOW",
      "CARD", "PANEL", "TILE", "CELL", "SLOT", "POCKET", "NICHE", "ALCOVE",
      "HEADER", "FOOTER", "SIDEBAR", "MAIN", "ASIDE", "NAV", "CONTENT", "HERO",
      "BANNER", "STRIP", "BAR", "RAIL", "DOCK", "TRAY", "SHELF", "LEDGE",
      "SPLIT", "PANE", "WINDOW", "DIALOG", "MODAL", "DRAWER", "SHEET", "OVERLAY",
      "MASONRY", "WATERFALL", "CASCADE", "STAGGER", "OFFSET", "ALTERNATE", "ZIGZAG",
    ],
    prefixes: [
      "GRID", "FLEX", "AUTO", "FIXED", "FLUID", "RESPONSIVE", "ADAPTIVE", "MOBILE",
      "DESKTOP", "WIDE", "NARROW", "TALL", "SHORT", "DEEP", "SHALLOW", "TIGHT",
      "LOOSE", "DENSE", "SPARSE", "FULL", "HALF", "THIRD", "QUARTER", "DUAL",
      "TRI", "QUAD", "MULTI", "CROSS", "INLINE", "BLOCK", "STACK", "FLOW",
      "VERTICAL", "HORIZONTAL", "DIAGONAL", "RADIAL", "CONCENTRIC", "NESTED",
      "INNER", "OUTER", "TOP", "BOTTOM", "LEFT", "RIGHT", "CENTER", "EDGE",
    ],
    suffixes: [
      "GRID", "LAYOUT", "FLOW", "STACK", "BOX", "WRAP", "ROW", "COL", "CELL",
      "UNIT", "MODULE", "BLOCK", "ZONE", "AREA", "REGION", "FRAME", "PANEL",
      "SLOT", "GAP", "GUTTER", "MARGIN", "PAD", "SPACE", "RHYTHM", "BEAT",
      "LINE", "RULE", "GUIDE", "TRACK", "SPAN", "TIER", "LEVEL", "LAYER",
      "PLANE", "SURFACE", "STAGE", "VIEW", "PORT", "SCREEN", "PAGE", "SHEET",
    ],
  },
  "ux-research": {
    nouns: [
      "RESEARCH", "STUDY", "INQUIRY", "DISCOVERY", "EXPLORATION", "INVESTIGATION",
      "ANALYSIS", "SYNTHESIS", "INSIGHT", "FINDING", "OBSERVATION", "EVIDENCE",
      "DATA", "METRIC", "SIGNAL", "PATTERN", "TREND", "THEME", "CODE", "TAG",
      "PERSONA", "ARCHETYPE", "PROFILE", "SEGMENT", "COHORT", "AUDIENCE", "USER",
      "CUSTOMER", "STAKEHOLDER", "SPONSOR", "CHAMPION", "ADVOCATE", "DETRACTOR",
      "JOURNEY", "MAP", "STORY", "NARRATIVE", "SCENARIO", "USECASE", "TASK",
      "GOAL", "NEED", "WANT", "PAIN", "GAIN", "BARRIER", "DRIVER", "MOTIVATION",
      "INTENT", "BEHAVIOR", "HABIT", "ROUTINE", "RITUAL", "CONTEXT", "ENVIRONMENT",
      "SITUATION", "MOMENT", "TOUCHPOINT", "CHANNEL", "MEDIUM", "DEVICE", "PLATFORM",
      "INTERVIEW", "SURVEY", "QUESTIONNAIRE", "POLL", "FOCUS", "GROUP", "WORKSHOP",
      "SESSION", "LAB", "FIELD", "SITE", "VISIT", "SHADOW", "OBSERVE", "ETHNOGRAPHY",
      "DIARY", "JOURNAL", "LOG", "RECORD", "NOTE", "TRANSCRIPT", "QUOTE", "CLIP",
      "RECORDING", "VIDEO", "AUDIO", "SCREEN", "CAPTURE", "HEATMAP", "SCROLLMAP",
      "CLICKMAP", "FUNNEL", "PATH", "FLOW", "DROP", "OFF", "CONVERSION", "RETENTION",
      "ENGAGEMENT", "SATISFACTION", "NPS", "CSAT", "CES", "SUS", "SEQ", "UMUX",
      "USABILITY", "TEST", "MODERATED", "UNMODERATED", "REMOTE", "INPERSON", "GUERRILLA",
      "HALLWAY", "BENCHMARK", "COMPETITIVE", "AUDIT", "HEURISTIC", "EVALUATION",
      "EXPERT", "REVIEW", "WALKTHROUGH", "COGNITIVE", "WALKTHROUGH", "THINK", "ALOUD",
      "PROTOCOL", "SCRIPT", "GUIDE", "PLAN", "RECRUIT", "SCREENER", "INCENTIVE",
      "CONSENT", "PRIVACY", "ANONYMITY", "CONFIDENTIAL", "ETHICS", "BIAS", "SAMPLE",
      "SIZE", "POWER", "VALIDITY", "RELIABILITY", "TRIANGULATION", "MIXED", "METHOD",
      "QUALITATIVE", "QUANTITATIVE", "HYPOTHESIS", "ASSUMPTION", "RISK", "OPPORTUNITY",
      "PROBLEM", "STATEMENT", "CHALLENGE", "QUESTION", "OBJECTIVE", "OUTCOME",
      "DELIVERABLE", "REPORT", "DECK", "PRESENTATION", "READOUT", "SHAREOUT",
      "AFFINITY", "CLUSTER", "GROUP", "SORT", "PRIORITIZE", "MATRIX", "IMPACT",
      "EFFORT", "RICE", "MOSCOW", "KANO", "DELIGHT", "BASIC", "PERFORMANCE",
      "EMPATHY", "MAP", "SAY", "THINK", "DO", "FEEL", "PAIN", "GAIN", "JOB",
      "TODO", "BE", "HIRED", "OUTCOME", "SERVICE", "BLUEPRINT", "FRONT", "BACK",
      "STAGE", "LAYER", "EVIDENCE", "OPPORTUNITY", "IDEA", "CONCEPT", "PROTOTYPE",
    ],
    prefixes: [
      "USER", "CUSTOMER", "UX", "UI", "PRODUCT", "SERVICE", "DESIGN", "RESEARCH",
      "FIELD", "REMOTE", "ONLINE", "OFFLINE", "LIVE", "ASYNC", "QUICK", "DEEP",
      "LIGHT", "HEAVY", "EARLY", "LATE", "PRE", "POST", "MID", "IN", "OUT",
      "CROSS", "MULTI", "SINGLE", "DOUBLE", "TRIPLE", "OPEN", "CLOSED", "GUIDED",
      "STRUCTURED", "UNSTRUCTURED", "FORMAL", "INFORMAL", "QUAL", "QUANT", "MIXED",
    ],
    suffixes: [
      "RESEARCH", "STUDY", "TEST", "INTERVIEW", "SURVEY", "SESSION", "WORKSHOP",
      "LAB", "VISIT", "TRIP", "TOUR", "WALK", "TALK", "NOTE", "LOG", "DATA",
      "INSIGHT", "FINDING", "REPORT", "DECK", "MAP", "PLAN", "GOAL", "TASK",
      "FLOW", "PATH", "FUNNEL", "METRIC", "SCORE", "RATING", "RANK", "LIST",
      "BOARD", "WALL", "GRID", "CHART", "GRAPH", "MODEL", "FRAME", "LENS",
    ],
  },
  "interaction-design": {
    nouns: [
      "INTERACTION", "BEHAVIOR", "RESPONSE", "FEEDBACK", "STATE", "MODE", "CONTEXT",
      "TRIGGER", "ACTION", "REACTION", "EVENT", "SIGNAL", "INPUT", "OUTPUT",
      "GESTURE", "TAP", "PRESS", "HOLD", "DRAG", "DROP", "SWIPE", "FLICK",
      "PINCH", "ZOOM", "ROTATE", "SHAKE", "TILT", "SCROLL", "FLING", "LONGPRESS",
      "DOUBLETAP", "MULTITOUCH", "HOVER", "FOCUS", "BLUR", "SELECT", "DESELECT",
      "TOGGLE", "SWITCH", "SLIDER", "DIAL", "KNOB", "BUTTON", "LINK", "TAB",
      "MENU", "DROPDOWN", "COMBO", "PICKER", "SELECTOR", "CHOOSER", "RADIO",
      "CHECKBOX", "TOGGLE", "STEPPER", "SPINNER", "PROGRESS", "LOADER", "SKELETON",
      "PLACEHOLDER", "EMPTY", "ERROR", "SUCCESS", "WARNING", "INFO", "ALERT",
      "TOAST", "SNACKBAR", "BANNER", "MODAL", "DIALOG", "SHEET", "DRAWER", "POPOVER",
      "TOOLTIP", "HINT", "HELP", "ONBOARD", "TOUR", "COACH", "MARK", "SPOTLIGHT",
      "AFFORDANCE", "SIGNIFIER", "MAPPING", "CONSTRAINT", "CONVENTION", "METAPHOR",
      "MENTAL", "MODEL", "EXPECTATION", "PREDICTION", "SURPRISE", "DELIGHT",
      "FRICTION", "FRICTIONLESS", "SEAMLESS", "SMOOTH", "SNAPPY", "RESPONSIVE",
      "LAG", "LATENCY", "DELAY", "DEBOUNCE", "THROTTLE", "QUEUE", "BUFFER",
      "FLOW", "FUNNEL", "PATH", "JOURNEY", "STEP", "STAGE", "PHASE", "GATE",
      "CHECKPOINT", "MILESTONE", "BRANCH", "FORK", "LOOP", "CYCLE", "RECUR",
      "REPEAT", "RETURN", "BACK", "FORWARD", "NEXT", "PREV", "SKIP", "CANCEL",
      "CONFIRM", "SUBMIT", "SAVE", "DISCARD", "UNDO", "REDO", "RESET", "CLEAR",
      "MICRO", "MACRO", "MINI", "MEGA", "TRANSITION", "ANIMATION", "MOTION",
      "EASING", "DURATION", "DELAY", "STAGGER", "SEQUENCE", "PARALLEL", "CHAIN",
      "SPRING", "BOUNCE", "ELASTIC", "LINEAR", "EASE", "CURVE", "BEZIER",
      "HAPTIC", "AUDIO", "VISUAL", "TACTILE", "KINESTHETIC", "MULTIMODAL",
      "VOICE", "SPEECH", "GESTURAL", "OCULAR", "GAZE", "EYE", "TRACK",
      "KEYBOARD", "MOUSE", "TRACKPAD", "STYLUS", "PEN", "GAMEPAD", "REMOTE",
      "ACCESSIBLE", "INCLUSIVE", "UNIVERSAL", "ADAPTIVE", "PERSONALIZED",
    ],
    prefixes: [
      "INTER", "MICRO", "MACRO", "MINI", "MEGA", "SUPER", "HYPER", "ULTRA", "MULTI",
      "CROSS", "TOUCH", "CLICK", "TAP", "HOVER", "FOCUS", "ACTIVE", "INACTIVE",
      "DISABLED", "ENABLED", "LOADING", "PENDING", "ERROR", "SUCCESS", "WARNING",
      "PRIMARY", "SECONDARY", "TERTIARY", "GHOST", "SOFT", "HARD", "SMOOTH",
      "SNAPPY", "QUICK", "SLOW", "FAST", "INSTANT", "DELAYED", "ASYNC", "SYNC",
    ],
    suffixes: [
      "ACTION", "STATE", "MODE", "FLOW", "PATH", "STEP", "STAGE", "PHASE", "GATE",
      "EVENT", "TRIGGER", "HANDLER", "CALLBACK", "HOOK", "LOOP", "CYCLE", "CHAIN",
      "QUEUE", "STACK", "BUFFER", "FEED", "STREAM", "PIPE", "CHANNEL", "LINK",
      "NODE", "EDGE", "POINT", "ZONE", "AREA", "FIELD", "INPUT", "OUTPUT", "PORT",
    ],
  },
  "design-systems": {
    nouns: [
      "SYSTEM", "LIBRARY", "KIT", "GUIDE", "HANDBOOK", "MANUAL", "DOCS", "REFERENCE",
      "TOKEN", "VARIABLE", "CONSTANT", "PRIMITIVE", "SEMANTIC", "ALIAS", "THEME",
      "COMPONENT", "PATTERN", "TEMPLATE", "BLOCK", "MODULE", "ORGANISM", "ATOM",
      "MOLECULE", "ELEMENT", "PART", "PIECE", "UNIT", "MODULE", "PACKAGE",
      "VARIANT", "STATE", "PROP", "SLOT", "INSTANCE", "COMPOSITION", "NESTING",
      "BUTTON", "INPUT", "FIELD", "LABEL", "HINT", "ERROR", "FORM", "SELECT",
      "CHECKBOX", "RADIO", "TOGGLE", "SWITCH", "SLIDER", "STEPPER", "TABS",
      "ACCORDION", "CARD", "PANEL", "MODAL", "DIALOG", "DRAWER", "SHEET", "TOAST",
      "BADGE", "CHIP", "TAG", "PILL", "AVATAR", "ICON", "LOGO", "MARK", "SYMBOL",
      "NAV", "MENU", "BREADCRUMB", "PAGINATION", "TABLE", "LIST", "GRID", "TREE",
      "CHART", "GRAPH", "MAP", "CALENDAR", "DATE", "TIME", "PICKER", "UPLOAD",
      "PROGRESS", "SPINNER", "SKELETON", "EMPTY", "PLACEHOLDER", "DIVIDER",
      "SEPARATOR", "SPACER", "STACK", "CLUSTER", "INLINE", "GRID", "FLEX",
      "TYPOGRAPHY", "COLOR", "SPACING", "RADIUS", "SHADOW", "BORDER", "OPACITY",
      "MOTION", "DURATION", "EASING", "BREAKPOINT", "ZINDEX", "ELEVATION",
      "DENSITY", "SIZE", "SCALE", "RATIO", "GRID", "COLUMN", "GUTTER", "MARGIN",
      "PADDING", "GAP", "INSET", "OUTLINE", "RING", "FOCUS", "HOVER", "ACTIVE",
      "DISABLED", "READONLY", "INVALID", "VALID", "REQUIRED", "OPTIONAL",
      "PRIMARY", "SECONDARY", "TERTIARY", "ACCENT", "NEUTRAL", "BRAND", "SUCCESS",
      "WARNING", "ERROR", "INFO", "SURFACE", "BACKGROUND", "FOREGROUND", "OVERLAY",
      "DOCUMENTATION", "STORY", "EXAMPLE", "PLAYGROUND", "SANDBOX", "DEMO",
      "SPEC", "ANATOMY", "USAGE", "GUIDELINE", "RULE", "PRINCIPLE", "PATTERN",
      "ANTI", "PATTERN", "DO", "DONT", "BEST", "PRACTICE", "CHECKLIST", "AUDIT",
      "GOVERNANCE", "VERSION", "RELEASE", "CHANGELOG", "MIGRATION", "DEPRECATION",
      "ADOPTION", "CONTRIBUTION", "REVIEW", "APPROVAL", "WORKFLOW", "PIPELINE",
      "FIGMA", "STORYBOOK", "CHROMATIC", "ZEROHEIGHT", "SUPERNOVA", "KNOCKOUT",
    ],
    prefixes: [
      "DESIGN", "UI", "UX", "PRODUCT", "BRAND", "GLOBAL", "LOCAL", "SHARED",
      "CORE", "BASE", "MAIN", "AUX", "ALT", "NEW", "LEGACY", "DEPRECATED",
      "STABLE", "BETA", "ALPHA", "DRAFT", "FINAL", "LIVE", "DEV", "PROD",
      "LIGHT", "DARK", "HIGH", "LOW", "COMPACT", "COMFORTABLE", "SPACIOUS",
      "MINIMAL", "RICH", "FLAT", "ELEVATED", "OUTLINED", "FILLED", "GHOST",
    ],
    suffixes: [
      "SYSTEM", "LIBRARY", "KIT", "GUIDE", "TOKEN", "THEME", "STYLE", "SPEC",
      "DOC", "STORY", "EXAMPLE", "VARIANT", "STATE", "PROP", "SLOT", "PART",
      "SET", "PACK", "GROUP", "FAMILY", "SCALE", "RAMP", "GRID", "UNIT",
      "RULE", "PATTERN", "TEMPLATE", "BLOCK", "MODULE", "COMPONENT", "ATOM",
    ],
  },
  accessibility: {
    nouns: [
      "ACCESS", "ACCESSIBLE", "INCLUSIVE", "UNIVERSAL", "EQUITY", "FAIR", "EQUAL",
      "WCAG", "ARIA", "SECTION", "ADA", "A11Y", "UX", "USABILITY", "LEGIBILITY",
      "READABILITY", "PERCEIVABLE", "OPERABLE", "UNDERSTANDABLE", "ROBUST",
      "CONTRAST", "RATIO", "LUMINANCE", "COLORBLIND", "DEUTERANOPIA", "PROTANOPIA",
      "TRITANOPIA", "ACHROMATOPSIA", "SIMULATION", "CHECKER", "AUDIT", "SCAN",
      "SCREEN", "READER", "VOICEOVER", "TALKBACK", "NVDA", "JAWS", "ORCA",
      "BRAILLE", "DISPLAY", "MAGNIFIER", "ZOOM", "LARGE", "TEXT", "SCALING",
      "REFLOW", "RESPONSIVE", "ZOOM", "PINCH", "FONT", "SIZE", "LINE", "HEIGHT",
      "SPACING", "LETTER", "WORD", "PARAGRAPH", "FOCUS", "VISIBLE", "INDICATOR",
      "RING", "OUTLINE", "SKIP", "LINK", "LANDMARK", "REGION", "ROLE", "LABEL",
      "DESCRIPTION", "HINT", "ERROR", "LIVE", "REGION", "ALERT", "STATUS",
      "ANNOUNCE", "POLITE", "ASSERTIVE", "TAB", "ORDER", "TRAP", "ESCAPE",
      "KEYBOARD", "NAVIGATION", "SHORTCUT", "HOTKEY", "ACCESS", "KEY", "MODIFIER",
      "ALT", "CTRL", "SHIFT", "META", "ENTER", "SPACE", "ARROW", "HOME", "END",
      "PAGE", "UP", "DOWN", "TABINDEX", "ROVING", "FOCUS", "MANAGEMENT",
      "SEMANTIC", "HTML", "HEADING", "LIST", "TABLE", "FORM", "BUTTON", "LINK",
      "IMAGE", "ALT", "TEXT", "DECORATIVE", "INFORMATIVE", "FUNCTIONAL",
      "CAPTION", "SUBTITLE", "TRANSCRIPT", "AUDIO", "DESCRIPTION", "SIGN",
      "LANGUAGE", "INTERPRETER", "MOTOR", "DEXTERITY", "TREMOR", "PARALYSIS",
      "SWITCH", "CONTROL", "VOICE", "CONTROL", "EYE", "TRACK", "HEAD", "POINTER",
      "COGNITIVE", "MEMORY", "ATTENTION", "DYSLEXIA", "ADHD", "AUTISM", "ANXIETY",
      "SIMPLE", "LANGUAGE", "PLAIN", "CLEAR", "CONSISTENT", "PREDICTABLE",
      "FORGIVING", "REVERSIBLE", "CONFIRM", "TIMEOUT", "EXTEND", "PAUSE", "STOP",
      "REDUCE", "MOTION", "PREFERS", "REDUCED", "TRANSPARENCY", "CONTRAST",
      "DARK", "MODE", "LIGHT", "MODE", "HIGH", "CONTRAST", "FORCED", "COLORS",
      "AUDIT", "CHECKLIST", "HEURISTIC", "TEST", "USER", "EXPERT", "REVIEW",
      "COMPLIANCE", "LEVEL", "AAA", "AA", "A", "FAIL", "PASS", "WARNING",
    ],
    prefixes: [
      "ACCESS", "ASSIST", "SCREEN", "VOICE", "KEY", "FOCUS", "HIGH", "LOW",
      "LARGE", "SMALL", "REDUCED", "ENHANCED", "FORCED", "AUTO", "MANUAL",
      "VISIBLE", "HIDDEN", "SKIP", "LIVE", "POLITE", "ASSERT", "SEMANTIC",
      "INCLUSIVE", "UNIVERSAL", "EQUAL", "FAIR", "OPEN", "CLOSED", "SAFE",
    ],
    suffixes: [
      "ACCESS", "MODE", "LABEL", "TEXT", "HINT", "ROLE", "STATE", "TRAP",
      "ORDER", "RING", "ZONE", "REGION", "LANDMARK", "LINK", "SKIP", "NAV",
      "PATH", "FLOW", "CHECK", "AUDIT", "TEST", "SCAN", "TOOL", "GUIDE",
    ],
  },
  prototyping: {
    nouns: [
      "PROTOTYPE", "MOCKUP", "WIREFRAME", "SKETCH", "DRAFT", "ROUGH", "POLISH",
      "FI", "LOWFI", "MIDFI", "HIGHFI", "PAPER", "DIGITAL", "CLICKABLE",
      "INTERACTIVE", "STATIC", "ANIMATED", "CODED", "NATIVE", "HYBRID",
      "CONCEPT", "EXPLORATION", "VALIDATION", "TEST", "PILOT", "MVP", "POC",
      "DEMO", "PITCH", "DECK", "STORY", "FLOW", "SCREEN", "STATE", "VARIANT",
      "SCENARIO", "USECASE", "TASK", "PATH", "HAPPY", "EDGE", "ERROR", "EMPTY",
      "LOADING", "SUCCESS", "FAILURE", "RETRY", "TIMEOUT", "OFFLINE", "ONLINE",
      "FRAME", "ARTBOARD", "PAGE", "SCENE", "STAGE", "LAYER", "GROUP", "COMPONENT",
      "INSTANCE", "OVERRIDE", "LINK", "HOTSPOT", "TARGET", "DESTINATION", "BACK",
      "OVERLAY", "MODAL", "SHEET", "DRAWER", "TRANSITION", "ANIMATION", "MOTION",
      "SMART", "ANIMATE", "SCROLL", "DRAG", "GESTURE", "TIMING", "EASING",
      "TRIGGER", "ACTION", "CONDITION", "VARIABLE", "EXPRESSION", "FORMULA",
      "USER", "TEST", "MODERATED", "UNMODERATED", "REMOTE", "INPERSON", "A", "B",
      "COMPARISON", "PREFERENCE", "FIRST", "CLICK", "FIVE", "SECOND", "SUS",
      "FEEDBACK", "NOTE", "COMMENT", "ANNOTATION", "MARKUP", "REVIEW", "APPROVE",
      "ITERATE", "REVISE", "REFINE", "POLISH", "SHIP", "HANDOFF", "SPEC", "REDLINE",
      "ASSET", "EXPORT", "SLICE", "MARK", "GRID", "GUIDE", "RULER", "SNAP",
      "VERSION", "BRANCH", "MERGE", "HISTORY", "COMPARE", "DIFF", "RESTORE",
      "TEMPLATE", "DUPLICATE", "CLONE", "SHARE", "PRESENT", "PREVIEW", "PLAY",
      "RECORD", "VIDEO", "GIF", "LOOM", "WALKTHROUGH", "TOUR", "DEMO", "SCRIPT",
    ],
    prefixes: [
      "LOW", "MID", "HIGH", "ULTRA", "QUICK", "RAPID", "DIRTY", "CLEAN", "ROUGH",
      "POLISH", "FINAL", "DRAFT", "BETA", "ALPHA", "LIVE", "STATIC", "CLICK",
      "INTER", "MICRO", "MACRO", "PAPER", "DIGITAL", "CODED", "NATIVE", "HYBRID",
      "MOBILE", "DESKTOP", "WEB", "APP", "GAME", "VOICE", "AR", "VR", "XR",
    ],
    suffixes: [
      "TYPE", "FRAME", "FLOW", "MAP", "TEST", "DEMO", "DECK", "SPEC", "DOC",
      "KIT", "SET", "PACK", "TOOL", "LAB", "HUB", "VIEW", "MODE", "STATE",
      "LINK", "HOTSPOT", "TARGET", "PATH", "STEP", "STAGE", "SCENE", "SHOT",
    ],
  },
  "mobile-responsive": {
    nouns: [
      "MOBILE", "TABLET", "DESKTOP", "WATCH", "WEARABLE", "TV", "CAR", "KIOSK",
      "RESPONSIVE", "ADAPTIVE", "FLUID", "ELASTIC", "FIXED", "HYBRID", "NATIVE",
      "WEB", "HYBRID", "PWA", "APP", "CLIP", "WIDGET", "EXTENSION", "PLUGIN",
      "SCREEN", "VIEWPORT", "SAFE", "AREA", "NOTCH", "ISLAND", "DYNAMIC", "ISLAND",
      "STATUS", "BAR", "NAV", "BAR", "TAB", "BAR", "TOOL", "BAR", "HOME", "INDICATOR",
      "GESTURE", "NAV", "EDGE", "SWIPE", "BACK", "PULL", "REFRESH", "INFINITE",
      "SCROLL", "PARALLAX", "STICKY", "FIXED", "COLLAPSING", "EXPANDING", "HEADER",
      "BOTTOM", "SHEET", "DRAWER", "MODAL", "FULLSCREEN", "SPLIT", "VIEW", "MASTER",
      "DETAIL", "CAROUSEL", "PAGER", "SWIPER", "CARD", "STACK", "LIST", "GRID",
      "MASONRY", "WATERFALL", "STAGGER", "COMPACT", "COMFORTABLE", "SPACIOUS",
      "DENSITY", "TOUCH", "TARGET", "TAP", "HIT", "AREA", "THUMB", "ZONE", "REACH",
      "ONE", "HANDED", "TWO", "HANDED", "LEFT", "RIGHT", "HAND", "ORIENTATION",
      "PORTRAIT", "LANDSCAPE", "ROTATION", "LOCK", "UNLOCK", "BREAKPOINT", "QUERY",
      "MEDIA", "MIN", "WIDTH", "MAX", "HEIGHT", "ASPECT", "RATIO", "DPR", "PIXEL",
      "RETINA", "SCALING", "ZOOM", "PINCH", "FONT", "SIZE", "REM", "EM", "VW", "VH",
      "PERCENT", "FLEX", "GRID", "STACK", "INLINE", "BLOCK", "FLOAT", "CLEAR",
      "OVERFLOW", "SCROLL", "HIDDEN", "CLIP", "ELLIPSIS", "TRUNCATE", "WRAP",
      "NOWRAP", "SHRINK", "GROW", "BASIS", "MIN", "MAX", "CONTENT", "FIT",
      "CONTAIN", "COVER", "FILL", "SCALE", "CROP", "OBJECT", "POSITION", "ANCHOR",
      "OFFLINE", "ONLINE", "SYNC", "CACHE", "PREFETCH", "LAZY", "LOAD", "SKELETON",
      "PLACEHOLDER", "PROGRESSIVE", "ENHANCEMENT", "GRACEFUL", "DEGRADATION",
      "PERFORMANCE", "BATTERY", "DATA", "SAVE", "MODE", "LOW", "POWER", "DARK",
    ],
    prefixes: [
      "MOBILE", "TABLET", "DESKTOP", "WIDE", "NARROW", "TALL", "SHORT", "SMALL",
      "LARGE", "COMPACT", "COMFORT", "TOUCH", "SWIPE", "TAP", "ONE", "TWO",
      "LEFT", "RIGHT", "TOP", "BOTTOM", "FULL", "HALF", "SPLIT", "DUAL", "MULTI",
      "RESPONSIVE", "ADAPTIVE", "FLUID", "ELASTIC", "FIXED", "STICKY", "FLOAT",
      "SAFE", "EDGE", "NOTCH", "DYNAMIC", "NATIVE", "HYBRID", "PROGRESSIVE",
    ],
    suffixes: [
      "VIEW", "LAYOUT", "GRID", "STACK", "FLOW", "BAR", "SHEET", "DRAWER", "MODAL",
      "SCREEN", "PAGE", "PANEL", "CARD", "LIST", "GRID", "MAP", "NAV", "MENU",
      "TARGET", "ZONE", "AREA", "MODE", "SIZE", "SCALE", "QUERY", "POINT", "WIDTH",
    ],
  },
  "motion-animation": {
    nouns: [
      "MOTION", "ANIMATION", "TRANSITION", "TRANSFORM", "EASING", "TIMING",
      "DURATION", "DELAY", "OFFSET", "STAGGER", "SEQUENCE", "PARALLEL", "CHAIN",
      "SPRING", "BOUNCE", "ELASTIC", "LINEAR", "EASE", "IN", "OUT", "INOUT",
      "CUBIC", "QUAD", "QUART", "QUINT", "SINE", "EXPO", "CIRC", "BACK", "ANTICIPATE",
      "OVERSHOOT", "UNDERSHOOT", "DAMPING", "STIFFNESS", "MASS", "VELOCITY",
      "ACCELERATION", "DECELERATION", "INERTIA", "MOMENTUM", "FRICTION", "DRAG",
      "KEYFRAME", "TWEEN", "INTERPOLATE", "LERP", "SLERP", "BEZIER", "CURVE",
      "PATH", "MORPH", "BLEND", "FADE", "DISSOLVE", "WIPE", "SLIDE", "PUSH",
      "REVEAL", "MASK", "CLIP", "SCALE", "ROTATE", "SKEW", "TRANSLATE", "FLIP",
      "MIRROR", "SPIN", "ROLL", "TUMBLE", "BOUNCE", "SHAKE", "WOBBLE", "JELLO",
      "PULSE", "FLASH", "BLINK", "GLOW", "RIPPLE", "WAVE", "SWELL", "SHRINK",
      "GROW", "EXPAND", "COLLAPSE", "POP", "DROP", "RISE", "FLOAT", "SINK",
      "PARALLAX", "SCROLL", "TRIGGER", "SCRUB", "PIN", "STICKY", "SNAP", "LOOP",
      "REPEAT", "REVERSE", "ALTERNATE", "YOYO", "INFINITE", "ONCE", "FORWARD",
      "BACKWARD", "PAUSE", "HOLD", "IDLE", "ACTIVE", "HOVER", "FOCUS", "PRESS",
      "ENTER", "EXIT", "APPEAR", "DISAPPEAR", "MOUNT", "UNMOUNT", "LOAD", "UNLOAD",
      "MICRO", "MACRO", "FEEDBACK", "DELIGHT", "PLAYFUL", "SUBTLE", "BOLD",
      "LOTTIE", "RIFFLE", "AFTER", "EFFECTS", "PRINCIPLE", "FRAMER", "MOTION",
      "GSAP", "ANIME", "CSS", "SVG", "CANVAS", "WEBGL", "THREE", "SPRITESHEET",
      "REDUCE", "MOTION", "PREFERS", "ACCESSIBLE", "PERFORMANCE", "GPU", "CPU",
      "FRAME", "RATE", "FPS", "JITTER", "STUTTER", "SMOOTH", "FLUID", "SNAPPY",
    ],
    prefixes: [
      "MICRO", "MACRO", "MINI", "MEGA", "SUPER", "HYPER", "ULTRA", "SOFT", "HARD",
      "SMOOTH", "SNAPPY", "QUICK", "SLOW", "FAST", "INSTANT", "DELAYED", "AUTO",
      "MANUAL", "LOOP", "SPRING", "ELASTIC", "BOUNCE", "LINEAR", "EASE", "CUBIC",
      "OVER", "UNDER", "IN", "OUT", "UP", "DOWN", "LEFT", "RIGHT", "FORWARD", "BACK",
    ],
    suffixes: [
      "MOTION", "MOVE", "ANIM", "TRANS", "EASE", "SPRING", "LOOP", "WAVE", "PULSE",
      "GLOW", "FADE", "SLIDE", "SPIN", "FLIP", "BOUNCE", "SHAKE", "POP", "DROP",
      "RISE", "FLOW", "PATH", "CURVE", "KEY", "FRAME", "TWEEN", "CHAIN", "SEQ",
    ],
  },
  "brand-identity": {
    nouns: [
      "BRAND", "IDENTITY", "LOGO", "MARK", "SYMBOL", "ICON", "WORDMARK", "LETTERMARK",
      "MONOGRAM", "EMBLEM", "BADGE", "SEAL", "STAMP", "SIGNATURE", "LOCKUP",
      "PRIMARY", "SECONDARY", "TERTIARY", "ALTERNATE", "REVERSED", "MONOCHROME",
      "COLOR", "BLACK", "WHITE", "GRAY", "GOLD", "SILVER", "METALLIC", "FOIL",
      "PALETTE", "SWATCH", "PANTONE", "CMYK", "RGB", "HEX", "SPOT", "PROCESS",
      "TYPOGRAPHY", "TYPEFACE", "FONT", "HEADLINE", "BODY", "ACCENT", "DISPLAY",
      "VOICE", "TONE", "PERSONALITY", "CHARACTER", "ARCHETYPE", "TRAIT", "VALUE",
      "MISSION", "VISION", "PURPOSE", "PROMISE", "TAGLINE", "SLOGAN", "MANTRA",
      "MESSAGING", "COPY", "HEADLINE", "SUBHEAD", "BODY", "CAPTION", "CTA",
      "STORY", "NARRATIVE", "ORIGIN", "HERITAGE", "LEGACY", "FUTURE", "EVOLUTION",
      "GUIDELINE", "STANDARD", "RULE", "SPEC", "USAGE", "CLEARSPACE", "MINIMUM",
      "SIZE", "SCALE", "PLACEMENT", "POSITION", "ORIENTATION", "BACKGROUND",
      "MISUSE", "DONT", "DO", "EXAMPLE", "APPLICATION", "TOUCHPOINT", "CHANNEL",
      "PACKAGING", "SIGNAGE", "UNIFORM", "VEHICLE", "ENVIRONMENT", "SPACE", "RETAIL",
      "DIGITAL", "SOCIAL", "EMAIL", "WEB", "APP", "MOTION", "VIDEO", "AUDIO",
      "PHOTOGRAPHY", "ILLUSTRATION", "ICONOGRAPHY", "PATTERN", "TEXTURE", "SHAPE",
      "GRID", "LAYOUT", "COMPOSITION", "HIERARCHY", "BALANCE", "CONTRAST", "UNITY",
      "COHESION", "CONSISTENCY", "RECOGNITION", "RECALL", "AWARENESS", "EQUITY",
      "LOYALTY", "TRUST", "AUTHENTIC", "PREMIUM", "ACCESSIBLE", "INCLUSIVE", "BOLD",
      "MINIMAL", "PLAYFUL", "SERIOUS", "LUXURY", "FRIENDLY", "PROFESSIONAL", "WARM",
      "COOL", "MODERN", "CLASSIC", "RETRO", "FUTURISTIC", "ORGANIC", "GEOMETRIC",
    ],
    prefixes: [
      "BRAND", "CORPORATE", "PRODUCT", "SUB", "CO", "MASTER", "PRIMARY", "SECOND",
      "ALT", "NEW", "OLD", "LEGACY", "NEXT", "FUTURE", "GLOBAL", "LOCAL", "REGIONAL",
      "DIGITAL", "PHYSICAL", "SOCIAL", "VISUAL", "VERBAL", "SONIC", "MOTION",
      "MINIMAL", "BOLD", "LUXURY", "MASS", "PREMIUM", "VALUE", "PRIVATE", "PUBLIC",
    ],
    suffixes: [
      "BRAND", "MARK", "LOGO", "ICON", "STYLE", "GUIDE", "BOOK", "KIT", "SYSTEM",
      "VOICE", "TONE", "STORY", "LINE", "TAG", "PROMISE", "VALUE", "TRAIT", "TYPE",
      "FACE", "COLOR", "PALETTE", "PATTERN", "GRID", "RULE", "SPEC", "DOC", "DECK",
    ],
  },
};

function buildTopicWords(topicId, seeds) {
  const set = new Set();
  addWords(set, seeds.nouns);
  combinePools(set, seeds.prefixes, seeds.suffixes, seeds.nouns);

  // Pad with numbered variants if still under target
  let counter = 1;
  while (set.size < TARGET_PER_TOPIC && counter < 50000) {
    for (const noun of seeds.nouns) {
      const base = normalize(noun);
      if (!isValid(base)) continue;
      const padded = normalize(`${base}${counter}`);
      if (isValid(padded)) set.add(padded);
      const prefixed = normalize(`${seeds.prefixes[counter % seeds.prefixes.length]}${base}`);
      if (isValid(prefixed)) set.add(prefixed);
      if (set.size >= TARGET_PER_TOPIC) break;
    }
    counter += 1;
  }

  return [...set].sort().slice(0, TARGET_PER_TOPIC);
}

mkdirSync(OUT_DIR, { recursive: true });

const manifest = {};
let total = 0;

for (const [topicId, seeds] of Object.entries(TOPIC_SEEDS)) {
  const words = buildTopicWords(topicId, seeds);
  manifest[topicId] = words.length;
  total += words.length;
  writeFileSync(join(OUT_DIR, `${topicId}.json`), JSON.stringify(words, null, 0));
  console.log(`${topicId}: ${words.length} words`);
}

writeFileSync(
  join(OUT_DIR, "manifest.json"),
  JSON.stringify({ topics: manifest, total, generatedAt: new Date().toISOString() }, null, 2),
);

console.log(`\nTotal: ${total} words across ${Object.keys(TOPIC_SEEDS).length} topics`);

if (total < 10000) {
  console.error(`ERROR: Expected at least 10000 words, got ${total}`);
  process.exit(1);
}
