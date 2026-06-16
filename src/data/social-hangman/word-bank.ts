import type { SocialHangmanSettings } from "@/lib/chat-game-hangman-settings";
import { isSocialHangmanTopicId, SOCIAL_HANGMAN_TOPIC_IDS } from "@/data/social-hangman/topics";
import accessibility from "@/data/social-hangman/words/accessibility.json";
import brandIdentity from "@/data/social-hangman/words/brand-identity.json";
import colorVisual from "@/data/social-hangman/words/color-visual.json";
import designTools from "@/data/social-hangman/words/design-tools.json";
import designSystems from "@/data/social-hangman/words/design-systems.json";
import interactionDesign from "@/data/social-hangman/words/interaction-design.json";
import layoutGrids from "@/data/social-hangman/words/layout-grids.json";
import mobileResponsive from "@/data/social-hangman/words/mobile-responsive.json";
import motionAnimation from "@/data/social-hangman/words/motion-animation.json";
import prototyping from "@/data/social-hangman/words/prototyping.json";
import typography from "@/data/social-hangman/words/typography.json";
import uxResearch from "@/data/social-hangman/words/ux-research.json";

const WORDS_BY_TOPIC: Record<string, readonly string[]> = {
  "design-tools": designTools,
  typography,
  "color-visual": colorVisual,
  "layout-grids": layoutGrids,
  "ux-research": uxResearch,
  "interaction-design": interactionDesign,
  "design-systems": designSystems,
  accessibility,
  prototyping,
  "mobile-responsive": mobileResponsive,
  "motion-animation": motionAnimation,
  "brand-identity": brandIdentity,
};

let allWordsCache: string[] | null = null;

export function getSocialHangmanWordsForTopic(topicId: string): string[] {
  if (!isSocialHangmanTopicId(topicId)) return [];
  return [...(WORDS_BY_TOPIC[topicId] ?? [])];
}

export function getAllSocialHangmanWords(): string[] {
  if (!allWordsCache) {
    allWordsCache = Object.values(WORDS_BY_TOPIC).flatMap((words) => [...words]);
  }
  return allWordsCache;
}

export function resolveSocialHangmanWordPool(settings: Pick<SocialHangmanSettings, "topicMode" | "topicId">): string[] {
  if (settings.topicMode === "topic" && settings.topicId) {
    const words = getSocialHangmanWordsForTopic(settings.topicId);
    if (words.length > 0) return words;
  }
  return getAllSocialHangmanWords();
}

export interface SocialHangmanWordPick {
  word: string;
  topicId: string;
}

function pickFromPool(pool: string[], exclude: string[]): string {
  if (pool.length === 0) {
    throw new Error("No words available for the selected topic.");
  }

  const blocked = new Set(exclude.map((word) => word.toUpperCase()));
  const available = pool.filter((word) => !blocked.has(word));
  const source = available.length > 0 ? available : pool;
  const index = Math.floor(Math.random() * source.length);
  return source[index]!;
}

export function pickSocialHangmanWord(
  settings: Pick<SocialHangmanSettings, "topicMode" | "topicId">,
  exclude: string[] = [],
): SocialHangmanWordPick {
  if (settings.topicMode === "topic" && settings.topicId && isSocialHangmanTopicId(settings.topicId)) {
    const words = getSocialHangmanWordsForTopic(settings.topicId);
    return { word: pickFromPool(words, exclude), topicId: settings.topicId };
  }

  const topicId = SOCIAL_HANGMAN_TOPIC_IDS[Math.floor(Math.random() * SOCIAL_HANGMAN_TOPIC_IDS.length)]!;
  const words = getSocialHangmanWordsForTopic(topicId);
  return { word: pickFromPool(words, exclude), topicId };
}

export function getSocialHangmanWordBankStats() {
  const topics = Object.fromEntries(
    Object.entries(WORDS_BY_TOPIC).map(([topicId, words]) => [topicId, words.length]),
  );
  return {
    topics,
    total: getAllSocialHangmanWords().length,
  };
}
