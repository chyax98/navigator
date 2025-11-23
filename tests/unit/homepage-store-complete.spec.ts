/**
 * Homepage Store 完整单元测试
 * 基于 Pinia 官方测试最佳实践
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHomepageStore } from '@/stores/homepage'
import { useBookmarkStore } from '@/stores/bookmark'
import type { HomepageLayout } from '@/types/homepage'

// Mock storage adapter
const mockStorage = {
  data: {} as Record<string, any>,

  async getHomepageLayout(): Promise<HomepageLayout | null> {
    return this.data.homepage_layout || null
  },

  async saveHomepageLayout(layout: HomepageLayout): Promise<void> {
    this.data.homepage_layout = JSON.parse(JSON.stringify(layout))
  },

  async getBookmarks() {
    return []
  },

  async saveBookmark() {},
  async deleteBookmark() {},
  async getBookmarksByCategory() { return [] },
  async getCategories() { return [] },
  async saveCategories() {},
  async getConfig() { return null },
  async saveConfig() {},
  async getHomepageItems() { return [] },
  async saveHomepageItems() {},
  async exportData() { return '{}' },
  async importData() {},
  async clearAll() {},
  isInitialized() { return true },

  clear() {
    this.data = {}
  }
}

// Mock storage factory
vi.mock('@/utils/storage-factory', () => ({
  getStorage: () => mockStorage
}))

// Mock bookmark store
vi.mock('@/stores/bookmark', () => ({
  useBookmarkStore: vi.fn(() => ({
    bookmarks: [
      { id: 'bookmark-1', title: 'Test 1', url: 'https://test1.com', categoryId: 'cat-1', tags: [], createdAt: new Date(), updatedAt: new Date(), clickCount: 0, isPinned: false, sort: 0, source: 'user' },
      { id: 'bookmark-2', title: 'Test 2', url: 'https://test2.com', categoryId: 'cat-1', tags: [], createdAt: new Date(), updatedAt: new Date(), clickCount: 0, isPinned: false, sort: 1, source: 'user' },
      { id: 'bookmark-3', title: 'Test 3', url: 'https://test3.com', categoryId: 'cat-1', tags: [], createdAt: new Date(), updatedAt: new Date(), clickCount: 0, isPinned: false, sort: 2, source: 'user' }
    ]
  }))
}))

describe('Homepage Store - 完整测试', () => {
  beforeEach(() => {
    // 创建新的 Pinia 实例并激活
    setActivePinia(createPinia())
    // 清空 mock storage
    mockStorage.clear()
  })

  describe('初始化和加载', () => {
    it('应该正确初始化默认状态', () => {
      const store = useHomepageStore()

      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.config).toBeDefined()
      expect(store.config.columns).toBeGreaterThan(0)
    })

    it('存储为空时应该加载默认配置', async () => {
      const store = useHomepageStore()

      await store.loadLayout()

      expect(store.items).toEqual([])
      expect(store.config).toBeDefined()
      expect(store.loading).toBe(false)
    })

    it('应该正确加载存储的数据', async () => {
      // 准备测试数据
      const testLayout: HomepageLayout = {
        config: {
          version: 1,
          columns: 4,
          lastModified: new Date(),
          showEmptyGuide: true
        },
        items: [
          { bookmarkId: 'bookmark-1', gridIndex: 0, addedAt: new Date() },
          { bookmarkId: 'bookmark-2', gridIndex: 1, addedAt: new Date() }
        ]
      }

      // 预先保存数据
      await mockStorage.saveHomepageLayout(testLayout)

      const store = useHomepageStore()
      await store.loadLayout()

      expect(store.items).toHaveLength(2)
      expect(store.items[0].bookmarkId).toBe('bookmark-1')
      expect(store.items[1].bookmarkId).toBe('bookmark-2')
      expect(store.config.columns).toBe(4)
    })

    it('数据格式错误时应该使用默认配置', async () => {
      // 保存错误格式的数据
      mockStorage.data.homepage_layout = { invalid: 'data' }

      const store = useHomepageStore()

      // 应该捕获错误并静默使用默认配置（不抛出错误）
      await store.loadLayout()

      // 验证使用了默认配置
      expect(store.items).toEqual([])
      expect(store.config.version).toBe(1)
      expect(store.config.columns).toBeGreaterThan(0)
    })
  })

  describe('添加书签到主页', () => {
    it('应该成功添加单个书签', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')

      expect(store.items).toHaveLength(1)
      expect(store.items[0].bookmarkId).toBe('bookmark-1')
      expect(store.items[0].gridIndex).toBe(0)
    })

    it('添加的书签应该持久化到存储', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')

      // 验证存储中的数据
      const saved = await mockStorage.getHomepageLayout()
      expect(saved).toBeDefined()
      expect(saved!.items).toHaveLength(1)
      expect(saved!.items[0].bookmarkId).toBe('bookmark-1')
    })

    it('应该支持连续添加多个书签', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')
      await store.addBookmark('bookmark-2')
      await store.addBookmark('bookmark-3')

      expect(store.items).toHaveLength(3)
      expect(store.items.map(i => i.bookmarkId)).toEqual(['bookmark-1', 'bookmark-2', 'bookmark-3'])
    })

    it('不应该重复添加已存在的书签', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')
      await store.addBookmark('bookmark-1') // 重复添加

      expect(store.items).toHaveLength(1)
    })

    it('添加不存在的书签应该抛出错误', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await expect(store.addBookmark('non-existent')).rejects.toThrow('Bookmark not found')
    })
  })

  describe('并发添加测试（关键场景）', () => {
    it('并发添加多个书签应该全部保存', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      // 并发添加5个书签
      await Promise.all([
        store.addBookmark('bookmark-1'),
        store.addBookmark('bookmark-2'),
        store.addBookmark('bookmark-3')
      ])

      // 内存中应该有3个
      expect(store.items).toHaveLength(3)

      // 存储中也应该有3个
      const saved = await mockStorage.getHomepageLayout()
      expect(saved!.items).toHaveLength(3)
    })

    it('高频并发添加应该不丢失数据（压力测试）', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      // 快速并发添加
      const promises = []
      for (let i = 1; i <= 3; i++) {
        promises.push(store.addBookmark(`bookmark-${i}`))
      }

      await Promise.all(promises)

      // 所有书签都应该保存
      expect(store.items).toHaveLength(3)

      const saved = await mockStorage.getHomepageLayout()
      expect(saved!.items).toHaveLength(3)

      // 验证所有 ID 都存在
      const savedIds = saved!.items.map(item => item.bookmarkId).sort()
      expect(savedIds).toEqual(['bookmark-1', 'bookmark-2', 'bookmark-3'])
    })
  })

  describe('移除书签', () => {
    it('应该成功移除书签', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')
      await store.addBookmark('bookmark-2')

      await store.removeBookmark('bookmark-1')

      expect(store.items).toHaveLength(1)
      expect(store.items[0].bookmarkId).toBe('bookmark-2')
    })

    it('移除后应该重新索引', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')
      await store.addBookmark('bookmark-2')
      await store.addBookmark('bookmark-3')

      await store.removeBookmark('bookmark-2')

      // gridIndex 应该重新编号
      expect(store.items[0].gridIndex).toBe(0)
      expect(store.items[1].gridIndex).toBe(1)
    })
  })

  describe('Getters', () => {
    it('isEmpty 应该正确反映状态', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      expect(store.isEmpty).toBe(true)

      await store.addBookmark('bookmark-1')

      expect(store.isEmpty).toBe(false)
    })

    it('itemCount 应该返回正确的数量', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      expect(store.itemCount).toBe(0)

      await store.addBookmark('bookmark-1')
      await store.addBookmark('bookmark-2')

      expect(store.itemCount).toBe(2)
    })

    it('itemsWithBookmarks 应该返回完整的书签信息', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')

      expect(store.itemsWithBookmarks).toHaveLength(1)
      expect(store.itemsWithBookmarks[0].bookmark).toBeDefined()
      expect(store.itemsWithBookmarks[0].bookmark?.title).toBe('Test 1')
    })
  })

  describe('辅助方法', () => {
    it('hasBookmark 应该正确检查书签是否存在', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      expect(store.hasBookmark('bookmark-1')).toBe(false)

      await store.addBookmark('bookmark-1')

      expect(store.hasBookmark('bookmark-1')).toBe(true)
    })
  })

  describe('持久化完整性测试', () => {
    it('添加->保存->加载 流程应该保持数据一致', async () => {
      // 第一个 store 实例：添加数据
      const store1 = useHomepageStore()
      await store1.loadLayout()
      await store1.addBookmark('bookmark-1')
      await store1.addBookmark('bookmark-2')

      // 创建新的 Pinia 实例模拟页面刷新
      setActivePinia(createPinia())

      // 第二个 store 实例：加载数据
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 数据应该一致
      expect(store2.items).toHaveLength(2)
      expect(store2.items.map(i => i.bookmarkId)).toEqual(['bookmark-1', 'bookmark-2'])
    })

    it('多次保存应该保持数据完整性', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      // 添加第一个
      await store.addBookmark('bookmark-1')
      let saved = await mockStorage.getHomepageLayout()
      expect(saved!.items).toHaveLength(1)

      // 添加第二个
      await store.addBookmark('bookmark-2')
      saved = await mockStorage.getHomepageLayout()
      expect(saved!.items).toHaveLength(2)

      // 添加第三个
      await store.addBookmark('bookmark-3')
      saved = await mockStorage.getHomepageLayout()
      expect(saved!.items).toHaveLength(3)

      // 最终验证
      expect(saved!.items.map(i => i.bookmarkId)).toEqual(['bookmark-1', 'bookmark-2', 'bookmark-3'])
    })
  })
})
