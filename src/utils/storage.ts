/**
 * 数据存储管理器
 * 使用 IndexedDB 进行所有数据存储
 */

import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'

// 开发模式使用独立数据库名称，避免和生产环境冲突
const DB_NAME = import.meta.env.DEV ? 'NavigatorDB_Dev' : 'NavigatorDB'



// 使用固定的数据库版本号，避免结构变化时的递归问题
const DB_VERSION = 1

class StorageManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * 检查数据库是否已初始化
   */
  isInitialized(): boolean {
    return this.db !== null
  }

  /**
   * 确保数据库已初始化（幂等操作，处理并发调用）
   */
  private async ensureInitialized(): Promise<void> {
    // 如果已初始化，直接返回
    if (this.db !== null) return

    // 如果正在初始化，等待现有的初始化完成
    if (this.initPromise !== null) {
      await this.initPromise
      return
    }

    // 开始新的初始化
    this.initPromise = this.initDatabase()
    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  /**
   * 初始化 IndexedDB
   */
  async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        this.db = request.result
        const objectStores = Array.from(this.db.objectStoreNames)

        // 验证必需的对象存储是否存在
        const requiredStores = ['bookmarks', 'categories', 'config', 'searchIndex', 'backups']
        const missingStores = requiredStores.filter(name => !objectStores.includes(name))

        if (missingStores.length > 0) {
          console.warn('Missing object stores:', missingStores, '- Database will be recreated')
          this.db.close()
          this.db = null

          // 删除损坏的数据库，但添加重试限制防止无限递归
          this.recreateDatabase().then(resolve).catch(reject)
        } else {
          resolve()
        }
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!

        // 创建书签存储
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' })
          bookmarkStore.createIndex('categoryId', 'categoryId', { unique: false })
          bookmarkStore.createIndex('tags', 'tags', { unique: false, multiEntry: true })
          bookmarkStore.createIndex('isPrivate', 'isPrivate', { unique: false })
        }

        // 创建分类存储
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' })
          categoryStore.createIndex('parentId', 'parentId', { unique: false })
          categoryStore.createIndex('sort', 'sort', { unique: false })
          categoryStore.createIndex('isPinned', 'isPinned', { unique: false })
        }

        // 创建配置存储
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'id' })
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

        // 等待升级事务完成
        transaction.oncomplete = () => {
          // onupgradeneeded 完成，onsuccess 会在之后自动触发
        }
      }
    })
  }

  /**
   * IndexedDB 书签操作
   */
  async saveBookmark(bookmark: Bookmark): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookmarks'], 'readwrite')
      const store = transaction.objectStore('bookmarks')
      const request = store.put(bookmark)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getBookmarks(): Promise<Bookmark[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookmarks'], 'readonly')
      const store = transaction.objectStore('bookmarks')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getBookmarksByCategory(categoryId: string): Promise<Bookmark[]> {
    await this.ensureInitialized()

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
    await this.ensureInitialized()

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
  async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readwrite')
      const store = transaction.objectStore('config')

      // 深拷贝并序列化，移除不可克隆的数据（如函数、Proxy）
      const cleanConfig = JSON.parse(JSON.stringify(config))
      const request = store.put({ id: 'app-config', ...cleanConfig })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getConfig(): Promise<AppConfig | null> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readonly')
      const store = transaction.objectStore('config')
      const request = store.get('app-config')

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...config } = result
          resolve(config as AppConfig)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 分类管理
   */
  async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite')
      const store = transaction.objectStore('categories')

      // 先清空现有数据
      store.clear()

      // 批量插入新数据
      categories.forEach(category => {
        store.put(category)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readonly')
      const store = transaction.objectStore('categories')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 主页布局管理
   */
  async getHomepageLayout(): Promise<any> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readonly')
      const store = transaction.objectStore('config')
      const request = store.get('homepage-layout')

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...layout } = result

          // 反序列化 Date 对象
          if (layout.config && layout.config.lastModified) {
            layout.config.lastModified = new Date(layout.config.lastModified)
          }
          if (Array.isArray(layout.items)) {
            layout.items = layout.items.map((item: any) => ({
              ...item,
              addedAt: item.addedAt ? new Date(item.addedAt) : new Date()
            }))
          }

          resolve(layout)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveHomepageLayout(layout: any): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['config'], 'readwrite')
      const store = transaction.objectStore('config')

      // 序列化 Date 对象
      const serializedLayout: any = {
        id: 'homepage-layout',
        config: layout.config ? {
          ...layout.config,
          lastModified: layout.config.lastModified instanceof Date
            ? layout.config.lastModified.toISOString()
            : layout.config.lastModified
        } : {},
        items: Array.isArray(layout.items)
          ? layout.items.map((item: any) => ({
              ...item,
              addedAt: item.addedAt instanceof Date
                ? item.addedAt.toISOString()
                : item.addedAt
            }))
          : []
      }

      const request = store.put(serializedLayout)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getHomepageItems(): Promise<any[]> {
    const layout = await this.getHomepageLayout()
    return layout?.items || []
  }

  async saveHomepageItems(items: any[]): Promise<void> {
    const layout = await this.getHomepageLayout() || { config: {}, items: [] }
    layout.items = items
    if (!layout.config) {
      layout.config = {
        version: 1,
        columns: 3,
        lastModified: new Date()
      }
    }
    await this.saveHomepageLayout(layout)
  }

  /**
   * 数据导出
   */
  async exportData(): Promise<string> {
    const [bookmarks, categories, config] = await Promise.all([
      this.getBookmarks(),
      this.getCategories(),
      this.getConfig()
    ])

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
   * 安全地重新创建数据库，防止无限递归
   */
  private async recreateDatabase(maxRetries = 2): Promise<void> {
    if (maxRetries <= 0) {
      throw new Error('数据库重建失败：已达最大重试次数')
    }

    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
      
      deleteRequest.onsuccess = () => {
        // 使用新的数据库连接进行初始化
        const newRequest = indexedDB.open(DB_NAME, DB_VERSION)
        
        newRequest.onsuccess = () => {
          this.db = newRequest.result
          resolve()
        }
        
        newRequest.onerror = () => {
          // 如果仍然失败，减少重试次数并递归调用
          this.recreateDatabase(maxRetries - 1).then(resolve).catch(reject)
        }
      }
      
      deleteRequest.onerror = () => {
        reject(new Error('Failed to delete corrupted database'))
      }
    })
  }

  /**
   * 数据导入（添加安全验证）
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      // 验证导入数据的基本结构
      this.validateImportData(data)

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
    } catch (error) {
      console.error('Failed to import data:', error)
      throw new Error(`数据导入失败: ${error instanceof Error ? error.message : 'Invalid data format'}`)
    }
  }

  /**
   * 验证导入数据的基本结构和安全性
   */
  private validateImportData(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('导入数据必须是对象')
    }

    const importData = data as any

    // 验证版本信息
    if (importData.version && typeof importData.version !== 'string') {
      throw new Error('版本信息必须是字符串')
    }

    // 验证时间戳
    if (importData.timestamp && typeof importData.timestamp !== 'string') {
      throw new Error('时间戳必须是字符串')
    }

    // 验证书签数组
    if (importData.bookmarks && !Array.isArray(importData.bookmarks)) {
      throw new Error('书签数据必须是数组')
    }

    // 验证分类数组
    if (importData.categories && !Array.isArray(importData.categories)) {
      throw new Error('分类数据必须是数组')
    }

    // 验证配置对象
    if (importData.config && typeof importData.config !== 'object') {
      throw new Error('配置数据必须是对象')
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    // 清空 IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(
          ['bookmarks', 'categories', 'config', 'searchIndex', 'backups'],
          'readwrite'
        )

        transaction.objectStore('bookmarks').clear()
        transaction.objectStore('categories').clear()
        transaction.objectStore('config').clear()
        transaction.objectStore('searchIndex').clear()
        transaction.objectStore('backups').clear()

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    }
  }
}

export const storageManager = new StorageManager()

// 开发环境：暴露全局清库函数
if (import.meta.env.DEV) {
  (window as any).__clearDB__ = async () => {
    if (storageManager.isInitialized()) {
      await storageManager.clearAll()
    }
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = resolve
      req.onerror = resolve
    })
    setTimeout(() => location.reload(), 500)
  }
}
export default storageManager
