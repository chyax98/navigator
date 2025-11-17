/**
 * Chrome Extension 存储适配器
 * 使用 chrome.storage.local API 实现数据持久化
 */

import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'
import type { HomepageItem, HomepageLayout } from '@/types/homepage'

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

  private checkChromeStorage(): void {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome Storage API not available')
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
    if (!data) return []

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
    const bookmarks = await this.getBookmarks()
    const index = bookmarks.findIndex(b => b.id === bookmark.id)

    if (index >= 0) {
      bookmarks[index] = { ...bookmark, updatedAt: new Date() }
    } else {
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

    await this.set(STORAGE_KEYS.BOOKMARKS, serialized)
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.ensureInitialized()
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
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    const bookmarks = await this.getBookmarks()
    return bookmarks.filter(b => b.categoryId === categoryId)
  }

  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized()
    const categories = await this.get<Category[]>(STORAGE_KEYS.CATEGORIES)
    return categories || []
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureInitialized()
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
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    await Promise.all([
      this.remove(STORAGE_KEYS.BOOKMARKS),
      this.remove(STORAGE_KEYS.CATEGORIES),
      this.remove(STORAGE_KEYS.CONFIG),
      this.remove(STORAGE_KEYS.HOMEPAGE_ITEMS),
      this.remove(STORAGE_KEYS.HOMEPAGE_LAYOUT)
    ])
  }
}

export const chromeStorageManager = new ChromeStorageManager()
export default chromeStorageManager
