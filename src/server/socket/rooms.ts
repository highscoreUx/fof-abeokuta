export function eventRoom(eventSlug: string) {
  return `event:${eventSlug}`;
}

export function teamRoom(eventSlug: string, letter: string) {
  return `event:${eventSlug}:team:${letter}`;
}

export function roleRoom(eventSlug: string, roleSlug: string) {
  return `event:${eventSlug}:role:${roleSlug}`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function quizRoom(eventSlug: string) {
  return `event:${eventSlug}:quiz`;
}
