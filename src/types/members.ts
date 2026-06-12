export interface PlatformMemberRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  permissionProfile: string;
  permissionProfileSlug: string;
  eventCount: number;
  createdAt: string;
  isDeletable: boolean;
  isPlatformAdmin: boolean;
  isParticipant: boolean;
}
