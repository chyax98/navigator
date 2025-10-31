/**
 * 搜索引擎管理器
 * 使用 Fuse.js 实现模糊搜索
 */

import Fuse from 'fuse.js'
import type { Bookmark, SearchResult, SearchOptions } from '@/types/bookmark'

const searchConfig: Fuse.IFuseOptions<Bookmark> = {
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

class SearchManager {
  private fuse: Fuse<Bookmark> | null = null
  private bookmarks: Bookmark[] = []

  /**
   * 初始化搜索引擎
   */
  async initialize(bookmarks: Bookmark[]): Promise<void> {
    this.bookmarks = bookmarks
    this.fuse = new Fuse(bookmarks, searchConfig)
  }

  /**
   * 执行搜索
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.fuse || !query.trim()) return []

    let results = this.fuse.search(query)

    // 应用过滤器
    if (options?.categoryId) {
      results = results.filter(result =>
        result.item.categoryId === options.categoryId
      )
    }

    if (options?.tags && options.tags.length > 0) {
      results = results.filter(result =>
        options.tags!.some(tag => result.item.tags.includes(tag))
      )
    }

    if (options?.isPrivate !== undefined) {
      results = results.filter(result =>
        result.item.isPrivate === options.isPrivate
      )
    }

    return results.map(result => ({
      bookmark: result.item,
      score: result.score || 0,
      matches: result.matches || []
    }))
  }

  /**
   * 更新书签数据
   */
  async updateBookmark(bookmark: Bookmark): Promise<void> {
    const index = this.bookmarks.findIndex(b => b.id === bookmark.id)
    if (index >= 0) {
      this.bookmarks[index] = bookmark
      await this.initialize(this.bookmarks)
    }
  }

  /**
   * 添加书签
   */
  async addBookmark(bookmark: Bookmark): Promise<void> {
    this.bookmarks.push(bookmark)
    await this.initialize(this.bookmarks)
  }

  /**
   * 删除书签
   */
  async removeBookmark(id: string): Promise<void> {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id)
    await this.initialize(this.bookmarks)
  }

  /**
   * 重建索引
   */
  async rebuildIndex(bookmarks: Bookmark[]): Promise<void> {
    await this.initialize(bookmarks)
  }
}

export const searchManager = new SearchManager()
export default searchManager
