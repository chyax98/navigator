/**
 * 存储工厂
 * 自动检测运行环境并返回对应的存储实现
 */

import type { StorageAdapter } from './chrome-storage'
import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'
import type { HomepageItem, HomepageLayout } from '@/types/homepage'

/**
 * 运行环境类型
 */
export type RuntimeEnvironment = 'chrome-extension' | 'web'

/**
 * 检测当前运行环境
 */
export function detectEnvironment(): RuntimeEnvironment {
  // 检查是否在 Chrome Extension 环境
  const hasChrome = typeof chrome !== 'undefined'
  const hasStorage = hasChrome && chrome.storage
  const hasRuntimeId = hasChrome && chrome.runtime?.id

  console.error('[环境检测]', {
    hasChrome,
    hasStorage,
    hasRuntimeId,
    runtimeId: hasRuntimeId ? chrome.runtime.id : 'N/A'
  })

  if (hasChrome && hasStorage && hasRuntimeId) {
    console.error('[环境检测] 使用 Chrome Extension Storage')
    return 'chrome-extension'
  }

  // 默认为 Web 环境（使用 IndexedDB）
  console.error('[环境检测] 使用 IndexedDB (Web)')
  return 'web'
}

/**
 * Chrome Extension 存储代理（懒加载 chrome-storage 模块）
 */
class ChromeStorageProxy implements StorageAdapter {
  private managerPromise: Promise<any>

  constructor() {
    console.error('[ChromeStorageProxy] 构造函数调用')
    // 使用 Promise 缓存，确保模块只加载一次
    this.managerPromise = import('./chrome-storage').then(
      module => {
        console.error('[ChromeStorageProxy] chrome-storage 模块加载完成')
        return module.chromeStorageManager || module.default
      }
    )
  }

  private async getManager(): Promise<any> {
    const manager = await this.managerPromise
    console.error('[ChromeStorageProxy] getManager 返回 manager')
    return manager
  }

  isInitialized(): boolean {
    // Chrome Storage API 同步可用，无需异步初始化
    return true
  }

  async getBookmarks(): Promise<Bookmark[]> {
    const manager = await this.getManager()
    return manager.getBookmarks()
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const manager = await this.getManager()
    return manager.saveBookmark(bookmark)
  }

  async deleteBookmark(id: string): Promise<void> {
    const manager = await this.getManager()
    return manager.deleteBookmark(id)
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    const manager = await this.getManager()
    return manager.getBookmarksByCategory(categoryId)
  }

  async getCategories(): Promise<Category[]> {
    const manager = await this.getManager()
    return manager.getCategories()
  }

  async saveCategories(categories: Category[]): Promise<void> {
    const manager = await this.getManager()
    return manager.saveCategories(categories)
  }

  async getConfig(): Promise<AppConfig | null> {
    const manager = await this.getManager()
    return manager.getConfig()
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const manager = await this.getManager()
    return manager.saveConfig(config)
  }

  async getHomepageItems(): Promise<HomepageItem[]> {
    const manager = await this.getManager()
    return manager.getHomepageItems()
  }

  async saveHomepageItems(items: HomepageItem[]): Promise<void> {
    const manager = await this.getManager()
    return manager.saveHomepageItems(items)
  }

  async getHomepageLayout(): Promise<HomepageLayout | null> {
    const manager = await this.getManager()
    return manager.getHomepageLayout()
  }

  async saveHomepageLayout(layout: HomepageLayout): Promise<void> {
    const manager = await this.getManager()
    return manager.saveHomepageLayout(layout)
  }

  async exportData(): Promise<string> {
    const manager = await this.getManager()
    return manager.exportData()
  }

  async importData(jsonData: string): Promise<void> {
    const manager = await this.getManager()
    return manager.importData(jsonData)
  }

  async clearAll(): Promise<void> {
    const manager = await this.getManager()
    return manager.clearAll()
  }
}

/**
 * IndexedDB 存储适配器（包装现有的 StorageManager）
 */
class IndexedDBStorageAdapter implements StorageAdapter {
  private storageManagerPromise: Promise<any>

  constructor() {
    // 使用 Promise 缓存，确保模块只加载一次，避免竞态
    this.storageManagerPromise = import('./storage').then(
      module => module.storageManager || module.default
    )
  }

  private async getManager(): Promise<any> {
    return await this.storageManagerPromise
  }

  isInitialized(): boolean {
    // IndexedDB 需要异步初始化，这里返回 false 更安全
    // 实际初始化状态由 storageManager 自己管理
    return false
  }

