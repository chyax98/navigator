# AI智能搜索系统架构方案

## 概述

为个人导航站设计完整的AI智能搜索系统，基于纯前端环境实现语义搜索、智能分类和AI辅助功能。

## 技术架构

### 1. 核心技术栈
```
Frontend: Vue3 + TypeScript + Vite
AI Runtime: ONNX.js (轻量级推理引擎)
Vector DB: 自定义IndexedDB向量存储
Embedding: Multilingual-MiniLM-L6-v (轻量级多语言模型)
Search: 混合搜索 (Fuse.js + 向量相似度)
```

### 2. 系统架构图
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   搜索输入      │    │   AI处理引擎     │    │   结果展示      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • 搜索框        │    │ • Embedding模型   │    │ • 相关性排序     │
│ • 自动补全      │───▶│ • 向量计算        │───▶│ • 高亮显示      │
│ • 历史记录      │    │ • 相似度匹配      │    │ • 分类筛选      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   传统搜索      │    │   向量数据库      │    │   AI辅助功能    │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Fuse.js       │    │ • 向量存储        │    │ • 智能分类      │
│ • 关键词匹配    │    │ • 索引管理        │    │ • 重复检测      │
│ • 模糊搜索      │    │ • 缓存策略        │    │ • 内容摘要      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 实现方案

### Phase 1: 基础AI搜索 (2-3周)

#### 1.1 Embedding模型集成
```typescript
// src/utils/embedding.ts
export class EmbeddingService {
  private model: any = null
  private initialized = false

  async initialize() {
    // 加载ONNX模型
    this.model = await ort.InferenceSession.create('/models/embedding.onnx')
    this.initialized = true
  }

  async generateEmbedding(text: string): Promise<Float32Array> {
    if (!this.initialized) await this.initialize()

    // 文本预处理和tokenization
    const tokens = this.tokenize(text)

    // 模型推理
    const inputs = { input_ids: tokens }
    const outputs = await this.model.run(inputs)

    return outputs.last_hidden_state.data
  }
}
```

#### 1.2 向量数据库
```typescript
// src/utils/vector-db.ts
export class VectorDatabase {
  private dbName = 'BookmarkVectors'
  private storeName = 'embeddings'

  async storeEmbedding(id: string, embedding: Float32Array, metadata: any) {
    const db = await this.openDB()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)

    await store.put({
      id,
      embedding: Array.from(embedding),
      metadata,
      createdAt: Date.now()
    })
  }

  async searchSimilar(queryEmbedding: Float32Array, limit = 10) {
    const allEmbeddings = await this.getAllEmbeddings()

    // 计算余弦相似度
    const similarities = allEmbeddings.map(item => ({
      ...item,
      similarity: this.cosineSimilarity(queryEmbedding, new Float32Array(item.embedding))
    }))

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }
}
```

#### 1.3 智能搜索引擎
```typescript
// src/utils/ai-search.ts
export class AISearchEngine {
  constructor(
    private embeddingService: EmbeddingService,
    private vectorDB: VectorDatabase,
    private fuseSearch: FuseSearch
  ) {}

  async search(query: string, options: SearchOptions = {}) {
    // 生成查询向量
    const queryEmbedding = await this.embeddingService.generateEmbedding(query)

    // 向量搜索
    const vectorResults = await this.vectorDB.searchSimilar(queryEmbedding, options.limit)

    // 传统搜索
    const textResults = await this.fuseSearch.search(query, options)

    // 混合排序
    return this.hybridRanking(vectorResults, textResults, query)
  }

  private hybridRanking(vectorResults: any[], textResults: any[], query: string) {
    // 合并和重新排序结果
    const combined = new Map()

    // 向量结果权重 0.6
    vectorResults.forEach((item, index) => {
      combined.set(item.id, {
        ...item.metadata,
        score: item.similarity * 0.6,
        vectorRank: index,
        textRank: Infinity
      })
    })

    // 文本结果权重 0.4
    textResults.forEach((item, index) => {
      if (combined.has(item.id)) {
        const existing = combined.get(item.id)
        existing.score += (1 - index / textResults.length) * 0.4
        existing.textRank = index
      } else {
        combined.set(item.id, {
          ...item,
          score: (1 - index / textResults.length) * 0.4,
          vectorRank: Infinity,
          textRank: index
        })
      }
    })

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
  }
}
```

