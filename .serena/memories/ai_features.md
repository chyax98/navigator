# AI 智能功能详解

## 功能概述
Navigator 集成了 AI 智能增强功能，帮助用户更高效地管理书签。

## 核心 AI 功能

### 1. 网页元数据自动提取
**服务**: `src/services/metadata.ts`

**功能**:
- 使用 LinkPreview API 自动获取网页标题和描述
- 三层降级策略：
  1. LinkPreview API（最佳）
  2. 直接 fetch HTML（受 CORS 限制）
  3. 域名提取（兜底）

**API 配置**:
- 环境变量: `VITE_LINKPREVIEW_API_KEY`
- 用户设置: `configStore.config.linkPreviewApiKey`
- 免费额度: 60 次/小时

### 2. AI 智能分类推荐
**服务**: `src/services/ai/enhancement.ts`

**功能**:
- 基于 URL 和标题推荐最合适的分类
- 从现有分类中选择（不创建新分类）
- 提供推荐理由

**技术实现**:
- 使用硅基流动（SiliconFlow）OpenAI-Compatible API
- 温度参数: 0.3（保证稳定性）
- 输出格式: 严格 JSON

**匹配策略**:
- 优先通过分类名称匹配（忽略大小写）
- 支持 ID 精确匹配
- 容错性强，避免 AI 误解

### 3. AI 书签描述生成
**功能**:
- 根据 URL 和标题生成简短描述（15-30 字）
- 中文优化
- 便于用户快速了解书签内容

## AI 配置

### 硅基流动 API 配置
**环境变量（开发可选）**:
- `VITE_SILICONFLOW_API_KEY` - 默认 API 密钥
- `VITE_SILICONFLOW_BASE_URL` - 默认 Base URL（`https://api.siliconflow.cn/v1`）

**用户设置** (`src/types/config.ts`):
```typescript
interface AppConfig {
  siliconflowApiKey?: string
  siliconflowApiBaseUrl?: string
  embeddingModel?: string
  chatModel?: string
  linkPreviewApiKey?: string
}
```

### 配置优先级
```
用户设置 > 环境变量 > 默认值
```

## 使用场景

### 场景 1: 添加新书签
1. 用户粘贴 URL
2. 点击 "AI获取" 按钮
3. 自动填充标题、描述
4. AI 推荐分类
5. 用户确认或修改后保存

### 场景 2: 仅推荐分类
1. 用户已有标题和描述
2. 点击 "🤖 AI推荐分类" 按钮
3. AI 分析并推荐分类
4. 显示推荐理由

## Prompt 设计要点

### 分类推荐 Prompt
```typescript
const prompt = `你是一个书签管理助手。根据以下信息推荐最合适的分类：

URL: ${url}
标题: ${title}

现有分类：
${categoriesText}

请选择最合适的一个分类，输出格式：
{ "categoryName": "分类名称" }`
```

**关键点**:
- 简洁清晰，避免复杂指令
- 只返回分类名称，不返回 ID（容错）
- 严格 JSON 格式
- 中文优化

## 错误处理

### LinkPreview API 错误
- 400: 无效 URL
- 429: 超过速率限制
- 降级到直接 fetch 或域名提取

### 硅基流动 API 错误
- 网络错误: 提示用户检查配置
- 解析错误: 使用默认分类
- 空响应: 返回空结果

## 性能优化建议

1. **缓存元数据**: 对已获取的 URL 缓存结果
2. **批量处理**: 导入时批量调用 AI
3. **用量统计**: 显示 API 使用情况
4. **自定义 Prompt**: 允许用户调整推荐规则
