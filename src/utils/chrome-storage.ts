/**
 * Chrome Extension 存储适配器
 * 使用 chrome.storage.local API 实现数据持久化
 * 保持与 IndexedDB 版本的接口兼容
 */

import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'
import type { HomepageItem, HomepageLayout } from '@/types/homepage'

// 存储键名常量
const STORAGE_KEYS = {
  BOOKMARKS: 'navigator_bookmarks',
  CATEGORIES: 'navigator_categories',
  CONFIG: 'navigator_config',
  HOMEPAGE_ITEMS: 'navigator_homepage_items',
  HOMEPAGE_LAYOUT: 'navigator_homepage_layout'
} as const

/**
 * 存储接口定义
 */
export interface StorageAdapter {
  // 书签操作
  getBookmarks(): Promise<Bookmark[]>
  saveBookmark(bookmark: Bookmark): Promise<void>
  deleteBookmark(id: string): Promise<void>
  getBookmarksByCategory(categoryId: string): Promise<Bookmark[]>

  // 分类操作
  getCategories(): Promise<Category[]>
  saveCategories(categories: Category[]): Promise<void>

  // 配置操作
  getConfig(): Promise<AppConfig | null>
  saveConfig(config: AppConfig): Promise<void>

  // 主页布局操作
  getHomepageItems(): Promise<HomepageItem[]>
  saveHomepageItems(items: HomepageItem[]): Promise<void>
  getHomepageLayout(): Promise<HomepageLayout | null>
  saveHomepageLayout(layout: HomepageLayout): Promise<void>

  // 数据管理
  exportData(): Promise<string>
  importData(jsonData: string): Promise<void>
  clearAll(): Promise<void>

  // 状态检查
  isInitialized(): boolean
}

/**
 * Chrome Storage 管理器
 */
class ChromeStorageManager implements StorageAdapter {
  private initialized = false

  /**
   * 检查是否在 Chrome Extension 环境中
   */
  private checkChromeStorage(): void {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome Storage API not available')
    }
  }

  /**
   * 初始化存储（Chrome 无需显式初始化）
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    this.checkChromeStorage()
    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 通用读取方法
   */
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

  /**
   * 通用写入方法
   */
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

  /**
   * 通用删除方法
   */
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

  // ===== 书签操作 =====

  async getBookmarks(): Promise<Bookmark[]> {
    await this.ensureInitialized()

    const bookmarks = await this.get<Bookmark[]>(STORAGE_KEYS.BOOKMARKS)
    return bookmarks || []
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    await this.ensureInitialized()

    const bookmarks = await this.getBookmarks()
    const index = bookmarks.findIndex(b => b.id === bookmark.id)

    if (index >= 0) {
      bookmarks[index] = bookmark
    } else {
      bookmarks.push(bookmark)
    }

    await this.set(STORAGE_KEYS.BOOKMARKS, bookmarks)
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.ensureInitialized()

    const bookmarks = await this.getBookmarks()
    const filtered = bookmarks.filter(b => b.id !== id)
    await this.set(STORAGE_KEYS.BOOKMARKS, filtered)
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    const bookmarks = await this.getBookmarks()
    return bookmarks.filter(b => b.categoryId === categoryId)
  }

  // ===== 分类操作 =====

  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized()

    const categories = await this.get<Category[]>(STORAGE_KEYS.CATEGORIES)
    return categories || []
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureInitialized()
    await this.set(STORAGE_KEYS.CATEGORIES, categories)
  }

  // ===== 配置操作 =====

  async getConfig(): Promise<AppConfig | null> {
    await this.ensureInitialized()
    return await this.get<AppConfig>(STORAGE_KEYS.CONFIG)
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureInitialized()

    // 深拷贝并移除不可序列化的数据
    const cleanConfig = JSON.parse(JSON.stringify(config))
    await this.set(STORAGE_KEYS.CONFIG, cleanConfig)
  }

  // ===== 主页布局操作 =====

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

    // 反序列化 Date 对象
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

    // 序列化 Date 对象
    const serializedLayout = {
      config: {
        ...layout.config,
        lastModified: layout.config.lastModified.toISOString()
      },
      items: layout.items.map(item => ({
        ...item,
        addedAt: item.addedAt.toISOString()
      }))
    }

    await this.set(STORAGE_KEYS.HOMEPAGE_LAYOUT, serializedLayout)
  }

  // ===== 数据管理 =====

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

      // 导入书签
      if (data.bookmarks && Array.isArray(data.bookmarks)) {
        for (const bookmark of data.bookmarks) {
          await this.saveBookmark(bookmark)
        }
      }

      // 导入分类
      if (data.categories && Array.isArray(data.categories)) {
        await this.saveCategories(data.categories)
      }

      // 导入配置
      if (data.config) {
        await this.saveConfig(data.config)
      }

      // 导入主页布局
      if (data.homepageItems && Array.isArray(data.homepageItems)) {
        await this.saveHomepageItems(data.homepageItems)
      }
    } catch (error) {
      console.error('Failed to import data:', error)
      throw new Error('Invalid data format')
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    await Promise.all([
      this.remove(STORAGE_KEYS.BOOKMARKS),
      this.remove(STORAGE_KEYS.CATEGORIES),
      this.remove(STORAGE_KEYS.CONFIG),
      this.remove(STORAGE_KEYS.HOMEPAGE_ITEMS)
    ])
  }
}

export const chromeStorageManager = new ChromeStorageManager()
export default chromeStorageManager
