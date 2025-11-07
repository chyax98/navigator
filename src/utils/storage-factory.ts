/**
 * 存储工厂
 * 自动检测运行环境并返回对应的存储实现
 */

import type { StorageAdapter } from './chrome-storage'
import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'
import type { HomepageItem } from '@/types/homepage'

/**
 * 运行环境类型
 */
export type RuntimeEnvironment = 'chrome-extension' | 'tauri' | 'web'

/**
 * 检测当前运行环境
 */
export function detectEnvironment(): RuntimeEnvironment {
  // 检查是否在 Chrome Extension 环境
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.runtime?.id) {
    return 'chrome-extension'
  }

  // 检查是否在 Tauri 环境
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return 'tauri'
  }

  // 默认为 Web 环境（使用 IndexedDB）
  return 'web'
}

/**
 * IndexedDB 存储适配器（包装现有的 StorageManager）
 */
class IndexedDBStorageAdapter implements StorageAdapter {
  private storageManager: any

  constructor() {
    // 动态导入现有的 storage.ts
    import('./storage').then(module => {
      this.storageManager = module.storageManager || module.default
    })
  }

  async ensureLoaded(): Promise<void> {
    if (!this.storageManager) {
      const module = await import('./storage')
      this.storageManager = module.storageManager || module.default
    }
  }

  isInitialized(): boolean {
    return this.storageManager?.isInitialized() || false
  }

  async getBookmarks(): Promise<Bookmark[]> {
    await this.ensureLoaded()
    return this.storageManager.getBookmarks()
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    await this.ensureLoaded()
    return this.storageManager.saveBookmark(bookmark)
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.ensureLoaded()
    return this.storageManager.deleteBookmark(id)
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    await this.ensureLoaded()
    return this.storageManager.getBookmarksByCategory(categoryId)
  }

  async getCategories(): Promise<Category[]> {
    await this.ensureLoaded()
    return this.storageManager.getCategories()
  }

  async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureLoaded()
    return this.storageManager.saveCategories(categories)
  }

  async getConfig(): Promise<AppConfig | null> {
    await this.ensureLoaded()
    return this.storageManager.getConfig()
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureLoaded()
    return this.storageManager.saveConfig(config)
  }

  async getHomepageItems(): Promise<HomepageItem[]> {
    await this.ensureLoaded()
    // IndexedDB 版本目前使用 localStorage，这里从 localStorage 读取
    const stored = localStorage.getItem('navigator_homepage_layout')
    if (stored) {
      try {
        const layout = JSON.parse(stored)
        return layout.items || []
      } catch {
        return []
      }
    }
    return []
  }

  async saveHomepageItems(items: HomepageItem[]): Promise<void> {
    await this.ensureLoaded()
    // IndexedDB 版本目前使用 localStorage，这里写入 localStorage
    const stored = localStorage.getItem('navigator_homepage_layout')
    let layout: any = {}

    if (stored) {
      try {
        layout = JSON.parse(stored)
      } catch {
        // 忽略解析错误
      }
    }

    layout.items = items
    layout.config = layout.config || {
      version: 1,
      columns: 3,
      lastModified: new Date().toISOString()
    }

    localStorage.setItem('navigator_homepage_layout', JSON.stringify(layout))
  }

  async exportData(): Promise<string> {
    await this.ensureLoaded()
    return this.storageManager.exportData()
  }

  async importData(jsonData: string): Promise<void> {
    await this.ensureLoaded()
    return this.storageManager.importData(jsonData)
  }

  async clearAll(): Promise<void> {
    await this.ensureLoaded()
    return this.storageManager.clearAll()
  }
}

/**
 * 获取存储实例（单例）
 */
let storageInstance: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (storageInstance) {
    return storageInstance
  }

  const env = detectEnvironment()

  switch (env) {
    case 'chrome-extension': {
      // 动态导入 Chrome Storage，先返回懒加载代理
      storageInstance = new Proxy({} as StorageAdapter, {
        get(_, prop) {
          if (prop === 'isInitialized') {
            // isInitialized 是同步方法，返回函数
            return () => {
              // Chrome Storage 总是就绪的
              return true
            }
          }
          // 其他方法返回异步函数
          return async (...args: any[]) => {
            const module = await import('./chrome-storage')
            const manager = module.chromeStorageManager || module.default
            return (manager as any)[prop](...args)
          }
        }
      })
      break
    }

    case 'tauri':
    case 'web':
    default: {
      // 使用 IndexedDB（现有实现）
      storageInstance = new IndexedDBStorageAdapter() as StorageAdapter
      break
    }
  }

  console.log(`[Storage Factory] Using ${env} storage backend`)
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
    isTauri: env === 'tauri',
    isWeb: env === 'web',
    supportsBrowserBookmarks: typeof chrome !== 'undefined' && !!chrome.bookmarks
  }
}
