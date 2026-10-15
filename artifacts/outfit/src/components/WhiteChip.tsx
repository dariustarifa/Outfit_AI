import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";

interface WhiteChipProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function WhiteChip({ children, style }: WhiteChipProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.chipBg,
          borderColor: colors.chipBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
