# navigator Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-03

## Active Technologies

- TypeScript 5.9 + Vue 3.4 + Vue 3.4, Pinia 2.1, Naive UI 2.38, VueDraggable 4.1, Vite 5.0, @vueuse/core 10.7 (001-homepage-grid-layout)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.9 + Vue 3.4: Follow standard conventions

## Recent Changes

- 001-homepage-grid-layout: Added TypeScript 5.9 + Vue 3.4 + Vue 3.4, Pinia 2.1, Naive UI 2.38, VueDraggable 4.1, Vite 5.0, @vueuse/core 10.7

<!-- MANUAL ADDITIONS START -->

## Session Updates (2025-11-03)

### UI/UX 优化

#### 1. 搜索功能简化
- **移除智能建议**: 删除了搜索框获焦时的智能建议面板
- **文件**: `src/components/common/SearchBox.vue`
- **原因**: 简化用户交互，减少不必要的界面干扰

#### 2. 弹窗模式重构
将独立路由页面转换为模态对话框，提供更流畅的用户体验：

**设置页面 → 设置弹窗**
- **文件**: `src/views/Settings.vue`, `src/components/layout/TheHeader.vue`
- **变更**:
  - 添加 `show` prop 和 `update:show` emit
  - 使用 `<n-modal>` 包装内容
  - 从 TheHeader 管理显示状态
- **优势**: 无需页面跳转，保持当前浏览上下文

**导入功能 → 导入弹窗**
- **文件**: `src/views/Import.vue`, `src/components/layout/TheHeader.vue`
- **变更**:
  - 转换为 v-model 控制的模态对话框
  - 使用 CustomEvent (`navigator-import`) 实现跨组件通信
  - 导入完成后自动关闭弹窗
- **优势**: 导入后自动返回主页，无需手动导航

#### 3. 路由简化
- **文件**: `src/router/index.ts`
- **变更**: 移除 `/settings` 和 `/import` 路由
- **最终路由**: 仅保留主页路由 `/` 和通配符重定向
- **原因**: 这些功能通过模态对话框访问，无需独立路由

### 组件清理

#### 1. 移除冗余删除按钮
- **文件**: `src/components/homepage/HomepageBookmarkCard.vue`
- **变更**: 删除卡片上的 X 删除按钮
- **原因**: HomepageGrid 已提供移除功能，避免功能重复

#### 2. 移除未实现的统计信息
- **文件**: `src/components/bookmark/BookmarkCard.vue`
- **变更**:
  - 删除点击次数、最近访问时间、创建时间显示
  - 移除相关的 dayjs 依赖和计算属性
- **原因**: 这些功能尚未实现，避免显示无意义信息

### 网格布局优化

#### 默认配置调整
- **文件**: `src/types/homepage.ts`
- **变更**:
  ```typescript
  // 列数约束
  MIN: 1 (原 3)
  MAX: 6 (原 12)
  DEFAULT: 3 (原 6)
  ```
- **原因**: 更合理的默认值，适配常见显示需求

#### 设置面板更新
- **文件**: `src/components/homepage/GridSettingsPanel.vue`
- **变更**: 更新滑块标记为 1-6
- **用户体验**: 更直观的列数调整范围

### 布局增强

#### 侧边栏完全收起功能
- **文件**: `src/components/layout/AppLayout.vue`, `src/types/config.ts`
- **新增功能**:
  - 侧边栏收起/展开按钮
  - `isCollapsed` 状态管理
  - `toggleSidebar()` 切换函数
  - 平滑过渡动画 (width transition)
- **配置持久化**:
  - 新增 `sidebarCollapsed?: boolean` 配置项
  - 默认值: `false`
  - 状态自动保存到 localStorage
- **用户体验**:
  - 收起时显示固定展开按钮
  - 展开时在侧边栏内显示收起按钮
  - 提供更大的内容显示空间

### 技术要点

#### 跨组件通信模式
```typescript
// Settings.vue 触发导入
function handleImport() {
  emit('update:show', false)
  window.dispatchEvent(new CustomEvent('navigator-import'))
}

// TheHeader.vue 监听事件
window.addEventListener('navigator-import', () => {
  showImport.value = true
})
```

#### 模态对话框模式
```typescript
// Props 接口
interface Props {
  show: boolean
}

// Emits 接口
interface Emits {
  (e: 'update:show', value: boolean): void
}

// 父组件使用
<component v-model:show="modalState" />
```

### 配置文件变更

#### AppConfig 新增字段
```typescript
export interface AppConfig {
  // ... 现有字段
  sidebarCollapsed?: boolean  // 侧边栏收起状态
}
```

