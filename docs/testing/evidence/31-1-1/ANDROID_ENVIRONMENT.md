# Sprint 31.1.1 — ANDROID_ENVIRONMENT

**Data:** 2026-08-03
**Host:** Windows 10 (build 26200)

## Detecção

| Ferramenta | Resultado |
|------------|-----------|
| `adb` no PATH | Ausente |
| `java` no PATH | Ausente |
| `emulator` no PATH | Ausente |
| `%LOCALAPPDATA%\Android\Sdk` | Ausente |
| Android Studio (Program Files) | Ausente |
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | Não definidos |
| Dispositivo PnP Android/ADB | Nenhum |
| Expo Go em device físico | Indisponível (sem device/SDK) |

## Comandos

```text
adb devices          → adb: NOT FOUND
emulator -list-avds  → emulator: NOT FOUND
```

## Classificação

**nenhum ambiente Android disponível**

Não é possível:

- iniciar emulador;
- instalar APK / development build;
- abrir Expo Go;
- capturar screenshots reais do Android.

## Próximo passo para homologação completa

1. Instalar Android Studio + SDK + Platform Tools
2. Criar AVD ou conectar device com USB debugging
3. Configurar `EXPO_PUBLIC_*` em `apps/mobile/.env` (não versionar)
4. Rodar API Next (`npm run dev`) + `npm run mobile:android` ou Expo Go
5. Executar checklist de `ANDROID_QA.md`
