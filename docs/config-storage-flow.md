# 配置存储流程详解

## 存储架构

### 核心组件

```
┌─────────────────────────────────────────────────────────┐
│                   应用启动流程                             │
├─────────────────────────────────────────────────────────┤
│ 1. main.ts                                              │
│    └─ 创建 Pinia + 挂载应用                              │
│                                                         │
│ 2. AppLayout.vue (setup 阶段)                           │
│    ├─ 初始化 sidebarWidth = DEFAULT_WIDTH               │
│    ├─ 初始化 isCollapsed = false                        │
│    └─ watch(config) → 等待配置加载后同步 ✅               │
│                                                         │
│ 3. App.vue (onMounted)                                  │
│    └─ configStore.loadConfig()                          │
│       └─ storageManager.getConfig()                     │
│          └─ IndexedDB 读取配置                           │
│             └─ 触发 watch → 组件状态更新 ✅               │
└─────────────────────────────────────────────────────────┘
```

### 存储层

```
storage-factory.ts (环境检测)
    ↓
    ├─ Web 环境: IndexedDBStorageAdapter
    │   └─ storage.ts (IndexedDB 实现)
    │      └─ NavigatorDB.config (ObjectStore)
    │
    └─ Extension 环境: ChromeStorageProxy
        └─ chrome-storage.ts (chrome.storage.local)
```

## 配置写入路径

### 1. Settings.vue（设置页面）

| 配置项 | 触发事件 | 处理函数 | Store 方法 | 存储 |
|--------|---------|---------|-----------|------|
| theme | @update:value | handleThemeChange | setTheme | ✅ |
| showFavicon | @update:value | handleConfigUpdate | updateConfig | ✅ |
| enableSemanticSearch | @update:value | handleSemanticSearchToggle | updateSemanticSearchConfig | ✅ |
| aiApiProvider | @update:value | handleApiProviderChange | updateSemanticSearchConfig | ✅ |
| openaiApiKey | @update:value | handleApiKeyChange | updateSemanticSearchConfig | ✅ |
| siliconflowApiBaseUrl | @update:value | handleSiliconflowBaseUrlChange | updateSemanticSearchConfig | ✅ |
| siliconflowApiKey | @update:value | handleApiKeyChange | updateSemanticSearchConfig | ✅ |
| embeddingModel | @update:value | handleEmbeddingModelChange | updateSemanticSearchConfig | ✅ |
| chatModel | @update:value | handleChatModelChange | updateSemanticSearchConfig | ✅ |
| semanticWeight | @update:value | handleConfigUpdate | updateConfig | ✅ |
| linkPreviewApiKey | @update:value | handleLinkPreviewApiKeyChange | updateConfig | ✅ |

**数据流：**
```
用户操作 → v-model 修改内存中的 config
         ↓
    @update:value 触发
         ↓
    handleXxxChange()
         ↓
    configStore.updateConfig() / updateSemanticSearchConfig()
         ↓
    storageManager.saveConfig()
         ↓
    IndexedDB 持久化 ✅
```

### 2. AppLayout.vue（侧边栏布局）

| 配置项 | 触发方式 | Store 方法 | 存储 |
|--------|---------|-----------|------|
| sidebarWidth | 拖动调整 + mouseup | updateConfig | ✅ |
| sidebarWidth | 双击重置 | updateConfig | ✅ |
| sidebarCollapsed | 点击切换按钮 | updateConfig | ✅ |

**修复前问题：**
```typescript
// ❌ setup 时直接读取（此时 config 还未从 IndexedDB 加载）
const sidebarWidth = ref(configStore.config.sidebarWidth ?? DEFAULT_WIDTH)
const isCollapsed = ref(configStore.config.sidebarCollapsed ?? false)
```

**修复后：**
```typescript
// ✅ 使用默认值初始化，通过 watch 同步
const sidebarWidth = ref<number>(DEFAULT_WIDTH)
const isCollapsed = ref<boolean>(false)

watch(
  () => configStore.config,
  (config) => {
    sidebarWidth.value = config.sidebarWidth ?? DEFAULT_WIDTH
    isCollapsed.value = config.sidebarCollapsed ?? false
  },
  { immediate: true, deep: true }
)
```

### 3. GridSettingsPanel.vue（网格列数设置）

| 配置项 | 触发方式 | Store 方法 | 存储 |
|--------|---------|-----------|------|
| gridColumns | 滑块调整 | updateConfig | ✅ |

**修复前问题：**
```typescript
// ❌ setup 时直接读取
const columns = ref(configStore.config.gridColumns)

// ⚠️ watch 缺少 immediate: true
watch(() => configStore.config.gridColumns, (newColumns) => {
  columns.value = newColumns
})
```

**修复后：**
```typescript
// ✅ 使用默认值初始化，添加 immediate
const columns = ref<number>(GRID_COLUMN_CONSTRAINTS.DEFAULT)

watch(
  () => configStore.config.gridColumns,
  (newColumns) => {
    columns.value = newColumns
  },
  { immediate: true }
)
```

