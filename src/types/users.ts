export interface EventUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  permissionProfile: string;
  teamLetter: string | null;
  teamId: string | null;
  checkedInAt: string | null;
  createdAt: string;
}
