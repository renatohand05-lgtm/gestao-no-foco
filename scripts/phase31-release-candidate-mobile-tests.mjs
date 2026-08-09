#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobile = join(root, "apps/mobile");
let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 31.10 — Mobile Release Candidate\n");

const cfgPath = join(mobile, "app.config.ts");
const easPath = join(mobile, "eas.json");
const manifestPath = join(mobile, "src/release/manifest.ts");
check("app.config.ts existe", existsSync(cfgPath));
check("eas.json existe", existsSync(easPath));
check("release manifest existe", existsSync(manifestPath));

const cfg = readFileSync(cfgPath, "utf8");
const eas = JSON.parse(readFileSync(easPath, "utf8"));
const manifest = readFileSync(manifestPath, "utf8");
const pkg = JSON.parse(readFileSync(join(mobile, "package.json"), "utf8"));
const gitignore = readFileSync(join(mobile, ".gitignore"), "utf8");

check("nome Gestão no Foco", /Gestão no Foco/.test(cfg));
check("slug gestao-no-foco", /slug:\s*"gestao-no-foco"/.test(cfg));
check("version 1.10.0", /VERSION = "1\.10\.0"/.test(cfg) && pkg.version === "1.10.0");
check("ios buildNumber 110", /IOS_BUILD_NUMBER = "110"/.test(cfg));
check("android versionCode 110", /ANDROID_VERSION_CODE = 110/.test(cfg));
check("bundleIdentifier com.gestaonofoco.app", /com\.gestaonofoco\.app/.test(cfg));
check("scheme gof", /scheme:\s*"gof"/.test(cfg));
check("runtimeVersion appVersion", /policy:\s*"appVersion"/.test(cfg));
check("Gold Enterprise #C9A84C", /#C9A84C/.test(cfg));
check("splash navy", /#0B0F14/.test(cfg));
check("expo-image-picker plugin", /expo-image-picker/.test(cfg));
check("expo-camera sem áudio", /recordAudioAndroid:\s*false/.test(cfg));
check("blocked RECORD_AUDIO", /RECORD_AUDIO/.test(cfg));
check("sem EAS_PROJECT_ID hardcoded", !/u\.expo\.dev\/[0-9a-f-]{8,}/i.test(cfg));
check("EAS profiles development/preview/internal/production",
  eas.build?.development && eas.build?.preview && eas.build?.internal && eas.build?.production);
check("channels definidos",
  eas.build.development.channel === "development" &&
    eas.build.preview.channel === "preview" &&
    eas.build.internal.channel === "internal" &&
    eas.build.production.channel === "production");
check("production autoIncrement", eas.build.production.autoIncrement === true);
check("production app-bundle", eas.build.production.android?.buildType === "app-bundle");
check("internal distribution APK", eas.build.internal.android?.buildType === "apk");
check("manifest stores false", /apkGenerated:\s*false/.test(manifest) && /published:\s*false/.test(manifest));
check("gitignore dist-android e apk/aab/ipa",
  /dist-android/.test(gitignore) && /\*\.apk/.test(gitignore) && /\*\.aab/.test(gitignore));
check("assets icon/splash/adaptive",
  existsSync(join(mobile, "assets/icon.png")) &&
    existsSync(join(mobile, "assets/splash-icon.png")) &&
    existsSync(join(mobile, "assets/android-icon-foreground.png")) &&
    existsSync(join(mobile, "assets/android-icon-monochrome.png")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
