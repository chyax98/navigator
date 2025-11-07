# 图标安装说明

扩展需要以下尺寸的 PNG 图标文件。

## 快速生成（推荐）

### 1. 安装 ImageMagick

```bash
brew install imagemagick
```

### 2. 运行生成脚本

```bash
cd /Users/Apple/dev/navigator/extension/icons
./generate-icons.sh
```

这将从 `icon.svg` 自动生成：
- `icon-16.png` - 16×16（工具栏）
- `icon-48.png` - 48×48（扩展管理）
- `icon-128.png` - 128×128（商店）

## 手动创建

如果不想安装 ImageMagick，可以手动创建：

### 使用在线工具

1. 访问 https://www.iloveimg.com/resize-image
2. 上传 `icon.svg`
3. 调整尺寸为 16×16、48×48、128×128
4. 导出为 PNG

### 使用 Figma/Sketch

1. 导入 `icon.svg`
2. 导出为 PNG，尺寸分别为 16×16、48×48、128×128
3. 命名为 `icon-16.png`、`icon-48.png`、`icon-128.png`

### 使用现有 PNG

如果你已有图标文件：
1. 重命名为 `icon-16.png`、`icon-48.png`、`icon-128.png`
2. 确保尺寸正确
3. 放置在此目录

## 验证图标

```bash
ls -lh icon-*.png
```

应该看到 3 个 PNG 文件。

## 临时方案

如果暂时没有图标，可以：
1. 使用占位图标（纯色方块）
2. 从其他项目复制图标
3. 修改 `manifest.json` 暂时移除图标配置（不推荐）

**注意**：发布到商店时必须有高质量图标！
