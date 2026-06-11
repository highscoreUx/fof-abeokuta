import { create } from "zustand";

export type UsersSortField =
  | "firstName"
  | "lastName"
  | "username"
  | "createdAt"
  | "checkedInAt";

export type SortOrder = "asc" | "desc";
export type CheckedInFilter = "all" | "yes" | "no";

interface UsersTableState {
  page: number;
  limit: number;
  search: string;
  role: string | "all";
  checkedIn: CheckedInFilter;
  teamId: string | "all";
  sortBy: UsersSortField;
  sortOrder: SortOrder;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setRole: (role: string | "all") => void;
  setCheckedIn: (checkedIn: CheckedInFilter) => void;
  setTeamId: (teamId: string | "all") => void;
  toggleSort: (field: UsersSortField) => void;
}

export const useUsersTableStore = create<UsersTableState>((set) => ({
  page: 1,
  limit: 10,
  search: "",
  role: "all",
  checkedIn: "all",
  teamId: "all",
  sortBy: "createdAt",
  sortOrder: "desc",
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setRole: (role) => set({ role, page: 1 }),
  setCheckedIn: (checkedIn) => set({ checkedIn, page: 1 }),
  setTeamId: (teamId) => set({ teamId, page: 1 }),
  toggleSort: (field) =>
    set((state) => ({
      sortBy: field,
      sortOrder: state.sortBy === field && state.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    })),
}));
