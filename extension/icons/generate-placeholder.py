#!/usr/bin/env python3
"""
生成简单的占位图标（使用 PIL/Pillow）
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("错误: 未安装 Pillow")
    print("请运行: pip install pillow")
    exit(1)

def create_icon(size, filename):
    """创建一个简单的占位图标"""
    # 创建蓝色背景
    img = Image.new('RGB', (size, size), color='#3b82f6')
    draw = ImageDraw.Draw(img)

    # 绘制白色字母 N
    try:
        # 尝试使用系统字体
        font_size = int(size * 0.6)
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', font_size)
    except:
        # 如果没有字体，使用默认字体
        font = ImageFont.load_default()

    # 计算文本位置（居中）
    text = "N"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2 - bbox[1])

    # 绘制白色文本
    draw.text(position, text, fill='white', font=font)

    # 保存图标
    img.save(filename, 'PNG')
    print(f"✓ 已生成: {filename}")

# 生成三种尺寸的图标
create_icon(16, 'icon-16.png')
create_icon(48, 'icon-48.png')
create_icon(128, 'icon-128.png')

print("\n所有图标已生成完成！")
