"use client";

import { createContext, useContext, useEffect } from "react";

const AdminPageTitleContext = createContext<((title: string | null) => void) | null>(null);

/** Override the admin shell header title for the current page (e.g. loaded activity name). */
export function useAdminPageTitle(title: string | null) {
  const setTitle = useContext(AdminPageTitleContext);

  useEffect(() => {
    if (!setTitle) return;
    setTitle(title);
    return () => setTitle(null);
  }, [setTitle, title]);
}

export function AdminPageTitleProvider({
  setTitle,
  children,
}: {
  setTitle: (title: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <AdminPageTitleContext.Provider value={setTitle}>{children}</AdminPageTitleContext.Provider>
  );
}