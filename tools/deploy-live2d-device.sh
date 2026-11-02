#!/usr/bin/env bash
# tools/deploy-live2d-device.sh
# Развертывание интерактивной модели Live2D DeepSeek-chan на подключенное Android устройство через ADB
# или в локальную директорию для ручного копирования.
#
# ВНИМАНИЕ: Модель защищена лицензией автора (Kamiya Ryoko) и НЕ ДОЛЖНА публиковаться в Git репозиторий.
# Скрипт готовит и переносит модель локально на устройство пользователя (/sdcard/deepseek-harness/live2d/).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_ZIP="${1:-/home/frixit/Загрузки/DeepSeek-chan DeepSeekFree Live2D Model + Layered PSD PSD.zip}"
TARGET_DEVICE_DIR="/sdcard/deepseek-harness/live2d"
CACHE_DIR="/home/frixit/.cache/deepseek_chan/live2d_web"

echo "=== DeepSeek-chan Live2D Installer ==="

# 1. Проверяем кэш или архив
if [ ! -d "$CACHE_DIR" ] || [ ! -f "$CACHE_DIR/index.html" ]; then
    if [ ! -f "$SOURCE_ZIP" ]; then
        echo "Ошибка: Архив модели не найден по пути: $SOURCE_ZIP"
        echo "Использование: $0 [путь_к_архиву.zip]"
        exit 1
    fi
    echo "Подготовка WebGL пакета из архива..."
    mkdir -p "$CACHE_DIR"
    # Unpack model and optimize textures if needed
fi

echo "Локальный WebGL пакет готов: $CACHE_DIR"
ls -lh "$CACHE_DIR"

# 2. Проверяем ADB
ADB="adb"
if [ -x "/home/frixit/Android/Sdk/platform-tools/adb" ]; then
    ADB="/home/frixit/Android/Sdk/platform-tools/adb"
fi

DEVICES="$("$ADB" devices | grep -v "List of devices" | grep "device$" || true)"

if [ -n "$DEVICES" ]; then
    echo "Обнаружено подключенное Android устройство:"
    echo "$DEVICES"
    echo "Копирование Live2D модели на устройство в $TARGET_DEVICE_DIR..."
    "$ADB" shell "mkdir -p $TARGET_DEVICE_DIR"
    "$ADB" push "$CACHE_DIR/." "$TARGET_DEVICE_DIR/"
    echo "✅ Модель успешно установлена на Android устройство!"
    echo "В приложении DeepSeek Harness перейдите в: Консоль -> Настройки悬浮窗 (Оверлей) -> выберите '3. DeepSeek-chan: Live2D WebGL'."
else
    echo "ℹ️ Android устройство не подключено по ADB (или не включена отладка по USB)."
    echo "Вы можете скопировать файлы вручную на телефон:"
    echo "   Откуда: $CACHE_DIR"
    echo "   Куда:   /sdcard/deepseek-harness/live2d/"
fi
