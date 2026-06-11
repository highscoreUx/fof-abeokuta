import { create } from "zustand";

export type TeamsSortField = "letter" | "name" | "memberCount";
export type SortOrder = "asc" | "desc";

interface TeamsTableState {
  page: number;
  limit: number;
  search: string;
  sortBy: TeamsSortField;
  sortOrder: SortOrder;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  toggleSort: (field: TeamsSortField) => void;
}

export const useTeamsTableStore = create<TeamsTableState>((set) => ({
  page: 1,
  limit: 10,
  search: "",
  sortBy: "letter",
  sortOrder: "asc",
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  toggleSort: (field) =>
    set((state) => ({
      sortBy: field,
      sortOrder: state.sortBy === field && state.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    })),
}));
