export type TabRouteTarget = "home" | "profile";

export type TabNavigationAction =
  | { type: "push"; href: "/profile" }
  | { type: "dismissTo"; href: "/" };

export function isProfileTabActive(pathname: string): boolean {
  return pathname === "/profile";
}

export function getTabNavigationAction(
  pathname: string,
  target: TabRouteTarget,
): TabNavigationAction | null {
  const isProfile = isProfileTabActive(pathname);

  if (target === "profile" && !isProfile) {
    return { type: "push", href: "/profile" };
  }

  if (target === "home" && isProfile) {
    return { type: "dismissTo", href: "/" };
  }

  return null;
}
