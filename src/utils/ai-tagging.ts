/**
 * AI标签生成服务 - 基于OpenAI API
 * 实现智能标签生成和AI+人工协同标签管理
 */

import OpenAI from 'openai'
import type { Bookmark } from '@/types/bookmark'
import { aiServiceManager } from '@/services/ai/ai-service-manager'

function getChatClient(): OpenAI {
  if (!aiServiceManager.hasValidApiKey()) {
    throw new Error('AI API配置未初始化，请在设置中配置API信息')
  }
  return aiServiceManager.getClient()
}

export interface AITagSuggestion {
  tag: string
  confidence: number // 0-1之间的置信度
  reason: string // AI生成这个标签的原因
  category?: string // 建议的分类
}

export interface TagAnalysisResult {
  suggestedTags: AITagSuggestion[]
  existingTags: string[] // 用户已有的标签
  conflicts: string[] // 与现有标签的冲突
  recommendations: string[] // 改进建议
}

export interface TagGenerationOptions {
  maxTags?: number // 最多生成标签数
  minConfidence?: number // 最小置信度阈值
  includeCategories?: boolean // 是否包含分类建议
  language?: string // 输出语言
}

class AITaggingService {
  private readonly maxRetries = 2
  private readonly defaultMaxTags = 5
  private readonly defaultMinConfidence = 0.3

  /**
   * 为书签生成AI标签建议
   */
  async generateTagsForBookmark(
    bookmark: Bookmark,
    options: TagGenerationOptions = {}
  ): Promise<TagAnalysisResult> {
    const {
      maxTags = this.defaultMaxTags,
      minConfidence = this.defaultMinConfidence,
      includeCategories = true,
      language = 'zh-CN'
    } = options

    try {
      // 构造提示词
      const prompt = this.buildTagGenerationPrompt(bookmark, {
        maxTags,
        includeCategories,
        language
      })

      const response = await this.callOpenAI(prompt)
      const analysis = this.parseTagResponse(response, bookmark.tags)

      // 过滤低置信度标签
      analysis.suggestedTags = analysis.suggestedTags.filter(
        tag => tag.confidence >= minConfidence
      )

      return analysis
    } catch (error) {
      console.error('AI标签生成失败:', error)
      return {
        suggestedTags: [],
        existingTags: bookmark.tags,
        conflicts: [],
        recommendations: ['AI标签生成暂时不可用，请稍后重试']
      }
    }
  }

  /**
   * 批量生成标签（用于导入时）
   */
  async generateTagsBatch(
    bookmarks: Bookmark[],
    options: TagGenerationOptions = {}
  ): Promise<Map<string, TagAnalysisResult>> {
    const results = new Map<string, TagAnalysisResult>()

    // 分批处理，避免API限制
    const batchSize = 5
    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize)

      // 并行处理一批书签
      const promises = batch.map(bookmark =>
        this.generateTagsForBookmark(bookmark, options)
      )

      try {
        const batchResults = await Promise.all(promises)
        batch.forEach((bookmark, index) => {
          results.set(bookmark.id, batchResults[index])
        })
      } catch (error) {
        console.error(`批量标签生成失败 (批次 ${Math.floor(i/batchSize) + 1}):`, error)
        // 为失败的书签设置空结果
        batch.forEach(bookmark => {
          results.set(bookmark.id, {
            suggestedTags: [],
            existingTags: bookmark.tags,
            conflicts: [],
            recommendations: ['批量处理失败，请单独生成']
          })
        })
      }

