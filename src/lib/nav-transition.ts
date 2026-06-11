export type NavTransitionType = "nav-forward" | "nav-back";

/** Pick a directional transition type when moving between sidebar routes. */
export function navTransitionTypes(
  currentPath: string,
  targetHref: string,
  navHrefs: string[],
): NavTransitionType[] {
  const currentIndex = navHrefs.findIndex(
    (href) => currentPath === href || currentPath.startsWith(`${href}/`),
  );
  const targetIndex = navHrefs.findIndex(
    (href) => targetHref === href || targetHref.startsWith(`${href}/`),
  );

  if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) {
    return ["nav-forward"];
  }

  return targetIndex > currentIndex ? ["nav-forward"] : ["nav-back"];
}
