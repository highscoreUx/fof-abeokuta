export interface EventUserRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  eventUserRoleId: string;
  eventUserRoleSlug: string;
  eventUserRoleName: string;
  teamLetter: string | null;
  teamId: string | null;
  loginPhrase?: string | null;
  password?: string;
  checkedInAt: string | null;
  createdAt: string;
}
