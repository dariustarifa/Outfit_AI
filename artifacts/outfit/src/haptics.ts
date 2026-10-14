import * as Haptics from "expo-haptics";

export async function tapLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are optional on unsupported devices.
  }
}

export async function selection(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics are optional on unsupported devices.
  }
}

export async function success(): Promise<void> {
  try {
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    );
  } catch {
    // Haptics are optional on unsupported devices.
  }
}
