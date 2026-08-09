import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Sprint 31.10+ — Mobile Release Candidate config.
 * Projeto EAS: @gesto-no-foco/gestao-no-foco
 * projectId não é segredo; EAS_PROJECT_ID no env pode sobrescrever temporariamente.
 */
const VERSION = "1.10.0";
const IOS_BUILD_NUMBER = "110";
const ANDROID_VERSION_CODE = 110;

/** Projeto transferido para org gesto-no-foco — não criar outro; não alterar o ID. */
const DEFAULT_EAS_PROJECT_ID = "51b0c195-feec-4ac1-9fe6-a001d9571bb4";
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID?.trim() || DEFAULT_EAS_PROJECT_ID;
const UPDATES_URL = `https://u.expo.dev/${EAS_PROJECT_ID}`;

/** Gold Enterprise — alinhado a @gof/design-tokens */
const BRAND = {
  navy: "#0B0F14",
  black: "#05070A",
  gold: "#C9A84C",
  white: "#FFFFFF",
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Gestão no Foco",
  slug: "gestao-no-foco",
  owner: "gesto-no-foco",
  version: VERSION,
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "gof",
  userInterfaceStyle: "automatic",
  primaryColor: BRAND.gold,
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: UPDATES_URL,
    fallbackToCacheTimeout: 0,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gestaonofoco.app",
    buildNumber: IOS_BUILD_NUMBER,
    infoPlist: {
      CFBundleDisplayName: "Gestão no Foco",
      NSFaceIDUsageDescription:
        "Use Face ID para desbloquear o app com segurança, sem armazenar sua senha.",
      NSCameraUsageDescription:
        "Use a câmera para fotos da OS e para ler QR Code ou código de barras no scanner.",
      NSPhotoLibraryUsageDescription:
        "Acesse a galeria apenas para anexar fotos à ordem de serviço, com sua confirmação.",
      /** HTTPS/TLS padrão — sem criptografia proprietária adicional. */
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: BRAND.navy,
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    package: "com.gestaonofoco.app",
    versionCode: ANDROID_VERSION_CODE,
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.INTERNET",
    ],
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_EXTERNAL_STORAGE",
    ],
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: BRAND.navy,
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        dark: {
          backgroundColor: BRAND.black,
          image: "./assets/splash-icon.png",
        },
      },
    ],
    "expo-image",
    "expo-local-authentication",
    [
      "expo-camera",
      {
        cameraPermission:
          "Permitir câmera para ler QR Code e código de barras. Nenhuma imagem é gravada pelo scanner.",
        recordAudioAndroid: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Permitir acesso à galeria apenas para anexar fotos à ordem de serviço.",
        cameraPermission:
          "Permitir câmera para fotografar a ordem de serviço em campo.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...(typeof config.extra === "object" && config.extra ? config.extra : {}),
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
    releaseChannel:
      process.env.EAS_BUILD_PROFILE ??
      process.env.EXPO_PUBLIC_APP_ENV ??
      "development",
    brand: {
      name: "Gestão no Foco",
      primary: BRAND.gold,
      navy: BRAND.navy,
    },
    version: {
      marketing: VERSION,
      iosBuildNumber: IOS_BUILD_NUMBER,
      androidVersionCode: ANDROID_VERSION_CODE,
    },
    router: {},
    eas: {
      ...(typeof config.extra === "object" &&
      config.extra &&
      typeof (config.extra as { eas?: unknown }).eas === "object" &&
      (config.extra as { eas?: object }).eas
        ? ((config.extra as { eas: object }).eas as Record<string, unknown>)
        : {}),
      projectId: EAS_PROJECT_ID,
    },
  },
});
