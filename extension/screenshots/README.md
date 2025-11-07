# 应用截图指南

为 Navigator 扩展准备高质量的应用商店截图。

---

## 📸 截图要求

### 尺寸规范

各应用商店对截图的要求：

| 平台 | 尺寸要求 | 数量 | 格式 |
|------|---------|------|------|
| **Chrome Web Store** | 1280×800 或 640×400 | 至少 1 张，建议 3-5 张 | PNG 或 JPEG |
| **Firefox Add-ons** | 无严格要求，建议 1280×800 | 至少 1 张 | PNG 或 JPEG |
| **Edge Add-ons** | 1280×800 | 至少 1 张，建议 3-5 张 | PNG 或 JPEG |

### 文件大小

- **最大文件大小**：每张不超过 5MB
- **推荐大小**：200-500KB（保证清晰度）
- **压缩建议**：使用 TinyPNG 或类似工具压缩

---

## 🎯 建议截图内容

### 截图 1：主界面（必需）

**展示内容**：
- 网格布局的书签展示
- 多个书签卡片（包含 favicon、标题、描述）
- 侧边栏分类列表
- 顶部搜索框和操作按钮

**拍摄要点**：
- 使用示例数据（避免个人隐私）
- 展示 3-4 列网格布局
- 包含 3-5 个不同分类
- 每个分类有 4-8 个书签

**示例书签数据**：
```
分类：开发工具
- GitHub - 代码托管平台
- VS Code - 代码编辑器
- Stack Overflow - 开发者问答社区
- MDN - Web 开发文档

分类：设计资源
- Figma - UI 设计工具
- Dribbble - 设计作品展示
- Unsplash - 免费高清图片
- Adobe Color - 配色工具
```

### 截图 2：AI 功能演示（推荐）

**展示内容**：
- 添加书签弹窗
- 「AI 获取」按钮点击后的加载状态
- 自动填充的标题和描述
- 「🤖 AI 推荐分类」功能
- 推荐理由提示

**拍摄要点**：
- 使用知名网站作为示例（如 github.com、figma.com）
- 展示 AI 自动填充的效果
- 显示分类推荐结果

### 截图 3：搜索功能（推荐）

**展示内容**：
- 搜索框输入关键词
- 实时搜索结果展示
- 高亮匹配的文字

**拍摄要点**：
- 输入「design」等通用关键词
- 展示 3-5 条搜索结果
- 结果中高亮关键词

### 截图 4：设置界面（可选）

**展示内容**：
- 设置弹窗界面
- 网格列数调整
- AI 功能配置
- 主题切换选项

**拍摄要点**：
- 展示「首页」和「AI 功能」标签页
- 显示滑块和输入框

### 截图 5：深色模式（可选）

**展示内容**：
- 深色主题下的主界面
- 对比浅色模式，展示主题切换效果

**拍摄要点**：
- 与截图 1 布局相同，仅主题不同
- 展示深色模式的视觉效果

---

## 📝 拍摄步骤

### 方法 1：浏览器截图工具

#### Chrome / Edge

1. **打开 Navigator**
   - 新建标签页或点击扩展图标

2. **打开开发者工具**
   - 按 `F12` 或 `Cmd+Option+I`（macOS）

3. **切换设备模式**（可选）
   - 点击设备切换图标（Toggle device toolbar）
   - 设置分辨率为 1280×800

4. **拍摄截图**
   - 按 `Cmd+Shift+P`（macOS）或 `Ctrl+Shift+P`（Windows）
   - 输入「Screenshot」
   - 选择「Capture screenshot」或「Capture full size screenshot」

5. **保存截图**
   - 截图自动下载
   - 重命名为 `screenshot-1.png`

#### Firefox

1. **打开 Navigator**

2. **使用截图工具**
   - 按 `Ctrl+Shift+S`（或右键 → 「截取屏幕截图」）
   - 选择区域或整个页面

3. **保存截图**
   - 点击「下载」按钮
   - 重命名为 `screenshot-1.png`

### 方法 2：第三方截图工具

**macOS**：
- **内置截图**：`Cmd+Shift+4`，选择区域
- **CleanShot X**：更专业的截图工具
- **Skitch**：可添加标注和箭头

**Windows**：
- **Snipping Tool**：Windows 自带截图工具
- **Greenshot**：开源截图工具
- **ShareX**：功能强大的截图软件

**跨平台**：
- **Lightshot**：简单易用
- **Flameshot**：开源截图工具

### 方法 3：自动化截图（开发者）

使用 Playwright 自动截图：

```javascript
// screenshots.spec.ts
import { test } from '@playwright/test'

test('截取主界面', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // 等待页面加载
  await page.waitForSelector('.homepage-grid')

  // 设置视口大小
  await page.setViewportSize({ width: 1280, height: 800 })

  // 截图
  await page.screenshot({
    path: 'extension/screenshots/screenshot-1.png',
    fullPage: false
  })
})

test('截取添加书签弹窗', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // 点击添加按钮
  await page.click('text=添加书签')

  // 等待弹窗显示
  await page.waitForSelector('.bookmark-form-modal')

  // 截图
  await page.screenshot({
    path: 'extension/screenshots/screenshot-2.png'
  })
})
```

运行：
```bash
npx playwright test screenshots.spec.ts
```

---

## 🎨 截图优化技巧