### 开发工具

#### ESLint 配置
- **文件**: `.eslintignore`
- **内容**:
  ```
  dist
  node_modules
  *.min.js
  ```
- **原因**: 排除构建产物，减少无意义的 lint 错误

### 架构决策

#### 模态对话框 vs 路由页面
**选择模态对话框的场景**:
- 临时性操作（设置、导入）
- 操作完成后需返回原页面
- 不需要独立的 URL 访问
- 希望保持用户浏览上下文

**优势**:
- 更清晰的 URL 结构
- 更好的用户体验（无页面刷新感）
- 统一的交互模式
- 简化的路由配置

---

## AI 智能书签功能 (2025-11-03)

### 功能概述

实现了完整的 AI 智能书签增强功能，包括网页元数据自动提取和 AI 分类推荐。

### 核心功能

#### 1. 网页元数据提取服务
**文件**: `src/services/metadata.ts`

**功能**:
- LinkPreview API 集成（60次/小时免费额度）
- 支持环境变量配置默认 API Key
- 三层降级策略：
  1. LinkPreview API（最优）
  2. 直接 fetch HTML（受 CORS 限制）
  3. 域名提取（兜底方案）

**关键代码**:
```typescript
export async function fetchPageMetadata(
  url: string,
  apiKey?: string
): Promise<PageMetadata | null>

export function extractDomainAsTitle(url: string): string

export async function fetchPageTitle(url: string): Promise<string | null>
```

**环境变量支持**:
```typescript
const DEFAULT_API_KEY = import.meta.env.VITE_LINKPREVIEW_API_KEY || ''
const finalApiKey = apiKey?.trim() || DEFAULT_API_KEY
```

#### 2. AI 智能增强服务
**文件**: `src/services/ai/enhancement.ts`

**功能**:
- 基于 URL 和标题生成书签描述
- 从现有分类中推荐最合适的分类
- 提供推荐理由

**接口**:
```typescript
export interface AIEnhancement {
  description?: string      // AI 生成的描述
  categoryId?: string       // 推荐的分类 ID
  categoryName?: string     // 推荐的分类名称
  reason?: string          // 推荐理由
}

// 完整增强：元数据 + 描述 + 分类
export async function enhanceBookmark(
  url: string,
  title: string,
  categories: CategoryOption[]
): Promise<AIEnhancement>

// 仅推荐分类
export async function suggestCategory(
  url: string,
  title: string,
  description: string | undefined,
  categories: CategoryOption[]
): Promise<Pick<AIEnhancement, 'categoryId' | 'categoryName' | 'reason'>>
```

**Prompt 设计**:
- 温度参数：0.3（保证稳定性）
- 输出格式：严格 JSON
- 分类验证：确保推荐的分类 ID 在列表中存在
- 中文优化：描述 15-30 字，理由 10 字内

#### 3. 书签表单集成
**文件**: `src/components/bookmark/BookmarkFormModal.vue`

**UI 改进**:
- URL 字段移到最上方
- 添加 "AI获取" 按钮（使用 `n-input-group`）
- 添加 "🤖 AI推荐分类" 按钮
- 加载状态指示

**字段顺序**:
```
1. 网址 [输入框] [AI获取]
2. 标题 [输入框]
3. 描述 [文本框]
4. 分类 [选择器]
       [🤖 AI推荐分类]
```

**核心逻辑**:
```typescript
// AI 一键获取：元数据 + 分类
async function handleAIFetch() {
  // 1. 获取元数据（LinkPreview API）
  const metadata = await fetchPageMetadata(url, apiKey)

  // 2. 填充标题和描述
  formData.value.title = metadata.title
  formData.value.description = metadata.description

  // 3. AI 推荐分类
  const enhancement = await enhanceBookmark(url, title, categories)
  formData.value.categoryId = enhancement.categoryId
}

// 仅 AI 推荐分类
async function handleAISuggestCategory() {
  const suggestion = await suggestCategory(url, title, description, categories)
  formData.value.categoryId = suggestion.categoryId
}
```

### 环境变量配置系统

#### 配置文件

**`.env.example`** (模板):
```bash
# LinkPreview API 配置
VITE_LINKPREVIEW_API_KEY=your-linkpreview-api-key-here

# AI 功能配置 (可选)
# VITE_OPENAI_API_KEY=
# VITE_CUSTOM_API_BASE_URL=https://api.siliconflow.cn/v1
# VITE_CUSTOM_API_KEY=
```