### 4. SortSelector.vue（排序选择器）

| 配置项 | 触发方式 | Store 方法 | 存储 |
|--------|---------|-----------|------|
| homepageSortType | 选择排序方式 | setHomepageSortType | ✅ |
| categorySortType | 选择排序方式 | setCategorySortType | ✅ |

### 5. TheHeader.vue（顶部导航栏）

| 配置项 | 触发方式 | Store 方法 | 存储 |
|--------|---------|-----------|------|
| theme | 点击主题切换按钮 | setTheme | ✅ |

## Store 方法实现

### updateConfig (通用更新)

```typescript
async function updateConfig(updates: Partial<AppConfig>): Promise<void> {
  config.value = { ...config.value, ...updates }
  await storageManager.saveConfig(config.value)
}
```

### setTheme (主题设置)

```typescript
async function setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
  config.value.theme = theme
  await storageManager.saveConfig(config.value)
  applyTheme(theme)
}
```

### updateSemanticSearchConfig (AI 配置)

```typescript
async function updateSemanticSearchConfig(updates: {
  enableSemanticSearch?: boolean
  semanticWeight?: number
  // ... 其他 AI 相关配置
}): Promise<void> {
  config.value = { ...config.value, ...updates }
  await storageManager.saveConfig(config.value)
  await syncAiClients()
}
```

### setHomepageSortType / setCategorySortType (排序配置)

```typescript
function setHomepageSortType(sortType: BookmarkSortType) {
  config.value.homepageSortType = sortType
  void storageManager.saveConfig(config.value)
}

function setCategorySortType(sortType: BookmarkSortType) {
  config.value.categorySortType = sortType
  void storageManager.saveConfig(config.value)
}
```

⚠️ **注意：** 这两个方法使用 `void` 而不是 `await`，不会阻塞调用者，但也不会报告保存失败。

## 配置读取路径

### 1. 应用启动时（App.vue）

```typescript
onMounted(async () => {
  // 1. 加载配置
  await configStore.loadConfig()

  // 2. 应用主题
  // ...

  // 3. 加载书签数据
  await bookmarkStore.loadBookmarks()
})
```

### 2. loadConfig 实现

```typescript
async function loadConfig() {
  const saved = await storageManager.getConfig()
  if (saved) {
    config.value = { ...defaultConfig, ...saved }
  }

  // 同步 AI 客户端配置
  await syncAiClients()
}
```

### 3. storageManager.getConfig (IndexedDB)

```typescript
async getConfig(): Promise<AppConfig | null> {
  await this.ensureInitialized()

  return new Promise((resolve, reject) => {
    const transaction = this.db!.transaction(['config'], 'readonly')
    const store = transaction.objectStore('config')
    const request = store.get('app-config')

    request.onsuccess = () => {
      const result = request.result
      if (result) {
        const { id, ...config } = result
        resolve(config as AppConfig)
      } else {
        resolve(null)
      }
    }
    request.onerror = () => reject(request.error)
  })
}
```

## 问题总结

### 已修复的问题

1. **AppLayout.vue 时序问题**
   - 问题：setup 时读取配置早于 IndexedDB 加载
   - 修复：使用 watch + immediate: true 监听配置变化

2. **GridSettingsPanel.vue 时序问题**
   - 问题：watch 缺少 immediate: true
   - 修复：添加 immediate: true，确保初始同步

### 验证清单

- [x] 所有配置修改都调用了 saveConfig
- [x] Settings.vue 所有字段都有 @update:value 处理器
- [x] AppLayout.vue 使用 watch 同步配置
- [x] GridSettingsPanel.vue 使用 watch + immediate 同步配置
- [x] TypeScript 类型检查通过
- [ ] 实际测试配置持久化（需要用户验证）

## 测试建议

1. **侧边栏宽度**
   - 拖动调整侧边栏宽度到 400px
   - 刷新页面
   - 验证宽度保持为 400px ✓

2. **侧边栏收起状态**
   - 点击收起按钮
   - 刷新页面
   - 验证侧边栏保持收起状态 ✓

3. **网格列数**
   - 在布局设置中调整列数为 5
   - 刷新页面
   - 验证列数保持为 5 ✓

4. **主题设置**
   - 切换到暗色主题
   - 刷新页面
   - 验证主题保持为暗色 ✓

5. **AI 配置**
   - 启用语义搜索并配置 API Key
   - 刷新页面
   - 验证配置保持 ✓

## 结论

配置存储机制本身是正确的，所有修改操作都会调用 `saveConfig` 保存到 IndexedDB。

**唯一的问题**是组件初始化时序导致的读取失败：

- 组件在 `setup` 阶段读取配置时，IndexedDB 还未加载完成
- 使用 `watch + immediate: true` 可以确保配置加载完成后自动同步到组件状态

修复后，配置应该可以正确持久化。
