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
  BOOKMARK_IDS: 'navigator_bookmark_ids',        // 书签 ID 列表
  BOOKMARK_PREFIX: 'navigator_bookmark_',        // 书签数据前缀
  CATEGORIES: 'navigator_categories',
  CONFIG: 'navigator_config',
  HOMEPAGE_ITEMS: 'navigator_homepage_items',
  HOMEPAGE_LAYOUT: 'navigator_homepage_layout'
} as const

/**
 * 生成书签存储键
 */
function getBookmarkKey(id: string): string {
  return `${STORAGE_KEYS.BOOKMARK_PREFIX}${id}`
}

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

  /**
   * 获取所有书签 ID
   */
  private async getBookmarkIds(): Promise<string[]> {
    const ids = await this.get<string[]>(STORAGE_KEYS.BOOKMARK_IDS)
    return ids || []
  }

  /**
   * 保存书签 ID 列表
   */
  private async saveBookmarkIds(ids: string[]): Promise<void> {
    await this.set(STORAGE_KEYS.BOOKMARK_IDS, ids)
  }

  /**
   * 获取所有书签（从各个独立的键读取）
   */
  async getBookmarks(): Promise<Bookmark[]> {
    await this.ensureInitialized()

    // 检查是否需要从旧格式迁移
    await this.migrateOldBookmarksIfNeeded()

    const ids = await this.getBookmarkIds()
    if (ids.length === 0) return []

    // 批量读取所有书签
    const keys = ids.map(id => getBookmarkKey(id))
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          const bookmarks: Bookmark[] = []
          ids.forEach(id => {
            const raw = result[getBookmarkKey(id)]
            if (raw) {
              // 反序列化 Date 字段
              const bookmark: Bookmark = {
                ...raw,
                createdAt: new Date(raw.createdAt),
                updatedAt: new Date(raw.updatedAt)
              }

              // 可选的 Date 字段
              if (raw.lastVisited) {
                bookmark.lastVisited = new Date(raw.lastVisited)
              }
              if (raw.pinnedAt) {
                bookmark.pinnedAt = new Date(raw.pinnedAt)
              }

              bookmarks.push(bookmark)
            }
          })
          resolve(bookmarks)
        }
      })
    })
  }

  /**
   * 从旧的数组格式迁移到新的按 ID 存储格式（只执行一次）
   */
  private migrated = false
  private async migrateOldBookmarksIfNeeded(): Promise<void> {
    if (this.migrated) return
    this.migrated = true

    try {
      // 检查是否有旧格式的数据
      const oldData = await this.get<Bookmark[]>('navigator_bookmarks')
      if (!oldData || !Array.isArray(oldData) || oldData.length === 0) {
        return
      }

      console.error('[迁移] 发现旧格式数据，开始迁移', oldData.length, '个书签')

      // 迁移到新格式
      const ids: string[] = []
      const updates: Record<string, any> = {}

      oldData.forEach(bookmark => {
        ids.push(bookmark.id)

        // 序列化 Date 字段
        const serialized: any = {
          ...bookmark,
          createdAt: bookmark.createdAt instanceof Date
            ? bookmark.createdAt.toISOString()
            : bookmark.createdAt,
          updatedAt: bookmark.updatedAt instanceof Date
            ? bookmark.updatedAt.toISOString()
            : bookmark.updatedAt
        }

        if (bookmark.lastVisited) {
          serialized.lastVisited = bookmark.lastVisited instanceof Date
            ? bookmark.lastVisited.toISOString()
            : bookmark.lastVisited
        }

        if (bookmark.pinnedAt) {
          serialized.pinnedAt = bookmark.pinnedAt instanceof Date
            ? bookmark.pinnedAt.toISOString()
            : bookmark.pinnedAt
        }

        updates[getBookmarkKey(bookmark.id)] = serialized
      })

      updates[STORAGE_KEYS.BOOKMARK_IDS] = ids

      // 批量写入新数据
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set(updates, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })

      // 删除旧数据
      await this.remove('navigator_bookmarks')

      console.error('[迁移] 成功迁移', ids.length, '个书签')
    } catch (error) {
      console.error('[迁移] 数据迁移失败:', error)
    }
  }

  /**
   * 保存单个书签（增量更新，只更新这一个书签）
   */
  async saveBookmark(bookmark: Bookmark): Promise<void> {
    await this.ensureInitialized()

    // 序列化 Date 字段（Chrome Storage 不支持 Date 对象）
    const serialized: any = {
      ...bookmark,
      createdAt: bookmark.createdAt.toISOString(),
      updatedAt: bookmark.updatedAt.toISOString()
    }

    // 可选的 Date 字段
    if (bookmark.lastVisited) {
      serialized.lastVisited = bookmark.lastVisited.toISOString()
    }
    if (bookmark.pinnedAt) {
      serialized.pinnedAt = bookmark.pinnedAt.toISOString()
    }

    const key = getBookmarkKey(bookmark.id)
    const ids = await this.getBookmarkIds()

    // 使用批量操作，避免竞态
    if (!ids.includes(bookmark.id)) {
      ids.push(bookmark.id)
      // 一次性更新书签数据和 ID 列表
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({
          [key]: serialized,
          [STORAGE_KEYS.BOOKMARK_IDS]: ids
        }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
    } else {
      // 只更新书签数据（已存在的书签）
      await this.set(key, serialized)
    }
  }

  /**
   * 删除单个书签
   */
  async deleteBookmark(id: string): Promise<void> {
    await this.ensureInitialized()

    // 1. 删除书签数据
    const key = getBookmarkKey(id)
    await this.remove(key)

    // 2. 从 ID 列表中移除
    const ids = await this.getBookmarkIds()
    const filtered = ids.filter(bookmarkId => bookmarkId !== id)
    await this.saveBookmarkIds(filtered)
  }

  /**
   * 按分类获取书签
   */
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

      // 导入书签（增量导入）
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
      throw new Error('Invalid data format')
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    // 1. 删除所有书签数据
    const ids = await this.getBookmarkIds()
    const bookmarkKeys = ids.map(id => getBookmarkKey(id))
    await Promise.all(bookmarkKeys.map(key => this.remove(key)))

    // 2. 删除其他数据
    await Promise.all([
      this.remove(STORAGE_KEYS.BOOKMARK_IDS),
      this.remove(STORAGE_KEYS.CATEGORIES),
      this.remove(STORAGE_KEYS.CONFIG),
      this.remove(STORAGE_KEYS.HOMEPAGE_ITEMS),
      this.remove(STORAGE_KEYS.HOMEPAGE_LAYOUT)
    ])
  }
}

export const chromeStorageManager = new ChromeStorageManager()
export default chromeStorageManager
