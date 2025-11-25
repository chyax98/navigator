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

const STORAGE_LOCK_KEY = 'navigator_storage_lock'
const DISTRIBUTED_LOCK_TIMEOUT = 4000
const DISTRIBUTED_LOCK_HEARTBEAT = 1000
const DISTRIBUTED_LOCK_RETRY_MIN_DELAY = 20
const DISTRIBUTED_LOCK_RETRY_JITTER = 30

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

export class ChromeStorageManager implements StorageAdapter {
  private initialized = false
  private writeLock: Promise<void> = Promise.resolve()
  private lockQueue = 0 // 统计锁队列长度（调试用）
  private readonly instanceId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `navigator-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  private startLockHeartbeat(lockId: string): ReturnType<typeof setInterval> | null {
    if (typeof setInterval === 'undefined') {
      return null
    }
    return setInterval(() => {
      this.renewDistributedLock(lockId).catch(error => {
        console.warn('[ChromeStorage] ⚠️ 跨上下文锁续约失败:', (error as Error).message)
      })
    }, DISTRIBUTED_LOCK_HEARTBEAT)
  }

  private async waitForDistributedLock(lockId: string): Promise<void> {
    let warned = false
    const start = Date.now()

    while (!(await this.tryAcquireDistributedLock(lockId))) {
      if (!warned && import.meta.env.DEV && Date.now() - start > DISTRIBUTED_LOCK_TIMEOUT * 2) {
        console.warn('[ChromeStorage] ⚠️ 等待跨上下文锁时间较长，可能存在僵尸锁')
        warned = true
      }

      const jitter = Math.floor(Math.random() * DISTRIBUTED_LOCK_RETRY_JITTER)
      await this.delay(DISTRIBUTED_LOCK_RETRY_MIN_DELAY + jitter)
    }

    return
  }

  private async tryAcquireDistributedLock(lockId: string): Promise<boolean> {
    const now = Date.now()
    const existing = await this.get<any>(STORAGE_LOCK_KEY)

    if (existing && existing.owner && existing.owner !== lockId) {
      const expiresAt = typeof existing.expiresAt === 'number' ? existing.expiresAt : 0
      if (expiresAt > now) {
        return false
      }
    }

    await this.set(STORAGE_LOCK_KEY, {
      owner: lockId,
      expiresAt: now + DISTRIBUTED_LOCK_TIMEOUT
    })

    const stored = await this.get<any>(STORAGE_LOCK_KEY)
    return stored?.owner === lockId
  }

  private async renewDistributedLock(lockId: string): Promise<void> {
    const existing = await this.get<any>(STORAGE_LOCK_KEY)
    if (existing?.owner !== lockId) {
      return
    }

    await this.set(STORAGE_LOCK_KEY, {
      owner: lockId,
      expiresAt: Date.now() + DISTRIBUTED_LOCK_TIMEOUT
    })
  }

  private async releaseDistributedLock(lockId: string): Promise<void> {
    const existing = await this.get<any>(STORAGE_LOCK_KEY)
    if (existing?.owner === lockId) {
      await this.remove(STORAGE_LOCK_KEY)
    }
  }

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

    let distributedLockId: string | null = null
    let hasDistributedLock = false
    let heartbeat: ReturnType<typeof setInterval> | null = null

    try {
      await previousLock
      distributedLockId = `${this.instanceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      await this.waitForDistributedLock(distributedLockId)
      hasDistributedLock = true
      heartbeat = this.startLockHeartbeat(distributedLockId)

      if (import.meta.env.DEV && queuePosition > 1) {
        console.log(`[ChromeStorage] 写操作开始执行 (队列位置: ${queuePosition})`)
      }
      return await operation()
    } finally {
      if (heartbeat) {
        clearInterval(heartbeat)
      }
      if (distributedLockId && hasDistributedLock) {
        await this.releaseDistributedLock(distributedLockId)
      }

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
      return []
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
      return []
    }
    return categories
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

    // 使用互斥锁防止并发写入导致数据丢失
    return this.acquireWriteLock(async () => {
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
    })
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