### 视觉美化

1. **使用真实数据**
   - 避免 Lorem Ipsum 占位文本
   - 使用知名网站作为示例（GitHub、Figma、Google 等）
   - 确保 favicon 正确加载

2. **保持整洁**
   - 移除个人隐私信息（真实邮箱、姓名等）
   - 隐藏浏览器书签栏和扩展图标（可选）
   - 关闭无关的浏览器标签页

3. **高亮重点**
   - 使用箭头或标注（可选，但不要过度）
   - 重点功能可用圆圈或高亮框标出

4. **统一风格**
   - 所有截图使用相同的窗口大小
   - 统一使用浅色或深色主题
   - 保持界面元素对齐

### 后期处理

**推荐工具**：
- **Figma / Sketch**：添加边框、阴影、标注
- **Canva**：在线设计工具，可添加文字说明
- **Photoshop / GIMP**：专业图像编辑

**常见优化**：
1. **添加边框**
   - 浅色边框（#E5E7EB，1-2px）
   - 或浅色阴影效果

2. **添加文字说明**（可选）
   - 在截图下方添加功能说明
   - 字体：系统默认或 Open Sans
   - 颜色：深灰色（#374151）

3. **裁剪与对齐**
   - 确保截图边缘对齐
   - 移除多余的空白区域

4. **压缩文件**
   - 使用 [TinyPNG](https://tinypng.com/) 压缩
   - 或命令行工具：
     ```bash
     # macOS (需安装 pngquant)
     brew install pngquant
     pngquant --quality=65-80 screenshot-1.png
     ```

---

## ✅ 检查清单

### 拍摄前

- [ ] 准备示例数据（书签和分类）
- [ ] 清理浏览器界面（关闭无关标签）
- [ ] 确保 favicon 正确加载
- [ ] 检查界面无错误提示

### 拍摄中

- [ ] 截图尺寸为 1280×800 或 640×400
- [ ] 所有截图使用统一尺寸
- [ ] 展示核心功能
- [ ] 界面清晰无模糊

### 拍摄后

- [ ] 检查截图无个人隐私信息
- [ ] 文件大小 < 5MB（建议 200-500KB）
- [ ] 文件格式为 PNG 或 JPEG
- [ ] 命名规范：`screenshot-1.png`, `screenshot-2.png` 等

### 提交前

- [ ] 至少准备 1 张截图（推荐 3-5 张）
- [ ] 所有截图放在 `extension/screenshots/` 目录
- [ ] 截图质量符合应用商店要求

---

## 📂 文件命名规范

```
extension/screenshots/
├── screenshot-1.png          # 主界面
├── screenshot-2.png          # AI 功能
├── screenshot-3.png          # 搜索功能
├── screenshot-4.png          # 设置界面
├── screenshot-5.png          # 深色模式
├── promo-440x280.png         # 小宣传图（可选）
├── promo-1400x560.png        # 大宣传图（可选）
└── README.md                 # 本文档
```

---

## 🎬 示例截图脚本

如果你想使用自动化工具，以下是完整的 Playwright 脚本：

```typescript
// extension/scripts/take-screenshots.ts
import { chromium } from 'playwright'

async function takeScreenshots() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // 设置视口大小
  await page.setViewportSize({ width: 1280, height: 800 })

  // 打开 Navigator
  await page.goto('http://localhost:5173')

  // 截图 1：主界面
  await page.waitForSelector('.homepage-grid')
  await page.screenshot({
    path: 'extension/screenshots/screenshot-1.png'
  })
  console.log('✅ 截图 1：主界面')

  // 截图 2：添加书签
  await page.click('button:has-text("添加书签")')
  await page.waitForSelector('.bookmark-form-modal')
  await page.screenshot({
    path: 'extension/screenshots/screenshot-2.png'
  })
  console.log('✅ 截图 2：添加书签')

  // 截图 3：搜索功能
  await page.press('Escape') // 关闭弹窗
  await page.fill('input[placeholder*="搜索"]', 'design')
  await page.waitForTimeout(500) // 等待搜索结果
  await page.screenshot({
    path: 'extension/screenshots/screenshot-3.png'
  })
  console.log('✅ 截图 3：搜索功能')

  // 截图 4：设置界面
  await page.click('[title="设置"]')
  await page.waitForSelector('.settings-modal')
  await page.screenshot({
    path: 'extension/screenshots/screenshot-4.png'
  })
  console.log('✅ 截图 4：设置界面')

  // 截图 5：深色模式
  await page.click('text=深色模式')
  await page.press('Escape') // 关闭设置
  await page.waitForTimeout(500) // 等待主题切换
  await page.screenshot({
    path: 'extension/screenshots/screenshot-5.png'
  })
  console.log('✅ 截图 5：深色模式')

  await browser.close()
  console.log('🎉 所有截图完成！')
}

takeScreenshots()
```

运行：
```bash
npx ts-node extension/scripts/take-screenshots.ts
```

---

## 📞 需要帮助？

如果截图遇到问题：

1. **检查示例数据**：确保有足够的书签和分类展示
2. **调整窗口大小**：确保分辨率为 1280×800
3. **使用 Playwright**：自动化截图工具更稳定
4. **参考现有扩展**：查看 Chrome Web Store 其他扩展的截图

---

**开始拍摄你的应用截图吧！** 📸
