/**
 * Chrome Extension 存储适配器
 * 使用 chrome.storage.local API 实现数据持久化
 */

import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'
import type { HomepageItem, HomepageLayout } from '@/types/homepage'
import { DebugPanel } from './debug'

const STORAGE_KEYS = {
  BOOKMARKS: 'navigator_bookmarks',
  CATEGORIES: 'navigator_categories',
  CONFIG: 'navigator_config',
  HOMEPAGE_ITEMS: 'navigator_homepage_items',
  HOMEPAGE_LAYOUT: 'navigator_homepage_layout'
} as const

export interface StorageAdapter {
  getBookmarks(): Promise<Bookmark[]>
  saveBookmark(bookmark: Bookmark): Promise<void>
  deleteBookmark(id: string): Promise<void>
  getBookmarksByCategory(categoryId: string): Promise<Bookmark[]>
  getCategories(): Promise<Category[]>
  saveCategories(categories: Category[]): Promise<void>
  getConfig(): Promise<AppConfig | null>
  saveConfig(config: AppConfig): Promise<void>
  getHomepageItems(): Promise<HomepageItem[]>
  saveHomepageItems(items: HomepageItem[]): Promise<void>
  getHomepageLayout(): Promise<HomepageLayout | null>
  saveHomepageLayout(layout: HomepageLayout): Promise<void>
  exportData(): Promise<string>
  importData(jsonData: string): Promise<void>
  clearAll(): Promise<void>
  isInitialized(): boolean
}

class ChromeStorageManager implements StorageAdapter {
  private initialized = false
  private writeLock: Promise<void> = Promise.resolve()
  private lockQueue = 0 // 统计锁队列长度（调试用）

