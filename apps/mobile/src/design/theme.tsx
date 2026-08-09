import {
  darkTheme,
  gofRadius,
  gofSpacing,
  gofTypography,
  lightTheme,
  type GofTheme,
} from "@gof/design-tokens";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import {
  getPref,
  PREF_KEYS,
  setPref,
  type ThemePreference,
} from "@/storage/cache";

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  colors: GofTheme;
  setPreference: (pref: ThemePreference) => Promise<void>;
  toggle: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPref(PREF_KEYS.theme, "system" as ThemePreference)
      .then((pref) => {
        setPreferenceState(pref);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const resolved: "light" | "dark" =
    preference === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : preference;

  const colors = resolved === "dark" ? darkTheme : lightTheme;

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await setPref(PREF_KEYS.theme, pref);
  }, []);

  const toggle = useCallback(async () => {
    const next = resolved === "dark" ? "light" : "dark";
    await setPreference(next);
  }, [resolved, setPreference]);

  const value = useMemo(
    () => ({ preference, resolved, colors, setPreference, toggle }),
    [preference, resolved, colors, setPreference, toggle],
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const themeTokens = {
  spacing: gofSpacing,
  radius: gofRadius,
  typography: gofTypography,
};
