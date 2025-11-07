# 设计模式和特殊功能

## 核心设计模式

### 1. Composition API 优先
项目全面采用 Vue 3 Composition API (`<script setup>`)：
- 更好的类型推断
- 更好的逻辑复用
- 更清晰的代码组织

### 2. 状态管理模式（Pinia）
**Store 组织**:
```typescript
// 定义 Store
export const useBookmarkStore = defineStore('bookmark', () => {
  // 状态
  const bookmarks = ref<Bookmark[]>([])
  
  // Getters（计算属性）
  const bookmarkCount = computed(() => bookmarks.value.length)
  
  // Actions（方法）
  async function addBookmark(data: CreateBookmarkData) {
    // 业务逻辑
  }
  
  return { bookmarks, bookmarkCount, addBookmark }
})
```

**Store 职责划分**:
- **bookmark**: 书签和分类的 CRUD、搜索、拖拽状态
- **config**: 应用配置、主题、侧边栏状态
- **homepage**: 主页网格布局配置

### 3. 组件通信模式

#### Props/Emits（父子组件）
```typescript
// 子组件
interface Props {
  show: boolean
}
interface Emits {
  (e: 'update:show', value: boolean): void
}

// 父组件使用
<Component v-model:show="modalState" />
```

#### 自定义事件（跨组件）
```typescript
// 触发事件
window.dispatchEvent(new CustomEvent('navigator-import'))

// 监听事件
window.addEventListener('navigator-import', handleImport)
```

#### Store（全局状态）
```typescript
const bookmarkStore = useBookmarkStore()
bookmarkStore.selectCategory(categoryId)
```

## 特殊功能实现

### 1. 拖拽功能（VueDraggable）
**书签拖拽**:
- 在分类内排序
- 跨分类移动
- 拖拽到"全部书签"分类

**分类拖拽**:
- 调整分类顺序
- 更改父分类
- 嵌套层级限制

**状态管理**:
```typescript
// 拖拽状态
const dragState = ref<{
  bookmarkIds: string[]
  dropTargetCategoryId: string | null
} | null>(null)
```

### 2. 侧边栏调整
**功能**:
- 宽度拖拽调整（200-600px）
- 收起/展开切换
- 收起时显示紧凑分类列表
- 状态持久化到 localStorage

**实现要点**:
```typescript
// 拖拽调整宽度
function startResize(event: MouseEvent) {
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'ew-resize'
}
```

### 3. 主页网格布局
**可配置项**:
- 列数（1-6 列）
- 书签置顶
- 分类置顶
- 自定义排序

**响应式设计**:
```typescript
const columnCount = computed(() => 
  homepageStore.gridSettings.columnCount
)
```

### 4. 搜索功能（Fuse.js）
**模糊搜索配置**:
```typescript
const fuse = new Fuse(bookmarks, {
  keys: ['title', 'url', 'description'],
  threshold: 0.3,
  includeScore: true
})
```

**搜索策略**:
- 标题、URL、描述全文搜索
- 按相关性排序
- 支持中文搜索

### 5. 主题系统
**支持模式**:
- light（亮色）
- dark（暗色）
- auto（跟随系统）

**实现**:
```typescript
const isDark = computed(() => {
  const theme = configStore.config.theme
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
})
```

## 数据持久化

### localStorage 策略
**存储内容**:
- 书签数据 (`navigator_bookmarks`)
- 分类数据 (`navigator_categories`)
- 应用配置 (`navigator_config`)
- 主页配置 (`navigator_homepage_config`)

**数据同步**:
```typescript
watch(
  () => configStore.config,
  (newConfig) => {
    localStorage.setItem('navigator_config', JSON.stringify(newConfig))
  },
  { deep: true }
)
```

## 性能优化

### 1. 代码分割
```typescript
// vite.config.ts
manualChunks: {
  vendor: ['vue', 'vue-router', 'pinia'],
  ui: ['naive-ui'],
  utils: ['fuse.js', 'dayjs', '@vueuse/core']
}
```

### 2. 构建优化
- 生产环境移除 console 和 debugger
- Terser 压缩
- Tree-shaking

### 3. 计算属性缓存
```typescript
// 自动缓存，只在依赖变化时重新计算
const filteredBookmarks = computed(() => 
  bookmarks.value.filter(/* ... */)
)
```

## 类型安全

### 严格类型定义
```typescript
// src/types/bookmark.ts
export interface Bookmark {
  id: string
  title: string
  url: string
  categoryId: string
  // ...
}

export interface Category {
  id: string
  name: string
  parentId?: string
  children?: Category[]
  // ...
}
```

### 类型守卫
```typescript
function isValidBookmark(data: any): data is Bookmark {
  return typeof data.id === 'string' && 
         typeof data.title === 'string'
}
```

## 错误处理

### API 调用
```typescript
try {
  const metadata = await fetchPageMetadata(url)
} catch (error) {
  console.error('获取元数据失败:', error)
  // 降级方案
}
```

### 用户提示
使用 Naive UI 的 notification：
```typescript
window.$notification.error({
  title: '操作失败',
  content: '无法获取网页信息，请检查 URL 是否有效'
})
```