### Phase 2: AI辅助功能 (3-4周)

#### 2.1 智能分类
```typescript
// src/utils/ai-classifier.ts
export class AIClassifier {
  async suggestCategory(bookmark: Bookmark): Promise<string[]> {
    const text = `${bookmark.title} ${bookmark.description || ''}`
    const embedding = await this.embeddingService.generateEmbedding(text)

    // 与分类名称进行相似度计算
    const categories = await this.getCategoryEmbeddings()
    return categories
      .map(cat => ({
        name: cat.name,
        similarity: this.cosineSimilarity(embedding, cat.embedding)
      }))
      .filter(cat => cat.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(cat => cat.name)
  }

  async generateTags(bookmark: Bookmark): Promise<string[]> {
    // 基于内容生成标签建议
    const text = `${bookmark.title} ${bookmark.description || ''} ${bookmark.url}`
    const keywords = await this.extractKeywords(text)
    return keywords.slice(0, 5)
  }
}
```

#### 2.2 重复检测
```typescript
// src/utils/duplicate-detector.ts
export class DuplicateDetector {
  async findSimilarBookmarks(bookmark: Bookmark): Promise<Bookmark[]> {
    const text = `${bookmark.title} ${bookmark.description || ''}`
    const embedding = await this.embeddingService.generateEmbedding(text)

    const similar = await this.vectorDB.searchSimilar(embedding, 10)
    return similar
      .filter(item => item.similarity > 0.8 && item.id !== bookmark.id)
      .map(item => item.metadata)
  }
}
```

#### 2.3 内容摘要
```typescript
// src/utils/summarizer.ts
export class ContentSummarizer {
  async summarizeBookmark(bookmark: Bookmark): Promise<string> {
    // 基于标题和描述生成简短摘要
    const text = bookmark.description || bookmark.title

    // 使用简���的提取式摘要
    const sentences = text.split(/[.!?]+/)
    if (sentences.length <= 1) return text

    // 选择最重要的句子
    const scores = await this.rankSentences(sentences)
    const topSentences = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.sentence)

    return topSentences.join('. ')
  }
}
```

### Phase 3: 性能优化 (2-3周)

#### 3.1 Web Worker集成
```typescript
// src/workers/ai-worker.ts
self.onmessage = async (e) => {
  const { type, data } = e.data

  switch (type) {
    case 'EMBEDDING':
      const embedding = await generateEmbedding(data.text)
      self.postMessage({ type: 'EMBEDDING_RESULT', data: embedding })
      break

    case 'SEARCH':
      const results = await performSearch(data.query, data.options)
      self.postMessage({ type: 'SEARCH_RESULT', data: results })
      break
  }
}
```

#### 3.2 缓存策略
```typescript
// src/utils/cache.ts
export class EmbeddingCache {
  private cache = new Map<string, Float32Array>()
  private maxSize = 1000

  async get(key: string): Promise<Float32Array | null> {
    const cached = localStorage.getItem(`embedding_${key}`)
    if (cached) {
      return new Float32Array(JSON.parse(cached))
    }
    return this.cache.get(key) || null
  }

  async set(key: string, embedding: Float32Array) {
    // 内存缓存
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, embedding)

    // 持久化缓存
    localStorage.setItem(`embedding_${key}`, JSON.stringify(Array.from(embedding)))
  }
}
```

## 用户界面集成