**`.env`** (实际配置，已添加到 .gitignore):
```bash
VITE_LINKPREVIEW_API_KEY=d430840e90bf3f6839081297302e7d4ds
```

#### 配置优先级

```
用户设置 > 环境变量 > 降级方案
```

**实现逻辑**:
```typescript
// metadata.ts
const DEFAULT_API_KEY = import.meta.env.VITE_LINKPREVIEW_API_KEY || ''
const finalApiKey = apiKey?.trim() || DEFAULT_API_KEY

// BookmarkFormModal.vue
const linkPreviewApiKey = configStore.config.linkPreviewApiKey
await fetchPageMetadata(url, linkPreviewApiKey) // 优先用户配置
```

### 设置界面增强

**文件**: `src/views/Settings.vue`, `src/types/config.ts`

#### AppConfig 新增字段
```typescript
export interface AppConfig {
  // ... 现有字段

  // 网页元数据提取 API
  linkPreviewApiKey?: string // LinkPreview API 密钥（用于获取网页元数据）
}

export const defaultConfig: AppConfig = {
  // ...
  linkPreviewApiKey: '' // 默认为空，使用环境变量
}
```

#### 设置 UI
在 "AI 功能" 标签页底部新增：

```vue
<n-divider title-placement="left">网页元数据提取</n-divider>

<n-form-item label="LinkPreview API Key">
  <n-input
    v-model:value="configStore.config.linkPreviewApiKey"
    type="password"
    :placeholder="envLinkPreviewApiKey ? '使用环境变量默认值' : 'your-linkpreview-api-key'"
  />
  <template #help>
    用于自动获取网页标题和描述。
    <a href="https://my.linkpreview.net" target="_blank">免费注册</a>可获得60次/小时额度。
    <span v-if="envLinkPreviewApiKey" style="color: var(--n-success-color)">
      ✓ 已配置环境变量默认值
    </span>
    <span v-else>留空将使用降级方案</span>
  </template>
</n-form-item>
```

**状态显示**:
- ✓ 已配置环境变量默认值（绿色）
- 留空将使用降级方案（灰色）

### 用户体验流程

#### 添加书签流程

1. **用户输入 URL**: `https://github.com/anthropics/claude-code`
2. **点击 "AI获取" 按钮**:
   - ⏳ 显示加载状态
   - 📡 调用 LinkPreview API 获取元数据
   - ✅ 自动填充标题："Claude Code - Official CLI"
   - ✅ 自动填充描述："Anthropic's official command-line interface for Claude..."
   - 🤖 AI 分析并推荐分类："开发工具"
   - 💬 提示："🤖 推荐归类到「开发工具」"
3. **用户可选操作**:
   - 修改标题/描述
   - 点击 "🤖 AI推荐分类" 重新推荐
   - 手动选择其他分类
4. **保存书签**

#### 降级策略示例

**场景 1**: 用户配置了 API Key
```
✅ LinkPreview API → 完整元数据（标题、描述、图片）
```

**场景 2**: 使用环境变量默认值
```
✅ LinkPreview API (env) → 完整元数据
```

**场景 3**: 未配置 API Key，目标网站支持 CORS
```
⚠️ 直接 fetch HTML → 仅标题（通过 <title> 标签）
```

**场景 4**: 未配置 API Key，目标网站不支持 CORS
```
❌ CORS 阻止 → 使用域名作为标题（github.com）
```

### 技术要点

#### Vite 环境变量
```typescript
// 访问环境变量（必须以 VITE_ 开头）
import.meta.env.VITE_LINKPREVIEW_API_KEY

// TypeScript 类型支持
/// <reference types="vite/client" />
```

#### CORS 处理
```typescript
// LinkPreview API 支持 CORS
fetch(LINKPREVIEW_API, {
  method: 'POST',
  headers: {
    'X-Linkpreview-Api-Key': apiKey,
    'Content-Type': 'application/json'
  },
  mode: 'cors',  // 显式设置 CORS 模式
  body: JSON.stringify({ q: url })
})
```

#### AI Prompt 最佳实践
```typescript
const prompt = `你是一个书签管理助手。根据以下信息，帮助用户智能填充书签：

URL: ${url}
标题: ${title}

现有分类：
${categoriesText}

请完成以下任务：
1. 生成一个简短的描述（15-30字，说明这个网站是做什么的）
2. 从现有分类中选择最合适的一个分类
3. 用10字内说明推荐理由

请严格按照以下 JSON 格式输出，不要添加其他内容：
{
  "description": "网站的简短描述",
  "categoryId": "推荐的分类ID",
  "categoryName": "推荐的分类名称",
  "reason": "推荐理由"
}`
```

