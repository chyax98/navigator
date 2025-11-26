/**
 * 搜索引擎管理器
 * 融合 Fuse.js 关键词搜索 + 向量语义搜索
 */

import Fuse from 'fuse.js'
import type { FuseResult, IFuseOptions } from 'fuse.js'
import type { Bookmark, SearchResult, SearchOptions } from '@/types/bookmark'
import { embeddingService } from './embedding'
import { vectorDatabase } from './vector-db'

const searchConfig: IFuseOptions<Bookmark> = {
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'description', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
    { name: 'url', weight: 0.05 }
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  useExtendedSearch: true,
  ignoreLocation: true,
  shouldSort: true,
  findAllMatches: false
}

interface SearchConfig {
  enableSemanticSearch?: boolean // 是否启用语义搜索
  semanticWeight?: number // 语义搜索权重 (0-1)
  keywordWeight?: number // 关键词搜索权重 (0-1)
}

class SearchManager {
  private fuse: Fuse<Bookmark> | null = null
  private bookmarks: Bookmark[] = []
  private config: SearchConfig = {
    enableSemanticSearch: false,
    semanticWeight: 0.6,
    keywordWeight: 0.4
  }
  private semanticSearchEnabled = false

  /**
   * 初始化搜索引擎
   */
  async initialize(bookmarks: Bookmark[], config: SearchConfig = {}): Promise<void> {
    this.bookmarks = bookmarks
    this.config = { ...this.config, ...config }
    this.fuse = new Fuse(bookmarks, searchConfig)

    // 可选初始化语义搜索
    if (this.config.enableSemanticSearch) {
      this.initializeSemanticSearch(bookmarks).catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error))
        console.warn('语义搜索初始化失败，仅使用关键词搜索:', err.message)
        this.semanticSearchEnabled = false
      })
    }
  }

  /**
   * 可选初始化语义搜索
   */
  private async initializeSemanticSearch(bookmarks: Bookmark[]): Promise<void> {
    try {
      // 检查embedding服务是否可用
      const stats = await embeddingService.getUsageStats()
      if (!stats.isConnected) {
        throw new Error('Embedding API不可用')
      }

      // 初始化向量数据库
      await vectorDatabase.initialize()

      // 检查并重建过期的向量
      await vectorDatabase.rebuildStaleVectors(bookmarks)

      this.semanticSearchEnabled = true
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.warn('语义搜索初始化失败:', err.message)
      this.semanticSearchEnabled = false
      throw err
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<SearchConfig>): Promise<void> {
    const oldSemanticEnabled = this.config.enableSemanticSearch
    this.config = { ...this.config, ...config }

    // 如果语义搜索状态发生变化，重新初始化
    if (oldSemanticEnabled !== this.config.enableSemanticSearch) {
      if (this.config.enableSemanticSearch) {
        await this.initializeSemanticSearch(this.bookmarks)
      } else {
        this.semanticSearchEnabled = false
      }
    }
  }

  /**
   * 执行搜索 - 支持混合搜索算法
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.fuse || !query.trim()) return []

    // 基础关键词搜索
    const keywordResults = this.fuse.search(query)

    // 如果启用了语义搜索，执行混合搜索
    if (this.semanticSearchEnabled && this.config.enableSemanticSearch) {
      return this.performHybridSearch(query, keywordResults, options)
    }

    // 纯关键词搜索
    return this.processKeywordResults(keywordResults, options)
  }

  /**
   * 执行混合搜索
   */
  private async performHybridSearch(
    query: string,
    keywordResults: FuseResult<Bookmark>[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      // 生成查询向量
      const queryEmbedding = await embeddingService.generateEmbedding(query)

      // 向量相似度搜索
      const semanticResults = await vectorDatabase.searchSimilar(
        queryEmbedding.embedding,
        { limit: 50, threshold: 0.1 }
      )

      // 合并关键词和语义搜索结果
      const combinedResults = this.mergeSearchResults(
        keywordResults,
        semanticResults,
        this.config.keywordWeight || 0.4,
        this.config.semanticWeight || 0.6
      )

      // 应用过滤器
      let filteredResults = combinedResults
      if (options?.categoryId) {
        filteredResults = filteredResults.filter(result =>
          result.bookmark.categoryId === options.categoryId
        )
      }

      if (options?.tags && options.tags.length > 0) {
        filteredResults = filteredResults.filter(result =>
          options.tags!.some(tag => result.bookmark.tags.includes(tag))
        )
      }

      if (options?.isPrivate !== undefined) {
        filteredResults = filteredResults.filter(result =>
          result.bookmark.isPrivate === options.isPrivate
        )
      }

      // 重新排序并返回前N个结果
      return filteredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, options?.limit || 20)

    } catch (error) {
      console.warn('混合搜索失败，回退到关键词搜索:', error instanceof Error ? error.message : String(error))
      // 回退到纯关键词搜索
      return this.processKeywordResults(keywordResults, options)
    }
  }

  /**
   * 处理纯关键词搜索结果
   */
  private processKeywordResults(
    results: FuseResult<Bookmark>[],
    options?: SearchOptions
  ): SearchResult[] {
    let processedResults = results

    // 应用过滤器
    if (options?.categoryId) {
      processedResults = processedResults.filter(result =>
        result.item.categoryId === options.categoryId
      )
    }

    if (options?.tags && options.tags.length > 0) {
      processedResults = processedResults.filter(result =>
        options.tags!.some(tag => result.item.tags.includes(tag))
      )
    }

    if (options?.isPrivate !== undefined) {
      processedResults = processedResults.filter(result =>
        result.item.isPrivate === options.isPrivate
      )
    }

    return processedResults.map(result => ({
      bookmark: result.item,
      score: (1 - (result.score || 0)) * 100, // 转换为0-100分数，便于理解
      matches: result.matches ? [...result.matches] : []
    }))
  }

  /**
   * 合并关键词和语义搜索结果
   */
  private mergeSearchResults(
    keywordResults: FuseResult<Bookmark>[],
    semanticResults: any[],
    keywordWeight: number,
    semanticWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>()

    // 处理关键词搜索结果
    keywordResults.forEach(result => {
      const score = (1 - (result.score || 0)) * 100 * keywordWeight
      resultMap.set(result.item.id, {
        bookmark: result.item,
        score,
        matches: result.matches ? [...result.matches] : []
      })
    })

    // 处理语义搜索结果
    semanticResults.forEach(result => {
      const semanticScore = result.similarity * 100 * semanticWeight
      const existing = resultMap.get(result.bookmark.id)

      if (existing) {
        // 合并分数
        existing.score += semanticScore
      } else {
        // 新增结果
        resultMap.set(result.bookmark.id, {
          bookmark: result.bookmark,
          score: semanticScore,
          matches: []
        })
      }
    })

    return Array.from(resultMap.values())
  }

  /**
   * 更新书签数据
   */
  async updateBookmark(bookmark: Bookmark): Promise<void> {
    const index = this.bookmarks.findIndex(b => b.id === bookmark.id)
    if (index >= 0) {
      this.bookmarks[index] = bookmark
      // 重新初始化Fuse索引
      this.fuse = new Fuse(this.bookmarks, searchConfig)

      // 可选更新向量索引
      if (this.semanticSearchEnabled) {
        try {
          await vectorDatabase.rebuildStaleVectors([bookmark])
        } catch (error) {
          console.warn('更新向量索引失败:', error)
        }
      }
    }
  }

  /**
   * 添加书签
   */
  async addBookmark(bookmark: Bookmark): Promise<void> {
    this.bookmarks.push(bookmark)
    // 重新初始化Fuse索引
    this.fuse = new Fuse(this.bookmarks, searchConfig)

    // 可选添加向量索引
    if (this.semanticSearchEnabled) {
      try {
        await vectorDatabase.rebuildStaleVectors([bookmark])
      } catch (error) {
        console.warn('添加向量索引失败:', error)
      }
    }
  }

  /**
   * 删除书签
   */
  async removeBookmark(id: string): Promise<void> {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id)
    // 重新初始化Fuse索引
    this.fuse = new Fuse(this.bookmarks, searchConfig)

    // 可选删除向量索引
    if (this.semanticSearchEnabled) {
      try {
        await vectorDatabase.deleteVector(id)
      } catch (error) {
        console.warn('删除向量索引失败:', error)
      }
    }
  }

  /**
   * 重建索引
   */
  async rebuildIndex(bookmarks: Bookmark[]): Promise<void> {
    this.bookmarks = bookmarks
    this.fuse = new Fuse(bookmarks, searchConfig)

    // 可选重建向量索引
    if (this.semanticSearchEnabled) {
      try {
        await vectorDatabase.rebuildStaleVectors(bookmarks)
      } catch (error) {
        console.warn('重建向量索引失败:', error)
        this.semanticSearchEnabled = false
      }
    }
  }

  /**
   * 获取搜索状态
   */
  getSearchStatus(): {
    keywordSearchReady: boolean
    semanticSearchReady: boolean
    semanticSearchEnabled: boolean
  } {
    return {
      keywordSearchReady: !!this.fuse,
      semanticSearchReady: this.semanticSearchEnabled,
      semanticSearchEnabled: this.config.enableSemanticSearch || false
    }
  }
}

export const searchManager = new SearchManager()
export default searchManager