  private checkChromeStorage(): void {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome Storage API not available')
    }
  }

  /**
   * 互斥锁：确保同一时间只有一个写操作执行
   * 防止读-改-写竞态导致数据丢失
   */
  private async acquireWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const previousLock = this.writeLock
    let releaseLock: () => void

    this.writeLock = new Promise<void>(resolve => {
      releaseLock = resolve
    })

    this.lockQueue++
    const queuePosition = this.lockQueue

    // 开发环境下打印调试信息
    if (import.meta.env.DEV && queuePosition > 1) {
      console.log(`[ChromeStorage] 写操作排队中... (队列位置: ${queuePosition})`)
    }

    try {
      await previousLock
      if (import.meta.env.DEV && queuePosition > 1) {
        console.log(`[ChromeStorage] 写操作开始执行 (队列位置: ${queuePosition})`)
      }
      return await operation()
    } finally {
      this.lockQueue--
      releaseLock!()
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    this.checkChromeStorage()
    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  private async get<T>(key: string): Promise<T | null> {
    this.checkChromeStorage()
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(result[key] || null)
        }
      })
    })
  }

  private async set(key: string, value: any): Promise<void> {
    this.checkChromeStorage()
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  private async remove(key: string): Promise<void> {
    this.checkChromeStorage()
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  async getBookmarks(): Promise<Bookmark[]> {
    await this.ensureInitialized()
    const data = await this.get<any[]>(STORAGE_KEYS.BOOKMARKS)
    if (!data) {
      DebugPanel.log('[ChromeStorage] 📭 getBookmarks: 存储为空')
      return []
    }

    DebugPanel.log('[ChromeStorage] 📦 getBookmarks: 读取', data.length, '个书签')

    // 统计置顶书签数量
    const pinnedInStorage = data.filter(raw => raw.isPinned === true).length
    if (pinnedInStorage > 0) {
      DebugPanel.log('[ChromeStorage] 📍 存储中有', pinnedInStorage, '个置顶书签')
      // 显示前 3 个置顶书签的详情
      data.filter(raw => raw.isPinned === true).slice(0, 3).forEach(raw => {
        DebugPanel.log('[ChromeStorage] 📌', raw.title, '| isPinned =', raw.isPinned, '| pinnedAt =', raw.pinnedAt)
      })
    }

    return data.map(raw => ({
      ...raw,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      lastVisited: raw.lastVisited ? new Date(raw.lastVisited) : undefined,
      pinnedAt: raw.pinnedAt ? new Date(raw.pinnedAt) : undefined,
      isPinned: Boolean(raw.isPinned),
      tags: Array.isArray(raw.tags) ? raw.tags : []
    }))
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    await this.ensureInitialized()

    // 使用互斥锁防止并发写入导致数据丢失
    return this.acquireWriteLock(async () => {
      const bookmarks = await this.getBookmarks()
      const index = bookmarks.findIndex(b => b.id === bookmark.id)

      if (index >= 0) {
        DebugPanel.log('[ChromeStorage] 🔄 saveBookmark: 更新', bookmark.title, '| isPinned =', bookmark.isPinned)
        bookmarks[index] = { ...bookmark, updatedAt: new Date() }
      } else {
        DebugPanel.log('[ChromeStorage] ➕ saveBookmark: 新增', bookmark.title, '| isPinned =', bookmark.isPinned)
        bookmarks.push({ ...bookmark, createdAt: new Date(), updatedAt: new Date() })
      }

      const serialized = bookmarks.map(b => ({
        ...b,
        isPinned: Boolean(b.isPinned),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        lastVisited: b.lastVisited?.toISOString(),
        pinnedAt: b.pinnedAt?.toISOString()
      }))

      // 统计置顶书签数量
      const pinnedCount = serialized.filter(b => b.isPinned === true).length
      DebugPanel.log('[ChromeStorage] 💾 saveBookmark: 写入存储，共', serialized.length, '个书签，其中', pinnedCount, '个置顶')

      await this.set(STORAGE_KEYS.BOOKMARKS, serialized)
    })
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.ensureInitialized()

    // 使用互斥锁防止并发写入导致数据丢失
    return this.acquireWriteLock(async () => {
      const bookmarks = await this.getBookmarks()
      const filtered = bookmarks.filter(b => b.id !== id)

      const serialized = filtered.map(b => ({
        ...b,
        isPinned: Boolean(b.isPinned),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        lastVisited: b.lastVisited?.toISOString(),
        pinnedAt: b.pinnedAt?.toISOString()
      }))

      await this.set(STORAGE_KEYS.BOOKMARKS, serialized)
    })
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    const bookmarks = await this.getBookmarks()
    return bookmarks.filter(b => b.categoryId === categoryId)
  }

  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized()
    const categories = await this.get<Category[]>(STORAGE_KEYS.CATEGORIES)
    if (!categories || categories.length === 0) {
      DebugPanel.log('[ChromeStorage] 📭 getCategories: 存储为空')
      return []
    }
    DebugPanel.log('[ChromeStorage] 📦 getCategories: 读取', categories.length, '个分类')
    return categories
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureInitialized()
    DebugPanel.log('[ChromeStorage] 💾 saveCategories: 保存', categories.length, '个分类')
    await this.set(STORAGE_KEYS.CATEGORIES, categories)
  }

  async getConfig(): Promise<AppConfig | null> {
    await this.ensureInitialized()
    return await this.get<AppConfig>(STORAGE_KEYS.CONFIG)
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureInitialized()
    const cleanConfig = JSON.parse(JSON.stringify(config))
    await this.set(STORAGE_KEYS.CONFIG, cleanConfig)
  }

  async getHomepageItems(): Promise<HomepageItem[]> {
    await this.ensureInitialized()
    const items = await this.get<HomepageItem[]>(STORAGE_KEYS.HOMEPAGE_ITEMS)
    return items || []
  }

  async saveHomepageItems(items: HomepageItem[]): Promise<void> {
    await this.ensureInitialized()
    await this.set(STORAGE_KEYS.HOMEPAGE_ITEMS, items)
  }

  async getHomepageLayout(): Promise<HomepageLayout | null> {
    await this.ensureInitialized()
    const data = await this.get<any>(STORAGE_KEYS.HOMEPAGE_LAYOUT)

    if (!data) {
      return null
    }

    return {
      config: {
        ...data.config,
        lastModified: new Date(data.config.lastModified)
      },
      items: (data.items || []).map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt)
      }))
    }
  }

  async saveHomepageLayout(layout: HomepageLayout): Promise<void> {
    await this.ensureInitialized()

    const serialized = {
      config: {
        ...layout.config,
        lastModified: layout.config.lastModified.toISOString()
      },
      items: layout.items.map(item => ({
        ...item,
        addedAt: item.addedAt.toISOString()
      }))
    }

    await this.set(STORAGE_KEYS.HOMEPAGE_LAYOUT, serialized)
  }

  async exportData(): Promise<string> {
    const [bookmarks, categories, config, homepageItems] = await Promise.all([
      this.getBookmarks(),
      this.getCategories(),
      this.getConfig(),
      this.getHomepageItems()
    ])

    const data = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      bookmarks,
      categories,
      config,
      homepageItems
    }

    return JSON.stringify(data, null, 2)
  }

  async importData(jsonData: string): Promise<void> {
    // 使用互斥锁防止并发写入导致数据丢失
    return this.acquireWriteLock(async () => {
      try {
        const data = JSON.parse(jsonData)

        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const serialized = data.bookmarks.map((b: any) => ({
            ...b,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
            lastVisited: b.lastVisited,
            pinnedAt: b.pinnedAt
          }))
          await this.set(STORAGE_KEYS.BOOKMARKS, serialized)
        }

        if (data.categories && Array.isArray(data.categories)) {
          await this.saveCategories(data.categories)
        }

        if (data.config) {
          await this.saveConfig(data.config)
        }

        if (data.homepageItems && Array.isArray(data.homepageItems)) {
          await this.saveHomepageItems(data.homepageItems)
        }
      } catch (error) {
        throw new Error('Invalid data format')
      }
    })
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    // 使用互斥锁防止清空操作与其他写操作冲突
    return this.acquireWriteLock(async () => {
      await Promise.all([
        this.remove(STORAGE_KEYS.BOOKMARKS),
        this.remove(STORAGE_KEYS.CATEGORIES),
        this.remove(STORAGE_KEYS.CONFIG),
        this.remove(STORAGE_KEYS.HOMEPAGE_ITEMS),
        this.remove(STORAGE_KEYS.HOMEPAGE_LAYOUT)
      ])
    })
  }
}

export const chromeStorageManager = new ChromeStorageManager()
export default chromeStorageManager
