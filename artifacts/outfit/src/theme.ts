import { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";

export {
  ThemeProvider,
  useTheme,
} from "./theme/ThemeProvider";
export { nativeLayout } from "@workspace/outfit-design-system/lib/native-theme";
export type { ThemeColors } from "./theme/ThemeProvider";
export type { ThemeMode } from "./theme-mode";

export const BAR_HEIGHT = 64;
export const BAR_WIDTH = (screenWidth: number) => screenWidth - 40;

export const radius = {
  control: nativeLayout.pillRadius,
  panel: 32,
  field: 20,
  thumb: 14,
} as const;
