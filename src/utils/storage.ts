/**
 * 数据存储管理器
 * 支持 localStorage 和 IndexedDB
 */

import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'

const STORAGE_KEYS = {
  CONFIG: 'navigator_config',
  CATEGORIES: 'navigator_categories',
  SESSION: 'navigator_session'
}

const DB_NAME = 'NavigatorDB'
const DB_VERSION = 1

class StorageManager {
  private db: IDBDatabase | null = null

  /**
   * 初始化 IndexedDB
   */
  async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建书签存储
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' })
          bookmarkStore.createIndex('categoryId', 'categoryId', { unique: false })
          bookmarkStore.createIndex('tags', 'tags', { unique: false, multiEntry: true })
          bookmarkStore.createIndex('isPrivate', 'isPrivate', { unique: false })
        }

        // 创建搜索索引存储
        if (!db.objectStoreNames.contains('searchIndex')) {
          db.createObjectStore('searchIndex', { keyPath: 'id' })
        }

        // 创建备份存储
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true })
          backupStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * localStorage 操作
   */
  setLocal<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  getLocal<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
      return defaultValue || null
    }
  }

  removeLocal(key: string): void {
    localStorage.removeItem(key)
  }

  /**
   * IndexedDB 书签操作
   */
  async saveBookmark(bookmark: Bookmark): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookmarks'], 'readwrite')
      const store = transaction.objectStore('bookmarks')
      const request = store.put(bookmark)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getBookmarks(): Promise<Bookmark[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookmarks'], 'readonly')
      const store = transaction.objectStore('bookmarks')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookmarks'], 'readonly')
      const store = transaction.objectStore('bookmarks')
      const index = store.index('categoryId')
      const request = index.getAll(categoryId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteBookmark(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookmarks'], 'readwrite')
      const store = transaction.objectStore('bookmarks')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 配置管理
   */
  saveConfig(config: AppConfig): void {
    this.setLocal(STORAGE_KEYS.CONFIG, config)
  }

  getConfig(): AppConfig | null {
    return this.getLocal<AppConfig>(STORAGE_KEYS.CONFIG)
  }

  /**
   * 分类管理
   */
  saveCategories(categories: Category[]): void {
    this.setLocal(STORAGE_KEYS.CATEGORIES, categories)
  }

  getCategories(): Category[] | null {
    return this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES)
  }

  /**
   * 数据导出
   */
  async exportData(): Promise<string> {
    const bookmarks = await this.getBookmarks()
    const categories = this.getCategories()
    const config = this.getConfig()

    const data = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      bookmarks,
      categories,
      config
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * 数据导入
   */
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
      if (data.categories) {
        this.saveCategories(data.categories)
      }

      // 导入配置
      if (data.config) {
        this.saveConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to import data:', error)
      throw new Error('Invalid data format')
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    // 清空 localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      this.removeLocal(key)
    })

    // 清空 IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['bookmarks', 'searchIndex', 'backups'], 'readwrite')

        transaction.objectStore('bookmarks').clear()
        transaction.objectStore('searchIndex').clear()
        transaction.objectStore('backups').clear()

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    }
  }
}

export const storageManager = new StorageManager()
export default storageManager
