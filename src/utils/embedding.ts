/**
 * Embedding服务 - 基于OpenAI API
 * 负责生成文本向量嵌入，支持语义搜索和AI标签
 */

import OpenAI from 'openai'
import type { Bookmark } from '@/types/bookmark'
import { aiServiceManager } from '@/services/ai/ai-service-manager'

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
  model: string
}

export interface EmbeddingOptions {
  model?: string
  dimensions?: number // 可选：减少维度以节省存储
}

class EmbeddingService {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1秒
  private connectionCache: {
    isConnected: boolean
    lastChecked: number
    cacheDuration: number // 缓存5分钟
  } | null = null

  resetCache(): void {
    this.connectionCache = null
  }

  /**
   * 生成单个文本的embedding
   */
  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    if (!text?.trim()) {
      throw new Error('文本不能为空')
    }

    if (!aiServiceManager.hasValidApiKey()) {
      throw new Error('AI API密钥未配置')
    }

    const currentConfig = aiServiceManager.getConfig()
    const model = options.model || currentConfig.embeddingModel

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const client = aiServiceManager.getClient()
        const request: Parameters<OpenAI['embeddings']['create']>[0] = {
          model,
          input: text,
          encoding_format: 'float'
        }

        if (typeof options.dimensions === 'number') {
          request.dimensions = options.dimensions
        }

        const response = await client.embeddings.create(request)

        const embedding = response.data[0]?.embedding
        if (!embedding) {
          throw new Error('API返回的embedding为空')
        }

