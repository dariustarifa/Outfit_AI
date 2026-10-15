import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "../theme";

interface WhiteChipProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function WhiteChip({ children, style }: WhiteChipProps) {
  const colors = useColors();

  return (
    <View style={[styles.chip, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
  },
});
