/** Internal placeholder row for casual chat games — never shown in Activities. */
export const CHAT_SOCIAL_CHALLENGE_TITLE = "__chat_social__";

export function isChatSocialChallengeTitle(title: string): boolean {
  return title === CHAT_SOCIAL_CHALLENGE_TITLE;
}

export function isReservedActivityChallengeTitle(title: string): boolean {
  return isChatSocialChallengeTitle(title.trim());
}

/** Use in Prisma `where` clauses when listing admin-created activity challenges. */
export function officialActivityChallengesWhere(eventId: string) {
  return {
    eventId,
    title: { not: CHAT_SOCIAL_CHALLENGE_TITLE },
  };
}

export function formatTeamMatchLabel(
  teamX: { letter: string } | null | undefined,
  teamO: { letter: string } | null | undefined,
): string {
  if (teamX?.letter && teamO?.letter) {
    return `Team ${teamX.letter} vs Team ${teamO.letter}`;
  }
  return "Match";
}