      // 批次间暂停，避免API限制
      if (i + batchSize < bookmarks.length) {
        await this.delay(1000)
      }
    }

    return results
  }

  /**
   * 分析现有标签质量
   */
  async analyzeTagQuality(bookmarks: Bookmark[]): Promise<{
    quality: 'good' | 'fair' | 'poor'
    suggestions: string[]
    statistics: {
      totalBookmarks: number
      averageTagsPerBookmark: number
      uniqueTags: number
      unusedTags: string[]
    }
  }> {
    const allTags = new Map<string, number>()
    let totalTags = 0

    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => {
        allTags.set(tag, (allTags.get(tag) || 0) + 1)
        totalTags++
      })
    })

    const uniqueTags = allTags.size
    const averageTagsPerBookmark = totalTags / bookmarks.length
    const unusedTags = Array.from(allTags.entries())
      .filter(([, count]) => count === 1)
      .map(([tag]) => tag)

    let quality: 'good' | 'fair' | 'poor' = 'fair'
    const suggestions: string[] = []

    if (averageTagsPerBookmark < 1) {
      quality = 'poor'
      suggestions.push('建议为书签添加更多标签，便于搜索和组织')
    } else if (averageTagsPerBookmark > 5) {
      quality = 'fair'
      suggestions.push('标签数量较多，建议检查是否有冗余标签')
    } else {
      quality = 'good'
      suggestions.push('标签质量良好，继续保持')
    }

    if (unusedTags.length > uniqueTags * 0.5) {
      suggestions.push('存在较多只使用一次的标签，建议合并或删除')
    }

    return {
      quality,
      suggestions,
      statistics: {
        totalBookmarks: bookmarks.length,
        averageTagsPerBookmark,
        uniqueTags,
        unusedTags
      }
    }
  }

  /**
   * 智能标签去重和合并建议
   */
  async suggestTagConsolidation(bookmarks: Bookmark[]): Promise<{
    duplicates: Array<{ original: string; suggestion: string; count: number }>
    similar: Array<{ tag1: string; tag2: string; similarity: number }>
  }> {
    const tagFrequency = new Map<string, number>()

    // 统计标签频率
    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1)
      })
    })

    const tags = Array.from(tagFrequency.keys())

    // 检测相似标签
    const similar: Array<{ tag1: string; tag2: string; similarity: number }> = []

    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const similarity = this.calculateTagSimilarity(tags[i], tags[j])
        if (similarity > 0.8) { // 相似度阈值
          similar.push({
            tag1: tags[i],
            tag2: tags[j],
            similarity
          })
        }
      }
    }

    // 检测重复标签（大小写不同等）
    const duplicates: Array<{ original: string; suggestion: string; count: number }> = []
    const normalizedTags = new Map<string, string>()

    tags.forEach(tag => {
      const normalized = tag.toLowerCase().trim()
      const existing = normalizedTags.get(normalized)

      if (existing && existing !== tag) {
        duplicates.push({
          original: tag,
          suggestion: existing,
          count: tagFrequency.get(tag) || 0
        })
      } else {
        normalizedTags.set(normalized, tag)
      }
    })

    return { duplicates, similar }
  }

  /**
   * 构建标签生成提示词
   */
  private buildTagGenerationPrompt(
    bookmark: Bookmark,
    options: { maxTags: number; includeCategories: boolean; language: string }
  ): string {
    const { maxTags, includeCategories, language } = options

    const prompt = `请为以下网页书签生成${maxTags}个最相关的标签。

网页信息：
- 标题：${bookmark.title}
- 描述：${bookmark.description || '无'}
- URL：${bookmark.url}
- 现有标签：${bookmark.tags.length > 0 ? bookmark.tags.join('、') : '无'}

要求：
1. 标签应该简洁、准确、有意义
2. 优先考虑网页的核心主题和内容
3. 避免过于宽泛的标签（如"网页"、"网站"）
4. 标签长度控制在2-8个字符
5. 输出语言：${language === 'zh-CN' ? '中文' : '英文'}

${includeCategories ? '6. 如果可能，建议一个最合适的分类' : ''}

请以JSON格式输出：
{
  "tags": [
    {"tag": "标签名", "confidence": 0.9, "reason": "生成原因"},
    ...
  ]${includeCategories ? ',\n  "category": "建议分类"' : ''}
}`

    return prompt
  }

  /**
   * 调用OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const client = getChatClient()
        const model = aiServiceManager.getChatModel()
        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的网页标签生成助手，擅长为书签生成准确、相关的标签。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('API返回内容为空')
        }

        return content
      } catch (error: any) {
        console.warn(`AI标签生成API调用失败 (尝试 ${attempt}/${this.maxRetries}):`, error.message)

        if (attempt === this.maxRetries) {
          throw new Error(`AI标签生成失败: ${error.message}`)
        }

        await this.delay(1000 * attempt)
      }
    }

    throw new Error('AI标签生成失败：达到最大重试次数')
  }

  /**
   * 解析API响应
   */
  private parseTagResponse(response: string, existingTags: string[]): TagAnalysisResult {
    try {
      const parsed = JSON.parse(response)

      const suggestedTags: AITagSuggestion[] = (parsed.tags || []).map((item: any) => ({
        tag: item.tag,
        confidence: Math.min(Math.max(item.confidence || 0.5, 0), 1),
        reason: item.reason || 'AI建议标签',
        category: parsed.category
      }))

      // 检测冲突（AI建议的标签与现有标签相同）
      const conflicts = suggestedTags
        .filter(suggestion => existingTags.includes(suggestion.tag))
        .map(suggestion => suggestion.tag)

      const recommendations: string[] = []
      if (conflicts.length > 0) {
        recommendations.push(`发现${conflicts.length}个与现有标签重复的建议`)
      }

      return {
        suggestedTags,
        existingTags,
        conflicts,
        recommendations
      }
    } catch (error) {
      console.error('解析AI标签响应失败:', error, response)
      return {
        suggestedTags: [],
        existingTags,
        conflicts: [],
        recommendations: ['AI响应格式错误，请重试']
      }
    }
  }

  /**
   * 计算标签相似度（简单的字符串相似度）
   */
  private calculateTagSimilarity(tag1: string, tag2: string): number {
    const s1 = tag1.toLowerCase()
    const s2 = tag2.toLowerCase()

    if (s1 === s2) return 1.0

    // 计算编辑距离
    const matrix = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(null))

    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 删除
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j - 1] + cost // 替换
        )
      }
    }

    const maxLen = Math.max(s1.length, s2.length)
    const distance = matrix[s1.length][s2.length]

    return 1 - (distance / maxLen)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const aiTaggingService = new AITaggingService()
export default aiTaggingService
