export function eventRoom(eventSlug: string) {
  return `event:${eventSlug}`;
}

export function teamRoom(eventSlug: string, letter: string) {
  return `event:${eventSlug}:team:${letter}`;
}

export function roleRoom(eventSlug: string, roleSlug: string) {
  return `event:${eventSlug}:role:${roleSlug}`;
}

export function staffRoom(eventSlug: string) {
  return `event:${eventSlug}:staff`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function quizRoom(eventSlug: string) {
  return `event:${eventSlug}:quiz`;
}

export function spinnerSessionRoom(sessionId: string) {
  return `spinner:${sessionId}`;
}

export function hangmanMatchRoom(matchId: string) {
  return `hangman:${matchId}`;
}

export function countdownSessionRoom(sessionId: string) {
  return `countdown:${sessionId}`;
}

export function ticTacToeMatchRoom(matchId: string) {
  return `ttt:${matchId}`;
}

export function socialGameMatchRoom(matchId: string) {
  return `social-game:${matchId}`;
}

export function chatGameSessionRoom(sessionId: string) {
  return `chat-game:${sessionId}`;
}