**关键参数**:
- `temperature: 0.3` - 保证输出稳定性
- `max_tokens: 500` - 限制输出长度
- JSON 格式验证和错误处理

### 安全性

#### API Key 保护
```bash
# .gitignore 已包含
.env
.env.local
.env.*.local
```

#### 敏感信息处理
- 密码输入框：`type="password"`
- 环境变量：不会暴露在前端代码中
- localStorage：配置自动保存，但可清除

### 测试验证

✅ TypeScript 类型检查通过
```bash
npx vue-tsc --noEmit
# 无错误输出
```

✅ 环境变量读取正常
```typescript
const envKey = import.meta.env.VITE_LINKPREVIEW_API_KEY
console.log(envKey ? '✓ 已配置' : '✗ 未配置')
```

### 文件清单

#### 新增文件
- `.env` - 环境变量配置（包含实际 API Key，已 gitignore）
- `.env.example` - 环境变量模板
- `src/services/metadata.ts` - 网页元数据提取服务
- `src/services/ai/enhancement.ts` - AI 智能增强服务

#### 修改文件
- `src/types/config.ts` - 添加 `linkPreviewApiKey` 字段
- `src/views/Settings.vue` - 添加 LinkPreview API Key 配置项
- `src/components/bookmark/BookmarkFormModal.vue` - 集成 AI 功能
- `src/components/common/SearchBox.vue` - 优化搜索 placeholder

### AI 分类推荐 - 双重匹配策略 (2025-11-03)

#### 问题背景
AI 常将分类的 **name**（"Google"）误认为 **id**，导致验证失败：
```json
{
  "categoryId": "google",        // ❌ 这是 AI 从 name 推测的
  "categoryName": "Google"
}
```

而实际分类列表：
```typescript
[{ id: "abc-123-uuid", name: "Google" }]
```

#### 解决方案：双重匹配策略

**核心思路**：不强制 AI 理解 ID，而是采用容错匹配

**匹配策略**（按优先级）：
1. **ID 精确匹配**：优先通过 `categoryId` 查找
2. **Name 反向查找**：失败则通过 `categoryName` 查找（忽略大小写）
3. **兜底策略**：都失败则使用默认分类

**技术实现**：
```typescript
function findMatchingCategory(
  categoryId: string | undefined,
  categoryName: string | undefined,
  categories: CategoryOption[]
): CategoryOption | null {
  // 策略 1: ID 精确匹配
  if (categoryId?.trim()) {
    const byId = categories.find(c => c.id === categoryId.trim())
    if (byId) return byId
  }

  // 策略 2: Name 反向查找（忽略大小写）
  if (categoryName?.trim()) {
    const normalizedName = categoryName.toLowerCase().trim()
    const byName = categories.find(
      c => c.name.toLowerCase().trim() === normalizedName
    )
    if (byName) return byName
  }

  return null
}
```

**Prompt 简化**：
```
修改前（复杂）：
1. ID="abc-123" | 名称="Google"
重要说明：你必须返回 ID 字段的值...

修改后（简洁）：
1. Google
2. 开发工具
输出格式：{ "categoryName": "Google" }
```

**测试场景**：
- AI 返回 `"Google"` → Name 匹配成功 ✅
- AI 返回 `"google"` → Name 匹配成功（忽略大小写）✅
- AI 返回 `"abc-123"` → ID 匹配成功 ✅
- AI 返回 `"不存在"` → 使用默认分类 ✅

**优势**：
- ✅ 更强的容错性
- ✅ 更简洁的 Prompt（AI 更容易理解）
- ✅ 更好的用户体验

**提交记录**：
- `aa5c4a9` - 修复 AI 分类推荐的 ID 识别问题（Prompt 优化）
- `ecfccb8` - 实现双重匹配策略（最终方案）

---

### 后续优化建议

1. **批量处理**: 支持一次性导入多个书签的 AI 增强
2. **缓存机制**: 缓存已获取的元数据，减少 API 调用
3. **错误重试**: 失败时自动重试机制
4. **用量统计**: 显示 LinkPreview API 使用量
5. **自定义 Prompt**: 允许用户自定义 AI 推荐规则

### LinkPreview API 说明

**注册地址**: https://my.linkpreview.net

**免费额度**: 60 次/小时

**响应示例**:
```json
{
  "title": "GitHub - anthropics/claude-code",
  "description": "Official CLI for Claude by Anthropic",
  "image": "https://opengraph.githubassets.com/...",
  "url": "https://github.com/anthropics/claude-code"
}
```

