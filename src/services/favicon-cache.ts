/**
 * Favicon 本地缓存服务
 * 使用 IndexedDB 存储图标，避免重复网络请求
 */

interface FaviconCache {
  url: string
  dataUrl: string
  timestamp: number
}

const CACHE_DB_NAME = 'FaviconCache'
const CACHE_DB_VERSION = 1
const CACHE_STORE_NAME = 'favicons'
const CACHE_EXPIRY_DAYS = 30 // 缓存30天

class FaviconCacheService {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'url' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * 获取缓存的 Favicon
   */
  async get(url: string): Promise<string | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE_NAME], 'readonly')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.get(url)

      request.onsuccess = () => {
        const result = request.result as FaviconCache | undefined
        if (!result) {
          resolve(null)
          return
        }

        // 检查是否过期
        const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        if (Date.now() - result.timestamp > expiryTime) {
          // 过期，删除并返回 null
          this.delete(url)
          resolve(null)
          return
        }

        resolve(result.dataUrl)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 保存 Favicon 到缓存
   */
  async set(url: string, dataUrl: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)

      const cache: FaviconCache = {
        url,
        dataUrl,
        timestamp: Date.now()
      }

      const request = store.put(cache)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 删除缓存
   */
  async delete(url: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.delete(url)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 获取 Favicon URL（带缓存）
   */
  async getFavicon(websiteUrl: string): Promise<string> {
    try {
      const domain = new URL(websiteUrl).origin
      const cacheKey = `favicon:${domain}`

      // 1. 尝试从缓存获取
      const cached = await this.get(cacheKey)
      if (cached) {
        return cached
      }

      // 2. 缓存未命中，使用 Google Favicon API (支持 CORS)
      const hostname = new URL(websiteUrl).hostname
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`

      // 3. 尝试转换为 Data URL（优先），失败则缓存原 URL
      let cacheValue: string
      try {
        cacheValue = await this.urlToDataUrl(faviconUrl)
        // 如果转换成功（Data URL 长度通常 > 200），缓存 Data URL
        if (cacheValue.startsWith('data:') && cacheValue.length > 200) {
          await this.set(cacheKey, cacheValue)
          return cacheValue
        }
      } catch {
        // 转换失败，使用原 URL
      }

      // 4. 缓存 URL（虽然不是 Data URL，但仍然有效）
      await this.set(cacheKey, faviconUrl)
      return faviconUrl
    } catch (error) {
      console.warn('Failed to get favicon:', error)
      // 返回默认图标
      return this.getDefaultFavicon(websiteUrl)
    }
  }


  /**
   * 将图片 URL 转换为 Data URL
   * Google Favicon API 支持 CORS
   */
  private async urlToDataUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width || 32
          canvas.height = img.height || 32

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }

          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')

          // 验证是否成功生成 Data URL
          if (dataUrl && dataUrl.startsWith('data:image')) {
            resolve(dataUrl)
          } else {
            reject(new Error('Failed to generate data URL'))
          }
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  /**
   * 获取默认 Favicon（第一个字母）
   */
  private getDefaultFavicon(url: string): string {
    try {
      const hostname = new URL(url).hostname
      const letter = hostname[0].toUpperCase()

      // 生成简单的 SVG 图标
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" fill="#e0e0e0" rx="4"/>
          <text x="16" y="22" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#666">${letter}</text>
        </svg>
      `
      return `data:image/svg+xml;base64,${btoa(svg)}`
    } catch {
      return ''
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpired(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.openCursor()

      const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const cache = cursor.value as FaviconCache
          if (Date.now() - cache.timestamp > expiryTime) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  }
}

export const faviconCache = new FaviconCacheService()