        return {
          embedding,
          tokens: response.usage?.total_tokens ?? 0,
          model
        }
      } catch (error: any) {
        console.warn(`Embedding API调用失败 (尝试 ${attempt}/${this.maxRetries}):`, error.message)

        if (attempt === this.maxRetries) {
          throw new Error(`生成embedding失败: ${error.message}`)
        }

        // 指数退避重试
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1))
      }
    }

    throw new Error('生成embedding失败：达到最大重试次数')
  }

  /**
   * 批量生成embedding
   */
  async generateEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResult[]> {
    if (!texts.length) return []

    if (!aiServiceManager.hasValidApiKey()) {
      throw new Error('AI API密钥未配置')
    }

    const currentConfig = aiServiceManager.getConfig()
    const model = options.model || currentConfig.embeddingModel

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const client = aiServiceManager.getClient()
        const request: Parameters<OpenAI['embeddings']['create']>[0] = {
          model,
          input: texts,
          encoding_format: 'float'
        }

        if (typeof options.dimensions === 'number') {
          request.dimensions = options.dimensions
        }

        const response = await client.embeddings.create(request)

        return response.data.map((item) => ({
          embedding: item.embedding,
          tokens: response.usage?.total_tokens
            ? response.usage.total_tokens / response.data.length
            : 0,
          model
        }))
      } catch (error: any) {
        console.warn(`批量Embedding API调用失败 (尝试 ${attempt}/${this.maxRetries}):`, error.message)

        if (attempt === this.maxRetries) {
          throw new Error(`批量生成embedding失败: ${error.message}`)
        }

        await this.delay(this.retryDelay * Math.pow(2, attempt - 1))
      }
    }

    throw new Error('批量生成embedding失败：达到最大重试次数')
  }

  /**
   * 为书签生成embedding - 智能文本构造策略
   */
  async generateBookmarkEmbedding(bookmark: Bookmark): Promise<EmbeddingResult> {
    // 1. 构造多层次的文本表示
    const textLayers = this.constructBookmarkText(bookmark)

    // 2. 使用加权组合策略
    const embeddingText = this.combineTextLayers(textLayers)

    const currentConfig = aiServiceManager.getConfig()
    const shouldLimitDimensions = currentConfig.provider === 'openai'

    return this.generateEmbedding(embeddingText, {
      model: currentConfig.embeddingModel,
      dimensions: shouldLimitDimensions ? 512 : undefined
    })
  }

  /**
   * 智能构造书签文本 - 核心算法
   */
  private constructBookmarkText(bookmark: Bookmark): {
    primary: string     // 主要内容（标题+描述）
    semantic: string    // 语义增强（标签+分类）
    contextual: string  // 上下文信息（URL特征）
    temporal?: string   // 时间特征（如果需要）
  } {
    // 主要内容层：标题和描述
    const primary = [
      bookmark.title,
      bookmark.description
    ].filter(Boolean).join('. ')

    // 语义增强层：标签和分类信息
    const semantic = [
      bookmark.tags.length > 0 ? `标签: ${bookmark.tags.join(', ')}` : '',
      bookmark.categoryId ? `分类: ${bookmark.categoryId}` : ''
    ].filter(Boolean).join('. ')

    // 上下文层：从URL提取有用信息
    const contextual = this.extractUrlContext(bookmark.url)

    return {
      primary: primary || bookmark.title, // 至少要有标题
      semantic,
      contextual
    }
  }

  /**
   * 从URL提取上下文信息
   */
  private extractUrlContext(url: string): string {
    try {
      const urlObj = new URL(url)
      const parts = []

      // 域名作为主要标识
      parts.push(`域名: ${urlObj.hostname}`)

      // 路径信息（去除查询参数和片段）
      const path = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '')
      if (path) {
        // 将路径转换为更可读的格式
        const readablePath = path
          .split('/')
          .filter(p => p && !p.match(/^\d+$/)) // 过滤纯数字
          .join(' ')
          .replace(/[-_]/g, ' ')
        if (readablePath) {
          parts.push(`路径: ${readablePath}`)
        }
      }

      // 顶级域名特征
      const tld = urlObj.hostname.split('.').pop()
      if (tld && ['com', 'org', 'net', 'edu', 'gov'].includes(tld)) {
        parts.push(`类型: ${tld}网站`)
      }

      return parts.join('. ')
    } catch {
      // URL解析失败，返回原始URL的简化版
      return `网址: ${url.replace(/^https?:\/\//, '')}`
    }
  }

  /**
   * 智能组合文本层 - 加权策略
   */
  private combineTextLayers(layers: {
    primary: string
    semantic: string
    contextual: string
    temporal?: string
  }): string {
    const parts = []

    // 主要内容权重最高（重复3次）
    if (layers.primary) {
      parts.push(layers.primary)
      parts.push(layers.primary) // 加权
    }

    // 语义信息中等权重
    if (layers.semantic) {
      parts.push(layers.semantic)
    }

    // 上下文信息补充
    if (layers.contextual) {
      parts.push(layers.contextual)
    }

    // 时间特征（如果有）
    if (layers.temporal) {
      parts.push(layers.temporal)
    }

    return parts.join('. ')
  }

  /**
   * 批量为书签生成embedding
   */
  async generateBookmarkEmbeddings(bookmarks: Bookmark[]): Promise<Map<string, EmbeddingResult>> {
    const results = new Map<string, EmbeddingResult>()

    // 分批处理，避免单次请求过大
    const batchSize = 10
    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize)
      const texts = batch.map(bookmark => [
        bookmark.title,
        bookmark.description,
        bookmark.url,
        bookmark.tags.join(' ')
      ].filter(Boolean).join(' '))

      try {
        const embeddings = await this.generateEmbeddings(texts)
        batch.forEach((bookmark, index) => {
          if (embeddings[index]) {
            results.set(bookmark.id, embeddings[index])
          }
        })
      } catch (error) {
        console.error(`批量处理书签embedding失败 (批次 ${Math.floor(i/batchSize) + 1}):`, error)
        // 继续处理下一批，不中断整个流程
      }
    }

    return results
  }

  /**
   * 计算余弦相似度
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('向量维度不匹配')
    }

    let dotProduct = 0
    let magnitude1 = 0
    let magnitude2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      magnitude1 += embedding1[i] * embedding1[i]
      magnitude2 += embedding2[i] * embedding2[i]
    }

    magnitude1 = Math.sqrt(magnitude1)
    magnitude2 = Math.sqrt(magnitude2)

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0
    }

    return dotProduct / (magnitude1 * magnitude2)
  }

  /**
   * 验证API连接（带缓存）
   */
  async validateConnection(): Promise<boolean> {
    const now = Date.now()
    const cacheDuration = 5 * 60 * 1000 // 5分钟缓存

    // 检查缓存是否有效
    if (this.connectionCache &&
        (now - this.connectionCache.lastChecked) < this.connectionCache.cacheDuration) {
      return this.connectionCache.isConnected
    }

    if (!aiServiceManager.hasValidApiKey()) {
      this.connectionCache = {
        isConnected: false,
        lastChecked: now,
        cacheDuration
      }
      return false
    }

    try {
      // 使用廉价的API调用来测试连接（不消耗embedding tokens）
      const client = aiServiceManager.getClient()
      await client.models.list()
      this.connectionCache = {
        isConnected: true,
        lastChecked: now,
        cacheDuration
      }
      return true
    } catch (error) {
      console.error('Embedding API连接验证失败:', error)
      this.connectionCache = {
        isConnected: false,
        lastChecked: now,
        cacheDuration
      }
      return false
    }
  }

  /**
   * 获取API使用统计
   */
  async getUsageStats(): Promise<{
    isConnected: boolean
    lastError?: string
  }> {
    const isConnected = await this.validateConnection()
    return {
      isConnected,
      lastError: isConnected ? undefined : 'API连接失败，请检查API配置'
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const embeddingService = new EmbeddingService()
export default embeddingService
