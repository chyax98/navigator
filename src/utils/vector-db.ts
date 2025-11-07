/**
 * 向量数据库 - 基于IndexedDB存储书签embeddings
 * 支持高效的相似度搜索和向量管理
 */

import type { Bookmark } from '@/types/bookmark'
import { embeddingService } from './embedding'

export interface VectorRecord {
  id: string // 书签ID
  embedding: number[]
  bookmark: Bookmark // 完整的书签数据快照
  createdAt: number
  updatedAt: number
  version: number // 用于缓存失效控制
  signature?: string // 基于书签核心字段的内容签名，用于判断embedding是否需要更新
}

export interface SimilarityResult {
  bookmark: Bookmark
  similarity: number
  score: number // 综合得分
}

export interface VectorSearchOptions {
  limit?: number
  threshold?: number // 相似度阈值
  includeMetadata?: boolean
}

export interface BatchWriteFailure {
  id: string
  error: string
}

export interface BatchWriteResult {
  successIds: string[]
  failures: BatchWriteFailure[]
  aborted: boolean
  durationMs: number
}

class VectorDatabase {
  private readonly dbName = 'BookmarkVectors'
  private readonly storeName = 'embeddings'
  private readonly version = 1
  private db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        this.createObjectStore(db)
      }
    })
  }

  /**
   * 创建对象存储
   */
  private createObjectStore(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' })

      // 创建索引以提高查询性能
      store.createIndex('version', 'version', { unique: false })
      store.createIndex('updatedAt', 'updatedAt', { unique: false })

      // 为embedding创建复合索引（虽然IndexedDB不支持向量索引，但可以用于基本过滤）
      store.createIndex('id_version', ['id', 'version'], { unique: true })
    }
  }

  /**
   * 存储向量记录
   */
  async storeVector(record: VectorRecord): Promise<void> {
    const result = await this.storeVectors([record], { atomic: true })
    if (result.failures.length > 0) {
      const failure = result.failures[0]
      throw new Error(`存储向量失败(${failure.id}): ${failure.error}`)
    }
  }

  /**
   * 批量存储向量
   */
  async storeVectors(
    records: VectorRecord[],
    options: { atomic?: boolean } = {}
  ): Promise<BatchWriteResult> {
    if (!this.db) await this.initialize()

    const atomic = options.atomic !== false
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (records.length === 0) {
      return {
        successIds: [],
        failures: [],
        aborted: false,
        durationMs: 0
      }
    }

    return new Promise((resolve) => {
      const failures: BatchWriteFailure[] = []
      const successIds: string[] = []
      let aborted = false

      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      transaction.oncomplete = () => {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start
        resolve({
          successIds: atomic && aborted ? [] : successIds,
          failures,
          aborted,
          durationMs: duration
        })
      }

      transaction.onabort = () => {
        aborted = true
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start
        if (failures.length === 0 && transaction.error) {
          failures.push({ id: '__transaction__', error: transaction.error.message })
        }
        resolve({
          successIds: atomic ? [] : successIds,
          failures,
          aborted: true,
          durationMs: duration
        })
      }

      transaction.onerror = (event) => {
        event.preventDefault()
      }

      const preparedRecords = records.map(record => {
        const now = Date.now()

        // 深拷贝并序列化 bookmark，移除不可克隆的数据（如 Date 对象）
        const cleanBookmark = JSON.parse(JSON.stringify(record.bookmark))

        return {
          ...record,
          bookmark: cleanBookmark,
          updatedAt: now,
          createdAt: record.createdAt || now
        }
      })

      for (const record of preparedRecords) {
        const request = store.put(record)
        request.onsuccess = () => {
          successIds.push(record.id)
        }
        request.onerror = (event) => {
          const errorMessage = request.error?.message || '未知错误'
          failures.push({ id: record.id, error: errorMessage })

          if (atomic) {
            aborted = true
            transaction.abort()
          } else {
            event.preventDefault()
          }
        }
      }
    })
  }

  /**
   * 获取向量记录
   */
  async getVector(bookmarkId: string): Promise<VectorRecord | null> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(bookmarkId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取所有向量记录
   */
  async getAllVectors(): Promise<VectorRecord[]> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 相似度搜索 - 核心算法
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const { limit = 20, threshold = 0.1 } = options

    const allVectors = await this.getAllVectors()
    if (allVectors.length === 0) return []

    // 计算所有向量的相似度
    const similarities: SimilarityResult[] = allVectors.map(vector => {
      const similarity = embeddingService.calculateSimilarity(queryEmbedding, vector.embedding)

      // 计算综合得分（可扩展：加入其他因素如点击率、时间权重等）
      const score = similarity

      return {
        bookmark: vector.bookmark,
        similarity,
        score
      }
    })

    // 过滤和排序
    return similarities
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * 删除向量记录
   */
  async deleteVector(bookmarkId: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(bookmarkId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清空所有向量
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalVectors: number
    totalSize: number // 估算大小
    lastUpdated?: number
  }> {
    const vectors = await this.getAllVectors()

    let totalSize = 0
    let lastUpdated = 0

    vectors.forEach(vector => {
      // 估算每个向量的大小（embedding + 元数据）
      const embeddingSize = vector.embedding.length * 8 // float64
      const metadataSize = JSON.stringify(vector.bookmark).length * 2 // UTF-16
      totalSize += embeddingSize + metadataSize

      if (vector.updatedAt > lastUpdated) {
        lastUpdated = vector.updatedAt
      }
    })

    return {
      totalVectors: vectors.length,
      totalSize,
      lastUpdated: lastUpdated || undefined
    }
  }

  /**
   * 生成用于比较的书签内容签名
   */
  private getBookmarkSignature(bookmark: Bookmark): string {
    const normalizedTags = Array.isArray(bookmark.tags)
      ? bookmark.tags.map(tag => tag.trim())
      : []

    return JSON.stringify({
      title: bookmark.title?.trim() ?? '',
      description: bookmark.description?.trim() ?? '',
      url: bookmark.url?.trim() ?? '',
      tags: normalizedTags,
      categoryId: bookmark.categoryId ?? ''
    })
  }

  /**
   * 判断书签向量是否需要更新
   */
  async isVectorStale(bookmark: Bookmark, signature?: string): Promise<boolean> {
    const vector = await this.getVector(bookmark.id)
    if (!vector) return true

    const currentSignature = signature ?? this.getBookmarkSignature(bookmark)

    // 旧数据没有签名时，强制重建以补齐签名
    if (!vector.signature) {
      return true
    }

    // 内容未变化则无需重建
    if (vector.signature === currentSignature) {
      return false
    }

    return true
  }

  /**
   * 批量检查并重建过期向量
   */
  async rebuildStaleVectors(bookmarks: Bookmark[]): Promise<void> {
    const staleBookmarks: Array<{ bookmark: Bookmark; signature: string }> = []

    // 检查哪些书签的向量需要重建
    for (const bookmark of bookmarks) {
      const signature = this.getBookmarkSignature(bookmark)
      const isStale = await this.isVectorStale(bookmark, signature)
      if (isStale) {
        staleBookmarks.push({ bookmark, signature })
      }
    }

    if (staleBookmarks.length === 0) return

    // 批量生成新的embeddings
    const embeddingResults = await embeddingService.generateBookmarkEmbeddings(
      staleBookmarks.map(item => item.bookmark)
    )

    // 转换为向量记录
    const vectorRecords: VectorRecord[] = []
    for (const { bookmark, signature } of staleBookmarks) {
      const embedding = embeddingResults.get(bookmark.id)
      if (embedding) {
        vectorRecords.push({
          id: bookmark.id,
          embedding: embedding.embedding,
          bookmark: { ...bookmark }, // 创建快照
          createdAt: 0, // 将在storeVectors中设置
          updatedAt: 0,
          version: bookmark.updatedAt.getTime(),
          signature
        })
      }
    }

    // 批量存储
    const result = await this.storeVectors(vectorRecords)
    if (result.failures.length > 0) {
      console.warn('部分向量存储失败:', result.failures)
    }
  }
}

export const vectorDatabase = new VectorDatabase()
export default vectorDatabase
