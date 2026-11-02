#!/usr/bin/env bash
# Private user model deployment; does not publish any licensed assets.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${AVATAR_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/deepseek_chan/live2d_web}"
TARGET_DEVICE_DIR="/sdcard/deepseek-harness/live2d"
SOURCE_ZIP="${1:-$HOME/Загрузки/DeepSeek-chan DeepSeekFree Live2D Model + Layered PSD PSD.zip}"
python3 "$ROOT_DIR/tools/prepare-avatar.py" --output "$CACHE_DIR" --archive "$SOURCE_ZIP" \
    --runtime-dir "${AVATAR_RUNTIME_DIR:-$CACHE_DIR}"
ADB="${ADB:-${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb}"
if [ ! -x "$ADB" ]; then ADB="$(command -v adb || true)"; fi
if [ -n "$ADB" ] && "$ADB" get-state >/dev/null 2>&1; then
    "$ADB" shell mkdir -p "$TARGET_DEVICE_DIR"
    "$ADB" push "$CACHE_DIR/." "$TARGET_DEVICE_DIR/"
    echo "Модель обновлена. В консоли выберите Live2D и нужную позу."
else
    echo "Устройство ADB не подключено (или их несколько). Для выбора устройства задайте ANDROID_SERIAL."
    echo "Пакет для ручного копирования: $CACHE_DIR → $TARGET_DEVICE_DIR"
fi
