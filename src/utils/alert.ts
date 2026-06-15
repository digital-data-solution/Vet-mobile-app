import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Cross-platform alert. On web, Alert.alert() is a no-op in React Native Web —
 * this utility falls back to window.alert / window.confirm so feedback is visible.
 *
 * - Simple alert (0 or 1 button): window.alert, then fires onPress callback if present.
 * - Two buttons (cancel + action): window.confirm — fires appropriate callback.
 * - Three buttons: collapses to window.confirm with the non-cancel action.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const fullMessage = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(fullMessage);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtn = buttons.find((b) => b.style !== 'cancel');
  const confirmed = window.confirm(fullMessage);
  if (confirmed) {
    actionBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
