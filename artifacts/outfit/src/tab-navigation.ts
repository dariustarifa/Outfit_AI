export type TabRouteTarget = "home" | "profile";
export const TAB_HIGHLIGHT_WIDTH = 92;
export const TAB_HIGHLIGHT_HEIGHT = 48;

export function getTabHighlightLayout(tabSlotWidth: number) {
  const safeSlotWidth = Math.max(0, tabSlotWidth);
  const width = Math.min(TAB_HIGHLIGHT_WIDTH, safeSlotWidth);

  return {
    left: (safeSlotWidth - width) / 2,
    width,
    profileOffset: safeSlotWidth * 2,
  };
}

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
