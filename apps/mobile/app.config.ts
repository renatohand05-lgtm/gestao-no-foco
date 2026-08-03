import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Gestão",
  slug: "gestao-no-foco",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "gof",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gestaonofoco.app",
    infoPlist: {
      NSFaceIDUsageDescription:
        "Use Face ID para desbloquear o app com segurança, sem armazenar sua senha.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    package: "com.gestaonofoco.app",
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-splash-screen",
    "expo-image",
    "expo-local-authentication",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  },
});