### 智能搜索框
```vue
<template>
  <div class="ai-search-box">
    <n-input
      v-model:value="searchQuery"
      placeholder="输入关键词或语义搜索..."
      @input="handleSearch"
      @keydown.down="highlightNext"
      @keydown.up="highlightPrevious"
      @keydown.enter="selectResult"
    >
      <template #prefix>
        <n-icon :component="SearchIcon" />
      </template>
      <template #suffix>
        <n-button
          v-if="searchQuery"
          text
          size="small"
          @click="clearSearch"
        >
          <n-icon :component="CloseIcon" />
        </n-button>
      </template>
    </n-input>

    <!-- 搜索建议 -->
    <div v-if="suggestions.length" class="search-suggestions">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.id"
        class="suggestion-item"
        :class="{ highlighted: index === highlightedIndex }"
        @click="selectSuggestion(suggestion)"
      >
        <div class="suggestion-title">{{ suggestion.title }}</div>
        <div class="suggestion-url">{{ suggestion.url }}</div>
        <div class="suggestion-score">{{ Math.round(suggestion.score * 100) }}% 匹配</div>
      </div>
    </div>
  </div>
</template>
```

### AI功能面板
```vue
<template>
  <n-card title="AI 智能助手">
    <n-space vertical>
      <n-button @click="detectDuplicates">
        <template #icon>
          <n-icon><FindDuplicateIcon /></n-icon>
        </template>
        检测重复书签
      </n-button>

      <n-button @click="suggestCategories">
        <template #icon>
          <n-icon><CategoryIcon /></n-icon>
        </template>
        智能分类建议
      </n-button>

      <n-button @click="generateTags">
        <template #icon>
          <n-icon><TagIcon /></n-icon>
        </template>
        批量生成标签
      </n-button>
    </n-space>
  </n-card>
</template>
```

## 性能优化策略

### 1. 模型优化
- **模型量化**: 使用8位量化减少模型大小
- **模型剪枝**: 移除不重要的模型参数
- **动态加载**: 按需加载AI功能模块

### 2. 计算优化
- **批处理**: 批量计算embedding提高效率
- **缓存策略**: 缓存常用查询结果
- **Web Workers**: 后台处理避免阻塞UI

### 3. 存储优化
- **向量压���**: 使用PCA降维减少存储空间
- **索引优化**: 建立高效的向量索引
- **分页加载**: 大数据集分页处理

## 实施计划

### 第一阶段 (2-3周)
- [x] 项目架构设计
- [ ] Embedding服务集成
- [ ] 向量数据库实现
- [ ] 基础语义搜索
- [ ] 混合搜索排序

### 第二阶段 (3-4周)
- [ ] 智能分类建议
- [ ] 重复内容检测
- [ ] 自动标签生成
- [ ] 内容摘要功能

### 第三阶段 (2-3周)
- [ ] Web Worker集成
- [ ] 缓存系统优化
- [ ] 性能监控
- [ ] 用户体验优化

### 第四阶段 (1-2周)
- [ ] 全面测试
- [ ] 性能调优
- [ ] 文档完善
- [ ] 部署准备

## 技术难点与解决方案

### 1. 模型大小限制
**问题**: 浏览器环境内存限制
**解决**:
- 使用轻量级模型 (MiniLM系列)
- 模型量化和剪枝
- 按需加载和卸载

### 2. 计算性能
**问题**: 前端计算能力有限
**解决**:
- Web Workers后台计算
- 批处理优化
- 缓存策略

### 3. 数据隐私
**问题**: 用户数据安全
**解决**:
- 完全本地处理
- 不上传任何数据
- 可选的云端同步

## 预期效果

### 搜索体验提升
- **语义理解**: 支持自然语言查询
- **相关性提升**: 基于语义相似度排序
- **多模态搜索**: 标题、内容、标签综合搜索

### AI辅助功能
- **智能分类**: 自动推荐合适的分类
- **重复检测**: 避免收藏重复内容
- **标签建议**: 基于内容自动生成标签

### 性能表现
- **响应时间**: <500ms (缓存命中)
- **准确率**: >85% (语义搜索)
- **内存占用**: <100MB (包含模型)

这个AI智能搜索系统将显著提升用户的搜索体验，同时保持应用的轻量级特性和隐私保护。