import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@gof/prefs/";

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setPref<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function removePref(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export const PREF_KEYS = {
  theme: "theme",
} as const;

export type ThemePreference = "light" | "dark" | "system";
