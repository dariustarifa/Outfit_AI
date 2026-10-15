export {
  nativeEffects,
  nativeLayout,
  nativeTheme as theme,
} from "@workspace/outfit-design-system/lib/native-theme";
export { useColors } from "@workspace/outfit-design-system/hooks/use-colors";

export const BAR_HEIGHT = 64;
export const BAR_WIDTH = (screenWidth: number) => screenWidth - 40;

export const radius = {
  control: 28,
  panel: 32,
  field: 20,
  thumb: 14,
} as const;
