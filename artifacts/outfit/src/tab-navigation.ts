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
  | { type: "replace"; href: "/profile-tab" | "/home" };

export function isProfileTabActive(pathname: string): boolean {
  return pathname === "/profile-tab" || pathname === "/profile";
}

export function getTabNavigationAction(
  pathname: string,
  target: TabRouteTarget,
): TabNavigationAction | null {
  const isProfile = isProfileTabActive(pathname);

  if (target === "profile" && !isProfile) {
    return { type: "replace", href: "/profile-tab" };
  }

  if (target === "home" && isProfile) {
    return { type: "replace", href: "/home" };
  }

  return null;
}

let pendingTabSwitch: { target: TabRouteTarget; startedAt: number } | null =
  null;

export function markTabSwitchStart(target: TabRouteTarget) {
  pendingTabSwitch = { target, startedAt: Date.now() };
}

export function markTabSwitchFirstFrame(target: TabRouteTarget) {
  if (pendingTabSwitch?.target !== target) return;
  requestAnimationFrame(() => {
    const pending = pendingTabSwitch;
    if (pending?.target !== target) return;
    console.info(`[perf] tab switch: ${Date.now() - pending.startedAt} ms`);
    pendingTabSwitch = null;
  });
}