  async getBookmarks(): Promise<Bookmark[]> {
    const manager = await this.getManager()
    return manager.getBookmarks()
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const manager = await this.getManager()
    return manager.saveBookmark(bookmark)
  }

  async deleteBookmark(id: string): Promise<void> {
    const manager = await this.getManager()
    return manager.deleteBookmark(id)
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    const manager = await this.getManager()
    return manager.getBookmarksByCategory(categoryId)
  }

  async getCategories(): Promise<Category[]> {
    const manager = await this.getManager()
    return manager.getCategories()
  }

  async saveCategories(categories: Category[]): Promise<void> {
    const manager = await this.getManager()
    return manager.saveCategories(categories)
  }

  async getConfig(): Promise<AppConfig | null> {
    const manager = await this.getManager()
    return manager.getConfig()
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const manager = await this.getManager()
    return manager.saveConfig(config)
  }

  async getHomepageItems(): Promise<HomepageItem[]> {
    const manager = await this.getManager()
    // 尝试从 localStorage 迁移旧数据
    await this.migrateLegacyHomepageData()
    return manager.getHomepageItems()
  }

  async saveHomepageItems(items: HomepageItem[]): Promise<void> {
    const manager = await this.getManager()
    return manager.saveHomepageItems(items)
  }

  async getHomepageLayout(): Promise<HomepageLayout | null> {
    const manager = await this.getManager()
    // 尝试从 localStorage 迁移旧数据
    await this.migrateLegacyHomepageData()
    return manager.getHomepageLayout()
  }

  async saveHomepageLayout(layout: HomepageLayout): Promise<void> {
    const manager = await this.getManager()
    return manager.saveHomepageLayout(layout)
  }

  /**
   * 迁移 localStorage 中的旧数据到 IndexedDB（仅执行一次）
   */
  private migrated = false
  private async migrateLegacyHomepageData(): Promise<void> {
    if (this.migrated) return
    this.migrated = true

    try {
      const stored = localStorage.getItem('navigator_homepage_layout')
      if (!stored) return

      const manager = await this.getManager()

      // 检查 IndexedDB 中是否已有数据
      const existing = await manager.getHomepageLayout()
      if (existing) return // 已有数据，不迁移

      // 解析 localStorage 数据
      const data = JSON.parse(stored)

      // 迁移到 IndexedDB
      const layout: HomepageLayout = {
        config: {
          ...data.config,
          lastModified: new Date(data.config?.lastModified || Date.now())
        },
        items: (data.items || []).map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt || Date.now())
        }))
      }

      await manager.saveHomepageLayout(layout)

      // 迁移成功后清除 localStorage 旧数据
      localStorage.removeItem('navigator_homepage_layout')
    } catch (error) {
      console.error('[Storage Migration] Failed to migrate homepage data:', error)
    }
  }

  async exportData(): Promise<string> {
    const manager = await this.getManager()
    return manager.exportData()
  }

  async importData(jsonData: string): Promise<void> {
    const manager = await this.getManager()
    return manager.importData(jsonData)
  }

  async clearAll(): Promise<void> {
    const manager = await this.getManager()
    return manager.clearAll()
  }
}

/**
 * 获取存储实例（单例）
 */
let storageInstance: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (storageInstance) {
    console.error('[Storage Factory] 返回已有实例')
    return storageInstance
  }

  const env = detectEnvironment()

  switch (env) {
    case 'chrome-extension': {
      console.error('[Storage Factory] 创建 ChromeStorageProxy 实例')
      // 使用 ChromeStorageProxy 代替原始 Proxy，避免每次调用都 import
      storageInstance = new ChromeStorageProxy() as StorageAdapter
      break
    }

    case 'web':
    default: {
      console.error('[Storage Factory] 创建 IndexedDBStorageAdapter 实例')
      // 使用 IndexedDB（现有实现）
      storageInstance = new IndexedDBStorageAdapter() as StorageAdapter
      break
    }
  }

  return storageInstance
}

/**
 * 重置存储实例（用于测试）
 */
export function resetStorage(): void {
  storageInstance = null
}

/**
 * 获取当前环境信息
 */
export function getEnvironmentInfo() {
  const env = detectEnvironment()

  return {
    environment: env,
    isExtension: env === 'chrome-extension',
    isWeb: env === 'web',
    supportsBrowserBookmarks: typeof chrome !== 'undefined' && !!chrome.bookmarks
  }
}