**错误处理**:
- `{ "error": 400, "description": "Invalid URL" }`
- `{ "error": 429, "description": "Rate limit exceeded" }`

---

## Chrome 书签实时读取功能 (2025-11-06)

### 功能概述

实现了 Chrome 书签栏的实时读取和同步功能，无需手动导入，自动监听书签变化。

### 核心实现

#### 1. Chrome 书签服务 (`src/services/chrome-bookmarks.ts`)

**API 函数**:
- `getChromeBookmarksBar()` - 读取书签栏所有书签
- `watchChromeBookmarks(onUpdate)` - 监听书签变化（返回清理函数）
- `isChromeExtension()` - 环境检测
- `CHROME_BOOKMARKS_BAR_CATEGORY_ID` - 分类 ID 常量

**监听事件**:
- `onCreated` - 书签创建
- `onRemoved` - 书签删除
- `onChanged` - 书签修改（标题/URL）
- `onMoved` - 书签移动

**特性**:
- 300ms 防抖机制
- 仅监听书签栏（ID = "1"）
- 自动环境检测
- 错误容错处理

#### 2. Store 集成 (`src/stores/bookmark.ts`)

**新增状态**:
```typescript
const chromeBookmarks = ref<Bookmark[]>([])
let unwatchChrome: (() => void) | null = null
```

**新增方法**:
- `initChromeBookmarks()` - 初始化 Chrome 书签
- `startChromeBookmarksWatch()` - 启动监听
- `stopChromeBookmarksWatch()` - 停止监听

**filteredBookmarks 增强**:
```typescript
// Chrome 书签栏视图：显示 Chrome 书签
if (selectedCategoryId.value === CHROME_BOOKMARKS_BAR_CATEGORY_ID) {
  return chromeBookmarks.value
}
```

#### 3. UI 组件

**侧边栏分类**:
- 自动显示 "📌 Chrome 书签栏" 分类
- 位置：分类列表顶部（sort: -1）
- 颜色：#4285F4（Chrome 蓝）

**主页快捷方式** (`components/chrome/ChromeBookmarksBar.vue`):
- 横向排列书签
- 图标 + 标题
- 点击新标签页打开
- 响应式布局

#### 4. 类型定义 (`types/chrome.d.ts`)

扩展 Chrome Bookmarks API 类型：
```typescript
namespace chrome.bookmarks {
  interface BookmarkRemoveInfo { ... }
  interface BookmarkMoveInfo { ... }
  interface BookmarkChangeInfo { ... }

  const onCreated: EventListener
  const onRemoved: EventListener
  const onChanged: EventListener
  const onMoved: EventListener
}
```

### 数据流

```
Chrome Bookmarks API → getChromeBookmarksBar()
→ bookmarkStore.chromeBookmarks → UI 展示
→ watchChromeBookmarks() → 自动更新（300ms 防抖）
```

### 书签格式转换

```typescript
{
  id: `chrome-${node.id}`,           // Chrome ID + 前缀
  title: node.title || node.url,
  url: node.url!,
  categoryId: CHROME_BOOKMARKS_BAR_CATEGORY_ID,
  tags: [],
  createdAt: new Date(node.dateAdded),
  sort: node.index || 0
}
```

### 特性

**已实现**:
- ✅ 读取 Chrome 书签栏
- ✅ 实时监听书签变化（增删改移）
- ✅ 环境自动检测
- ✅ 侧边栏分类入口
- ✅ 主页快捷方式区域
- ✅ 防抖优化（300ms）
- ✅ TypeScript 类型安全

**限制**:
- 仅读取书签栏（不包括 "其他书签"）
- 仅读取链接（不包括文件夹）
- 只读模式（不能从 Navigator 修改 Chrome 书签）

### 使用场景

**Chrome 扩展环境**: 自动显示 Chrome 书签栏分类和快捷方式，自动监听变化

**非 Chrome 环境**: 静默跳过初始化，不影响正常使用

### 技术要点

- **书签栏 ID**: 固定为 `"1"`
- **防抖**: 300ms 内多次变化只触发一次更新
- **ID 隔离**: Chrome 书签 ID 加 `chrome-` 前缀
- **内存管理**: 监听器自动清理

### 文件清单

**新增**:
- `src/services/chrome-bookmarks.ts`
- `src/components/chrome/ChromeBookmarksBar.vue`
- `docs/chrome-bookmarks-feature.md`

**修改**:
- `src/stores/bookmark.ts`
- `src/views/Home.vue`
- `src/types/chrome.d.ts`

**验证**: TypeScript 检查通过 ✅

<!-- MANUAL ADDITIONS END -->
