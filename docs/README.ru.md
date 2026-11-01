# Документация DeepSeek Harness для Android

> Цель: **Склонировав репозиторий и прочитав документацию, можно сразу приступить к модификации кода, сборке, тестированию и публикации релизов.**

## Быстрый старт за 5 минут

| № | Документ | Содержание |
|---|---|---|
| 1 | [STRUCTURE.md](STRUCTURE.md) | Назначение каталогов репозитория, состав APK, запуск среды выполнения |
| 2 | [BUILD.md](BUILD.md) | Настройка окружения с нуля → `bash tools/build-apk.sh` для сборки APK |
| 3 | [TESTING.md](TESTING.md) | Методика тестирования на эмуляторе/устройстве, сбор логов, проверка инструментов |
| 4 | [OPS.md](OPS.md) | Порты, токены, логи, самовосстановление целостности, скрипты перезапуска |
| 5 | [RELEASE.md](RELEASE.md) | Смена версии → сборка пакетов arm64 → публикация релиза на GitHub |
| 6 | [DEVELOPMENT.md](DEVELOPMENT.md) | Точки внесения изменений: Java, плагины инструментов, патчи UI, темы консоли |
| 7 | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Диагностика для пользователей и известные технические нюансы |

## Основные скрипты автоматизации (каталог `tools/`)

| Скрипт | Назначение |
|---|---|
| `tools/build-apk.sh` | Сборка одного APK-пакета (`--emulator` / `--original-look` / `--out`) |
| `tools/build-release.sh` | Сборка комплекта из трёх пакетов (arm64 / arm64-original-look / x86_64) |
| `tools/release-upload.sh` | Загрузка ассетов в GitHub Release через curl |
| `tools/release-check.sh` | Проверка статуса релиза и списка прикреплённых файлов |
| `tools/emu-start.sh` | Запуск эмулятора с подгрузкой библиотек гостевой ОС |
| `tools/emu-shizuku.sh` | Запуск сервера Shizuku в эмуляторе |
| `tools/emu-skip-setup.sh` | Пропуск экрана первичной настройки (для тестов) |
| `tools/generate_java_i18n.py` | Генерация скомпилированных классов словарей i18n (`I18nEn`, `I18nRu`) |

## Дополнительные материалы

| Документ | Описание |
|---|---|
| [../CHANGES.md](../CHANGES.md) | История изменений версий |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Правила создания Issue и Pull Request |
| [../plugins/README.md](../plugins/README.md) | Документация встроенных плагинов инструментов (`dsh-tool-*`) |
| [../vendor/README.md](../vendor/README.md) | Источник и способ обновления плагина remote |
| [../mobile-patch/README.md](../mobile-patch/README.md) | Адаптация мобильного веб-интерфейса (`mobile.js` / `mobile.css`) |
| [../console-theme/THEME-PACK-SPEC.md](../console-theme/THEME-PACK-SPEC.md) | Спецификация пакетов тем консоли |
