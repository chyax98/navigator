#!/bin/bash

# 生成不同尺寸的图标
# 需要安装 ImageMagick: brew install imagemagick

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 ImageMagick 是否安装
if ! command -v convert &> /dev/null; then
    echo "错误: 未安装 ImageMagick"
    echo "请运行: brew install imagemagick"
    exit 1
fi

# 从 SVG 生成不同尺寸的 PNG
echo "生成图标..."

convert icon.svg -resize 16x16 icon-16.png
convert icon.svg -resize 48x48 icon-48.png
convert icon.svg -resize 128x128 icon-128.png

echo "✅ 图标生成完成！"
ls -lh icon-*.png
