export interface SocialHangmanTopic {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export const SOCIAL_HANGMAN_TOPICS: SocialHangmanTopic[] = [
  {
    id: "design-tools",
    name: "Design tools",
    description: "Figma, Sketch, plugins, handoff, and creative software",
    sortOrder: 1,
  },
  {
    id: "typography",
    name: "Typography",
    description: "Fonts, hierarchy, spacing, and type systems",
    sortOrder: 2,
  },
  {
    id: "color-visual",
    name: "Color & visual design",
    description: "Palettes, contrast, gradients, and visual weight",
    sortOrder: 3,
  },
  {
    id: "layout-grids",
    name: "Layout & grids",
    description: "Spacing, alignment, composition, and structure",
    sortOrder: 4,
  },
  {
    id: "ux-research",
    name: "UX research",
    description: "Personas, testing, interviews, and discovery",
    sortOrder: 5,
  },
  {
    id: "interaction-design",
    name: "Interaction design",
    description: "Flows, states, affordances, and microinteractions",
    sortOrder: 6,
  },
  {
    id: "design-systems",
    name: "Design systems",
    description: "Tokens, components, variants, and documentation",
    sortOrder: 7,
  },
  {
    id: "accessibility",
    name: "Accessibility",
    description: "Inclusive design, WCAG, and assistive technology",
    sortOrder: 8,
  },
  {
    id: "prototyping",
    name: "Prototyping",
    description: "Wireframes, mockups, and clickable prototypes",
    sortOrder: 9,
  },
  {
    id: "mobile-responsive",
    name: "Mobile & responsive",
    description: "Touch targets, breakpoints, and adaptive layouts",
    sortOrder: 10,
  },
  {
    id: "motion-animation",
    name: "Motion & animation",
    description: "Easing, transitions, timing, and delight",
    sortOrder: 11,
  },
  {
    id: "brand-identity",
    name: "Brand & identity",
    description: "Logos, voice, style guides, and visual language",
    sortOrder: 12,
  },
];

export const SOCIAL_HANGMAN_TOPIC_IDS = SOCIAL_HANGMAN_TOPICS.map((topic) => topic.id);

export function getSocialHangmanTopic(id: string): SocialHangmanTopic | undefined {
  return SOCIAL_HANGMAN_TOPICS.find((topic) => topic.id === id);
}

export function isSocialHangmanTopicId(id: string): boolean {
  return SOCIAL_HANGMAN_TOPIC_IDS.includes(id);
}
