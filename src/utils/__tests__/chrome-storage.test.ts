/**
 * Chrome Storage 适配器测试
 *
 * 注意：这些测试需要在 Chrome Extension 环境中运行
 * 可以通过 Chrome Extension 的 Service Worker 控制台执行
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { Bookmark, Category } from '@/types/bookmark'
import type { AppConfig } from '@/types/config'

// Mock Chrome Storage API
const mockStorage = new Map<string, any>()

globalThis.chrome = {
  storage: {
    local: {
      get: (keys: string[], callback: (result: any) => void) => {
        const result: any = {}
        keys.forEach(key => {
          if (mockStorage.has(key)) {
            result[key] = mockStorage.get(key)
          }
        })
        setTimeout(() => callback(result), 0)
      },
      set: (items: any, callback?: () => void) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        if (callback) setTimeout(callback, 0)
      },
      remove: (keys: string[], callback?: () => void) => {
        keys.forEach(key => mockStorage.delete(key))
        if (callback) setTimeout(callback, 0)
      }
    }
  },
  runtime: {
    id: 'test-extension-id',
    lastError: undefined
  }
} as any

describe('Chrome Storage Adapter', () => {
  let chromeStorage: any

  beforeEach(async () => {
    mockStorage.clear()
    const module = await import('../chrome-storage')
    chromeStorage = module.chromeStorageManager
  })

  describe('书签操作', () => {
    it('应该能保存和读取书签', async () => {
      const bookmark: Bookmark = {
        id: 'test-1',
        title: 'Test Bookmark',
        url: 'https://example.com',
        categoryId: 'cat-1',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      await chromeStorage.saveBookmark(bookmark)
      const bookmarks = await chromeStorage.getBookmarks()

      expect(bookmarks).toHaveLength(1)
      expect(bookmarks[0].id).toBe('test-1')
      expect(bookmarks[0].title).toBe('Test Bookmark')
    })

    it('应该能更新已存在的书签', async () => {
      const bookmark: Bookmark = {
        id: 'test-1',
        title: 'Original',
        url: 'https://example.com',
        categoryId: 'cat-1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      await chromeStorage.saveBookmark(bookmark)

      const updatedBookmark = { ...bookmark, title: 'Updated' }
      await chromeStorage.saveBookmark(updatedBookmark)

      const bookmarks = await chromeStorage.getBookmarks()
      expect(bookmarks).toHaveLength(1)
      expect(bookmarks[0].title).toBe('Updated')
    })

    it('应该能删除书签', async () => {
      const bookmark: Bookmark = {
        id: 'test-1',
        title: 'Test',
        url: 'https://example.com',
        categoryId: 'cat-1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      await chromeStorage.saveBookmark(bookmark)
      await chromeStorage.deleteBookmark('test-1')

      const bookmarks = await chromeStorage.getBookmarks()
      expect(bookmarks).toHaveLength(0)
    })

    it('应该能按分类查询书签', async () => {
      const bookmark1: Bookmark = {
        id: 'test-1',
        title: 'Bookmark 1',
        url: 'https://example1.com',
        categoryId: 'cat-1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      const bookmark2: Bookmark = {
        id: 'test-2',
        title: 'Bookmark 2',
        url: 'https://example2.com',
        categoryId: 'cat-2',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      await chromeStorage.saveBookmark(bookmark1)
      await chromeStorage.saveBookmark(bookmark2)

      const category1Bookmarks = await chromeStorage.getBookmarksByCategory('cat-1')
      expect(category1Bookmarks).toHaveLength(1)
      expect(category1Bookmarks[0].id).toBe('test-1')
    })
  })

  describe('分类操作', () => {
    it('应该能保存和读取分类', async () => {
      const categories: Category[] = [
        {
          id: 'cat-1',
          name: 'Category 1',
          sort: 0,
          isPrivate: false
        },
        {
          id: 'cat-2',
          name: 'Category 2',
          sort: 1,
          isPrivate: false
        }
      ]

      await chromeStorage.saveCategories(categories)
      const loaded = await chromeStorage.getCategories()

      expect(loaded).toHaveLength(2)
      expect(loaded[0].name).toBe('Category 1')
      expect(loaded[1].name).toBe('Category 2')
    })
  })

  describe('配置操作', () => {
    it('应该能保存和读取配置', async () => {
      const config: AppConfig = {
        theme: 'dark',
        language: 'zh-CN',
        searchEngine: 'fuse',
        passwordEnabled: false,
        autoBackup: true,
        maxBookmarksPerPage: 50,
        defaultView: 'grid',
        showFavicon: true,
        enableAnimations: true,
        enableDragSort: true,
        gridColumns: 3,
        pinnedCategorySortMode: 'custom',
        pinnedCategoryOrder: [],
        homeFeaturesOrder: []
      }

      await chromeStorage.saveConfig(config)
      const loaded = await chromeStorage.getConfig()

      expect(loaded).toBeTruthy()
      expect(loaded?.theme).toBe('dark')
      expect(loaded?.language).toBe('zh-CN')
    })
  })

  describe('数据管理', () => {
    it('应该能导出数据', async () => {
      const bookmark: Bookmark = {
        id: 'test-1',
        title: 'Test',
        url: 'https://example.com',
        categoryId: 'cat-1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      await chromeStorage.saveBookmark(bookmark)

      const exported = await chromeStorage.exportData()
      const data = JSON.parse(exported)

      expect(data.version).toBe('1.0.0')
      expect(data.bookmarks).toHaveLength(1)
      expect(data.bookmarks[0].id).toBe('test-1')
    })

    it('应该能导入数据', async () => {
      const data = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        bookmarks: [
          {
            id: 'test-1',
            title: 'Test',
            url: 'https://example.com',
            categoryId: 'cat-1',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isPrivate: false,
            clickCount: 0,
            sort: 0
          }
        ],
        categories: [
          {
            id: 'cat-1',
            name: 'Test Category',
            sort: 0,
            isPrivate: false
          }
        ]
      }

      await chromeStorage.importData(JSON.stringify(data))

      const bookmarks = await chromeStorage.getBookmarks()
      const categories = await chromeStorage.getCategories()

      expect(bookmarks).toHaveLength(1)
      expect(categories).toHaveLength(1)
    })

    it('应该能清空所有数据', async () => {
      const bookmark: Bookmark = {
        id: 'test-1',
        title: 'Test',
        url: 'https://example.com',
        categoryId: 'cat-1',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        clickCount: 0,
        sort: 0
      }

      await chromeStorage.saveBookmark(bookmark)
      await chromeStorage.clearAll()

      const bookmarks = await chromeStorage.getBookmarks()
      expect(bookmarks).toHaveLength(0)
    })
  })
})
