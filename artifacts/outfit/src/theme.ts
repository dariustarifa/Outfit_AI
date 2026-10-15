export {
  nativeEffects,
  nativeLayout,
  nativeTheme as theme,
} from "@workspace/outfit-design-system/lib/native-theme";
export { useColors } from "@workspace/outfit-design-system/hooks/use-colors";

export const BAR_HEIGHT = 64;
export const BAR_WIDTH = (screenWidth: number) => screenWidth - 40;
