# DeepSeek Harness for Android (English)

[🇷🇺 Русский](README.md) | [🇬🇧 English](README.en.md) | [🇨🇳 中文](README.zh.md)

---

> Package **DeepSeek Harness (DSH)** into a ready-to-install Android APK: ready to use out of the box, empowering AI to **operate your phone without root**.
>
> This repository is a community fork of the original upstream project `woaiys3/deepseek-harness-android-app`. **The original upstream repository has been removed by its author**, making this fork and its community lineage the primary publicly maintained branch.

**📚 Documentation: [`docs/`](docs/README.md) —— Start here.**

## Features

| Feature | Description |
|---|---|
| 🌐 Full Localization | **Full English & Russian Localization**: system locale autodetection (`ru` / `zh` / `en`) + instant language switcher in the console (`Auto`, `English`, `Русский`, `中文`). Complete translation of the management console, onboarding wizard, Floating Whale Overlay, background services (`EngineService`, `OverlayService`, `AccessibilityService`, `VsreenBridgeService`), system notifications, and bundled remote plugin (`locale/ru.json`). |
| 🐟 Visual Identity | Floating ball / avatar featuring the cartoon whale illustration, complete with matching app icons and splash screens. |
| 🫧 Floating Window | Persistent assistant pinned to the edge of the screen with real-time status bubbles (Thinking / Calling tool / Task completed / Idle…); simplified control pill ("Open / Console / Exit"). |
| 🖥️ Embedded Terminal | Bundled Android precompiled node-pty with real bash for end-to-end usable terminal access. |
| 🎨 Unified UI | Consistent dark and light color palettes across Console, onboarding, and splash screen, synchronized with DSH web frontend tones. |
| 🧰 Enhanced Tools | Built-in 44 Android tool plugins (Apps, Notifications, Settings, Clipboard, Accessibility, Virtual Display / vscreen, Privileges, Headless Browser; see [`plugins/README.md`](plugins/README.md)). |
| 🧩 Self-Evolution Skill | Bundled `dsh-self-customization` skill enabling the AI agent to inspect and modify its own configuration and skills. |
| 🔌 Built-in Remote Plugin | Pre-integrated [ds-harness-remote](https://github.com/blue-soda/ds-harness-remote/) (end-to-end encrypted remote workspace access + DeepSeek login). |

## Installation

Download ready-to-install packages from [Releases](https://github.com/Frixlt/deepseek-harness-android-app/releases):

| Package | Target |
|---|---|
| `DeepSeekHarness-community-<version>-arm64.apk` | **Physical devices** (arm64, Android 7.0+) |
| `DeepSeekHarness-community-<version>-arm64-original-look.apk` | Same as above, using original upstream blue-whale icons / overlay |
| `DeepSeekHarness-community-<version>-x86_64.apk` | **Emulators only** (includes `ndk_translation`) |

Application ID is `com.deepseek.harness.community`. Can coexist alongside other variants. Each package is accompanied by a `.sha256` checksum file.

**First launch**: Extracts the runtime environment (1–3 minutes, 20,000+ files). Please **do not background or lock the screen** during extraction.

## Network & Mirrors

Configured in [`config/mirrors.env`](config/mirrors.env), used by build scripts, device helpers, and the engine:

```bash
curl -L -o app.apk https://github.com/Frixlt/deepseek-harness-android-app/releases/download/<tag>/<asset>.apk
```

In-device npm/pnpm and pip mirror settings can be toggled via comments inside that configuration file.

## Build, Test & Release

```bash
bash tools/build-apk.sh --emulator --out .cache/out/x64.apk   # Emulator package (x86_64)
bash tools/build-apk.sh                                        # Physical device package (arm64)
bash tools/build-release.sh                                    # Build all three packages at once
```

Requires JDK, `android-app/sdk/android.jar` (see [`android-app/sdk/README.md`](android-app/sdk/README.md)), and network access.

| Topic | Documentation |
|---|---|
| Repository Structure & Runtime Layout | [docs/STRUCTURE.md](docs/STRUCTURE.md) |
| Build Guide (from scratch to APK) | [docs/BUILD.md](docs/BUILD.md) |
| **Testing Guide** (Emulator / Device / Logging / Tool Regression) | [docs/TESTING.md](docs/TESTING.md) |
| **Operations Manual** (Ports / Tokens / Integrity Self-Heal / Restart) | [docs/OPS.md](docs/OPS.md) |
| **Release Process** | [docs/RELEASE.md](docs/RELEASE.md) |
| Development & Customization (Java / Plugins / Frontend Patches) | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Troubleshooting | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |

## Acknowledgements & Licenses

- Upstream ancestor: `woaiys3/deepseek-harness-android-app` (removed by original author; code lineage preserved in git history).
- Built-in remote plugin: [ds-harness-remote](https://github.com/blue-soda/ds-harness-remote/).
- [Operit](https://github.com/AAswordman/Operit) —— Virtual screen (vscreen) port origin, LGPL-3.0, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- [Shizuku](https://github.com/RikkaApps/Shizuku) —— Privilege bridge for non-root system operations.
- [AOSP apksig](https://android.googlesource.com/platform/tools/apksig) —— On-device APK signing and verification (Apache-2.0).
- GNU & Java tools distributed via Termux (aapt2 / ecj / dx etc.), licenses included under `runtime/share/doc/*/COPYING*`.
- Repository codebase is licensed under [MIT](LICENSE) (see exceptions in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).

> This repository hosts **source code and build configuration**. Compiled binary APK releases can be downloaded from GitHub Releases.
