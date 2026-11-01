# DeepSeek Harness для Android

[🇷🇺 Русский](README.md) | [🇬🇧 English](README.en.md) | [🇨🇳 中文](README.zh.md)

---

> Упаковка **DeepSeek Harness (DSH)** в готовый установочный APK-файл для Android: работает «из коробки» и позволяет ИИ **управлять смартфоном без Root-прав**.
>
> Данный репозиторий является форком проекта `blue-soda/deepseek-harness-android-app` с **полной русской и английской локализацией**, ручной вычиткой интерфейса и расширенной поддержкой языков. Исходный апстрим `woaiys3/deepseek-harness-android-app` был удалён автором, поэтому этот форк сохраняет всю историю и активную поддержку проекта.

**📚 Раздел документации: [`docs/`](docs/README.md) (на русском: [`docs/README.ru.md`](docs/README.ru.md))**

---

## 🚀 Возможности

| Направление | Описание |
|---|---|
| 🌐 **Полная локализация (RU / EN / ZH)** | Автоопределение языка системы (`ru` / `en` / `zh`) + мгновенный переключатель языка в панели управления (`Auto`, `Русский`, `English`, `中文`). Полностью переведены панель управления (Консоль), мастер начальной настройки, плавающее окно (Floating Whale Overlay), системные службы (`EngineService`, `OverlayService`, `AccessibilityService`, `VsreenBridgeService`), системные уведомления и встроенный плагин удалённого доступа (`locale/ru.json`). |
| 🐟 **Фирменный дизайн** | Плавающий значок и аватар с мультяшным китом, обновлённые иконки приложения и экраны загрузки. |
| 🫧 **Плавающий ассистент** | Виджет на краю экрана с динамическими всплывающими облачками статуса (Размышляет / Вызывает инструмент / Задача выполнена / Ожидание…); компактное меню управления («Открыть / Консоль / Выход»). |
| 🖥️ **Встроенный терминал** | Встроенный скомпилированный для Android `node-pty` с полноценным `bash` — готовый к работе терминал прямо в приложении. |
| 🎨 **Единая тема оформления** | Консоль управления, экраны загрузки и онбординг выполнены в единой тёмной/светлой палитре, гармонирующей с веб-интерфейсом DSH. |
| 🧰 **44 встроенных инструмента** | Встроенные плагины для автоматизации Android (управление приложениями, уведомления, настройки, буфер обмена, служба доступности, виртуальный экран / vscreen, системные привилегии, браузер; см. [`plugins/README.md`](plugins/README.md)). |
| 🧩 **Навык самоэволюции** | Встроенный навык `dsh-self-customization`, позволяющий ИИ анализировать и модифицировать собственные конфигурации и навыки. |
| 🔌 **Удалённый доступ** | Интегрированный плагин [ds-harness-remote](https://github.com/blue-soda/ds-harness-remote/) (сквозное шифрованное удалённое подключение с ПК/браузера + вход через аккаунт DeepSeek). |

---

## 📲 Установка

Готовые установочные APK-пакеты доступны в разделе **[Releases](https://github.com/Frixlt/deepseek-harness-android-app/releases)**:

| Пакет | Назначение |
|---|---|
| `DeepSeekHarness-community-<версия>-arm64.apk` | **Реальные смартфоны и планшеты** (архитектура arm64, Android 7.0+) |
| `DeepSeekHarness-community-<версия>-arm64-original-look.apk` | То же самое, но с оригинальными иконками синего кита |
| `DeepSeekHarness-community-<версия>-x86_64.apk` | **Только для эмуляторов ПК** (включает `ndk_translation`) |

Идентификатор пакета: `com.deepseek.harness.community`. Может устанавливаться параллельно с другими версиями. Каждый релиз снабжён файлом контрольной суммы `.sha256`.

> ⚠️ **Первый запуск**: приложение распаковывает рабочую среду Node.js и зависимости (1–3 минуты, более 20 000 файлов). Во время первичной распаковки **не сворачивайте приложение и не блокируйте экран**.

---

## 🛠️ Сборка, тестирование и релизы

```bash
bash tools/build-apk.sh --emulator --out .cache/out/x64.apk   # Сборка пакета для эмулятора (x86_64)
bash tools/build-apk.sh                                        # Сборка пакета для физического устройства (arm64)
bash tools/build-release.sh                                    # Сборка всех трёх пакетов сразу
```

Для локальной сборки требуются: JDK 11+, Android SDK Build-Tools, `android-app/sdk/android.jar` (см. [`android-app/sdk/README.md`](android-app/sdk/README.md)) и доступ в сеть.

| Тема | Документ |
|---|---|
| Архитектура репозитория и структура среды | [docs/STRUCTURE.md](docs/STRUCTURE.md) |
| Сборка APK с нуля | [docs/BUILD.md](docs/BUILD.md) |
| **Тестирование** (эмулятор / физическое устройство / логи) | [docs/TESTING.md](docs/TESTING.md) |
| **Руководство по эксплуатации** (порты / токены / самовосстановление) | [docs/OPS.md](docs/OPS.md) |
| **Публикация релизов** | [docs/RELEASE.md](docs/RELEASE.md) |
| Разработка (Java / плагины инструментов / патчи фронтенда) | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Решение частых проблем и диагностика | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |

---

## 📄 Лицензии и благодарности

- Исторический апстрим: `woaiys3/deepseek-harness-android-app` и ветка `blue-soda/deepseek-harness-android-app`.
- Встроенный плагин: [ds-harness-remote](https://github.com/blue-soda/ds-harness-remote/).
- [Operit](https://github.com/AAswordman/Operit) — источник виртуального экрана (vscreen), лицензия LGPL-3.0 (см. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
- [Shizuku](https://github.com/RikkaApps/Shizuku) — мост для выполнения привилегированных команд без Root.
- [AOSP apksig](https://android.googlesource.com/platform/tools/apksig) — подпись и валидация APK на устройстве (Apache-2.0).
- Инструменты GNU и Java из дистрибутива Termux (`aapt2`, `ecj`, `dx` и др.), лицензии в `runtime/share/doc/*/COPYING*`.
- Основной исходный код репозитория распространяется под лицензией [MIT](LICENSE) (исключения см. в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
