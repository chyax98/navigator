# Navigator

现代化的个人导航站，支持书签管理、AI 智能增强、Chrome 扩展。

## 特性

- 🎯 **智能书签管理**: 分类组织、标签管理、快速搜索
- 🤖 **AI 增强**: 自动获取网页元数据、智能分类推荐
- 📚 **Chrome 书签同步**: 实时读取 Chrome 书签栏，自动监听变化
- 🎨 **灵活布局**: 网格/列表视图，拖拽排序，个性化配置
- 🔌 **浏览器扩展**: 一键替换新标签页，即开即用
- 💾 **本地优先**: 所有数据存储在本地，隐私安全

---

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npx vue-tsc --noEmit
```

### Chrome 扩展

```bash
# 构建扩展
npm run build:ext

# 开发模式（热重载）
npm run dev:ext

# 打包发布
npm run pack:ext
```

详细说明见 [扩展文档](./extension/README.md)。

---

## 技术栈

**前端框架**:

- Vue 3.4 + TypeScript 5.9
- Pinia 2.1 (状态管理)
- Naive UI 2.38 (UI 组件)
- Vite 5.0 (构建工具)

**核心功能**:

- VueDraggable 4.1 (拖拽排序)
- @vueuse/core 10.7 (工具库)
- Fuse.js 7.0 (模糊搜索)
- Storage Adapter (统一存储接口)
- Chrome Bookmarks API (书签同步)

**AI 集成**:

- LinkPreview API (元数据提取)
- OpenAI API (分类推荐)

---

## 项目结构

```
navigator/
├── src/                    # 源代码
│   ├── components/         # Vue 组件
│   ├── stores/             # Pinia 状态管理
│   ├── services/           # 业务逻辑
│   │   ├── storage/        # 存储服务
│   │   ├── ai/             # AI 服务
│   │   └── chrome-bookmarks.ts  # Chrome 书签
│   ├── utils/              # 工具函数
│   ├── types/              # TypeScript 类型
│   └── views/              # 页面视图
│
├── extension/              # Chrome 扩展配置
│   ├── manifest.json       # 扩展清单
│   ├── icons/              # 扩展图标
│   └── *.md                # 扩展文档
│
└── public/                 # 静态资源
```

---

## 核心功能

### 1. 智能书签管理

- **分类组织**: 多级分类，树形结构
- **标签系统**: 灵活标签，快速筛选
- **全文搜索**: 标题、描述、URL、标签全文搜索
- **批量操作**: 批量编辑、批量删除

### 2. AI 智能增强

**自动元数据提取**:

- 网页标题自动获取
- 描述信息自动提取
- 三层降级策略（API → HTML → 域名）

**智能分类推荐**:

- 基于 URL 和标题分析
- 从现有分类中推荐最合适的分类
- 提供推荐理由

### 3. Chrome 书签同步

- **实时读取**: 读取 Chrome 书签栏所有书签
- **自动监听**: 监听增删改移操作
- **防抖优化**: 300ms 防抖，避免频繁更新
- **环境检测**: 自动检测 Chrome 扩展环境

### 4. 灵活布局

**网格视图**:

- 1-6 列自由调整
- 拖拽排序
- 卡片式设计

**列表视图**:

- 密集信息展示
- 快速浏览
- 批量操作

### 5. 浏览器扩展

- **新标签页替换**: 打开新标签即可访问
- **书签同步**: 使用 Chrome 原生书签 API
- **本地存储**: chrome.storage.local，隐私安全
- **快速访问**: 无需打开网页，即开即用

---

## 存储系统

### 统一存储接口

Navigator 使用存储适配层自动检测运行环境：

- **Web 环境**: `localStorage`
- **Extension 环境**: `chrome.storage.local`

### 快速使用

```typescript
import { getStorage } from '@/utils/storage-factory'

const storage = getStorage()

// 读取书签
const bookmarks = await storage.getBookmarks()

// 保存书签
await storage.saveBookmark(bookmark)

// 删除书签
await storage.deleteBookmark(id)

// 导出数据
const json = await storage.exportData()

// 导入数据
await storage.importData(jsonString)
```

### 核心 API

```typescript
// 书签操作
getBookmarks(): Promise<Bookmark[]>
saveBookmark(bookmark: Bookmark): Promise<void>
deleteBookmark(id: string): Promise<void>

// 分类操作
getCategories(): Promise<Category[]>
saveCategories(categories: Category[]): Promise<void>

// 配置操作
getConfig(): Promise<AppConfig | null>
saveConfig(config: AppConfig): Promise<void>

// 数据管理
exportData(): Promise<string>
importData(jsonData: string): Promise<void>
clearAll(): Promise<void>
```

---

## 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```bash
# LinkPreview API（网页元数据提取）
VITE_LINKPREVIEW_API_KEY=your-api-key

# AI 功能（可选）
VITE_OPENAI_API_KEY=your-openai-key
VITE_CUSTOM_API_BASE_URL=https://api.example.com/v1
```

---

## 开发指南

### 代码规范

- **TypeScript**: 严格模式，完整类型注解
- **Vue 3**: Composition API + `<script setup>`
- **命名**: camelCase (变量/函数)，PascalCase (组件/类型)
- **格式**: ESLint + Prettier

### Store 集成模式

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage } from '@/utils/storage-factory'

export const useBookmarkStore = defineStore('bookmark', () => {
  const storage = getStorage()
  const bookmarks = ref<Bookmark[]>([])

  async function loadBookmarks() {
    bookmarks.value = await storage.getBookmarks()
  }

  async function saveBookmark(bookmark: Bookmark) {
    await storage.saveBookmark(bookmark)
    await loadBookmarks()
  }

  return { bookmarks, loadBookmarks, saveBookmark }
})
```

### 错误处理

```typescript
try {
  await storage.saveBookmark(bookmark)
  message.success('保存成功')
} catch (error) {
  console.error('保存失败:', error)
  message.error('保存失败')
}
```

### 提交规范

使用约定式提交（Conventional Commits）：

```
feat: 新增功能
fix: 修复问题
docs: 文档更新
refactor: 重构代码
chore: 构建配置
```

---

## Chrome Extension 开发

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Navigator",
  "permissions": ["storage", "bookmarks"]
}
```

### Background Script

```typescript
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Navigator] Extension installed')
})

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('[Navigator] Bookmark created:', bookmark)
})
```

详细说明见 [扩展文档](./extension/README.md)。

---

## 故障排查

### TypeError: storage.getBookmarks is not a function

**原因**: 未正确初始化存储

**解决**:

```typescript
import { getStorage } from '@/utils/storage-factory'
const storage = getStorage()  // ✅ 正确
```

### Chrome Storage API not available

**原因**: 不在 Chrome Extension 环境

**解决**:

```typescript
import { getEnvironmentInfo } from '@/utils/storage-factory'

if (getEnvironmentInfo().isExtension) {
  // 执行扩展特定代码
}
```

---

## 路线图

- [x] 基础书签管理
- [x] 分类和标签系统
- [x] 全文搜索
- [x] AI 智能增强
- [x] Chrome 书签同步
- [x] Chrome 扩展支持
- [x] 网格/列表布局
- [ ] 云同步功能
- [ ] Firefox 扩展支持
- [ ] 移动端适配

---

## 贡献

欢迎贡献代码、报告问题、提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 许可证

MIT License

---

**Navigator** - 让浏览更高效，让导航更智能。
