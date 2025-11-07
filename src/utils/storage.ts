/**
 * 数据存储管理器
 * 使用 IndexedDB 进行所有数据存储
 */

import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'

// 开发模式使用独立数据库名称，避免和生产环境冲突
const DB_NAME = import.meta.env.DEV ? 'NavigatorDB_Dev' : 'NavigatorDB'

// 数据库结构定义（修改这里会自动触发升级）
const DB_SCHEMA = {
  bookmarks: { indexes: ['categoryId', 'tags', 'isPrivate'] },
  categories: { indexes: ['parentId', 'sort', 'isPinned'] },
  config: { indexes: [] },
  searchIndex: { indexes: [] },
  backups: { indexes: ['timestamp'] }
}

// 自动计算版本号：基于结构的简单哈希
const DB_VERSION = Object.keys(DB_SCHEMA).length +
  Object.values(DB_SCHEMA).reduce((sum, s) => sum + s.indexes.length, 0)
// 当前版本: 5 个存储 + 8 个索引 = 13

console.log(`Using database: ${DB_NAME} (version ${DB_VERSION})`)

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
        console.log('Database opened successfully, object stores:', objectStores)

        // 验证必需的对象存储是否存在
        const requiredStores = ['bookmarks', 'categories', 'config', 'searchIndex', 'backups']
        const missingStores = requiredStores.filter(name => !objectStores.includes(name))

        if (missingStores.length > 0) {
          console.warn('Missing object stores:', missingStores, '- Database will be recreated')
          this.db.close()
          this.db = null

          // 删除损坏的数据库
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
          deleteRequest.onsuccess = () => {
            console.log('Old database deleted, reinitializing...')
            // 递归重新初始化
            this.initDatabase().then(resolve).catch(reject)
          }
          deleteRequest.onerror = () => {
            reject(new Error('Failed to delete corrupted database'))
          }
        } else {
          resolve()
        }
      }

      request.onupgradeneeded = (event) => {
        console.log('Database upgrade needed, from version', event.oldVersion, 'to', DB_VERSION)
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
      if (data.categories && Array.isArray(data.categories)) {
        await this.saveCategories(data.categories)
      }

      // 导入配置
      if (data.config) {
        await this.saveConfig(data.config)
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
    console.log('✅ 数据库已删除，正在刷新页面...')
    setTimeout(() => location.reload(), 500)
  }
  console.log('💡 开发提示: 控制台输入 __clearDB__() 可快速清除数据库')
}
export default storageManager
