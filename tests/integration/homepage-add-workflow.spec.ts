/**
 * Homepage 添加书签工作流集成测试
 * 模拟完整的用户操作流程：添加书签 → 刷新 → 验证数据
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHomepageStore } from '@/stores/homepage'
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
      { id: 'bookmark-1', title: 'Google', url: 'https://google.com', categoryId: 'cat-1', tags: [], createdAt: new Date(), updatedAt: new Date(), clickCount: 0, isPinned: false, sort: 0, source: 'user' },
      { id: 'bookmark-2', title: 'GitHub', url: 'https://github.com', categoryId: 'cat-1', tags: [], createdAt: new Date(), updatedAt: new Date(), clickCount: 0, isPinned: false, sort: 1, source: 'user' },
      { id: 'bookmark-3', title: 'Twitter', url: 'https://twitter.com', categoryId: 'cat-1', tags: [], createdAt: new Date(), updatedAt: new Date(), clickCount: 0, isPinned: false, sort: 2, source: 'user' }
    ]
  }))
}))

describe('Homepage 添加书签工作流 - 集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockStorage.clear()
  })

  describe('完整用户流程', () => {
    it('场景1: 单个书签 - 添加 → 刷新 → 验证', async () => {
      // 步骤1: 用户打开应用，初始化 store
      const store1 = useHomepageStore()
      await store1.loadLayout()

      expect(store1.items).toHaveLength(0)
      expect(store1.isEmpty).toBe(true)

      // 步骤2: 用户点击书签的房子图标，添加到主页
      await store1.addBookmark('bookmark-1')

      expect(store1.items).toHaveLength(1)
      expect(store1.items[0].bookmarkId).toBe('bookmark-1')
      expect(store1.isEmpty).toBe(false)

      // 步骤3: 验证数据已保存到存储
      const saved = await mockStorage.getHomepageLayout()
      expect(saved).toBeDefined()
      expect(saved!.items).toHaveLength(1)
      expect(saved!.items[0].bookmarkId).toBe('bookmark-1')

      // 步骤4: 模拟页面刷新（创建新 Pinia 实例）
      setActivePinia(createPinia())
      const store2 = useHomepageStore()

      // 步骤5: 加载数据
      await store2.loadLayout()

      // 步骤6: 验证数据恢复正确
      expect(store2.items).toHaveLength(1)
      expect(store2.items[0].bookmarkId).toBe('bookmark-1')
      expect(store2.isEmpty).toBe(false)
    })

    it('场景2: 多个书签 - 连续添加 → 刷新 → 验证', async () => {
      // 步骤1: 初始化
      const store1 = useHomepageStore()
      await store1.loadLayout()

      // 步骤2: 用户连续添加3个书签
      await store1.addBookmark('bookmark-1')
      await store1.addBookmark('bookmark-2')
      await store1.addBookmark('bookmark-3')

      expect(store1.items).toHaveLength(3)

      // 步骤3: 模拟页面刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 步骤4: 验证所有书签都恢复
      expect(store2.items).toHaveLength(3)
      expect(store2.items.map(i => i.bookmarkId)).toEqual([
        'bookmark-1',
        'bookmark-2',
        'bookmark-3'
      ])
    })

    it('场景3: 并发添加 → 刷新 → 验证（压力测试）', async () => {
      // 步骤1: 初始化
      const store1 = useHomepageStore()
      await store1.loadLayout()

      // 步骤2: 用户快速点击多个书签（并发操作）
      await Promise.all([
        store1.addBookmark('bookmark-1'),
        store1.addBookmark('bookmark-2'),
        store1.addBookmark('bookmark-3')
      ])

      // 步骤3: 验证内存中的数据
      expect(store1.items).toHaveLength(3)

      // 步骤4: 验证存储中的数据
      const saved = await mockStorage.getHomepageLayout()
      expect(saved!.items).toHaveLength(3)

      // 步骤5: 模拟页面刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 步骤6: 验证刷新后数据完整
      expect(store2.items).toHaveLength(3)
      const bookmarkIds = store2.items.map(i => i.bookmarkId).sort()
      expect(bookmarkIds).toEqual(['bookmark-1', 'bookmark-2', 'bookmark-3'])
    })

    it('场景4: 添加 → 移除 → 刷新 → 验证', async () => {
      // 步骤1: 添加3个书签
      const store1 = useHomepageStore()
      await store1.loadLayout()
      await store1.addBookmark('bookmark-1')
      await store1.addBookmark('bookmark-2')
      await store1.addBookmark('bookmark-3')

      // 步骤2: 移除中间的书签
      await store1.removeBookmark('bookmark-2')

      expect(store1.items).toHaveLength(2)
      expect(store1.items.map(i => i.bookmarkId)).toEqual([
        'bookmark-1',
        'bookmark-3'
      ])

      // 步骤3: 模拟页面刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 步骤4: 验证只有2个书签
      expect(store2.items).toHaveLength(2)
      expect(store2.items.map(i => i.bookmarkId)).toEqual([
        'bookmark-1',
        'bookmark-3'
      ])
    })

    it('场景5: 多次刷新 → 验证数据不变', async () => {
      // 步骤1: 添加书签
      const store1 = useHomepageStore()
      await store1.loadLayout()
      await store1.addBookmark('bookmark-1')
      await store1.addBookmark('bookmark-2')

      const originalIds = store1.items.map(i => i.bookmarkId)

      // 步骤2: 第一次刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()
      expect(store2.items.map(i => i.bookmarkId)).toEqual(originalIds)

      // 步骤3: 第二次刷新
      setActivePinia(createPinia())
      const store3 = useHomepageStore()
      await store3.loadLayout()
      expect(store3.items.map(i => i.bookmarkId)).toEqual(originalIds)

      // 步骤4: 第三次刷新
      setActivePinia(createPinia())
      const store4 = useHomepageStore()
      await store4.loadLayout()
      expect(store4.items.map(i => i.bookmarkId)).toEqual(originalIds)

      // 验证：所有刷新后数据一致
      expect(store4.items).toHaveLength(2)
    })
  })

  describe('边界情况测试', () => {
    it('空状态刷新应该保持空状态', async () => {
      // 步骤1: 初始化但不添加任何书签
      const store1 = useHomepageStore()
      await store1.loadLayout()
      expect(store1.isEmpty).toBe(true)

      // 步骤2: 刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 步骤3: 验证仍然为空
      expect(store2.isEmpty).toBe(true)
      expect(store2.items).toHaveLength(0)
    })

    it('重复添加应该被忽略', async () => {
      const store = useHomepageStore()
      await store.loadLayout()

      await store.addBookmark('bookmark-1')
      await store.addBookmark('bookmark-1') // 重复添加

      expect(store.items).toHaveLength(1)
    })
  })

  describe('数据一致性验证', () => {
    it('验证 gridIndex 在刷新后保持一致', async () => {
      // 步骤1: 添加书签
      const store1 = useHomepageStore()
      await store1.loadLayout()
      await store1.addBookmark('bookmark-1')
      await store1.addBookmark('bookmark-2')
      await store1.addBookmark('bookmark-3')

      const originalIndexes = store1.items.map(i => ({ id: i.bookmarkId, index: i.gridIndex }))

      // 步骤2: 刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 步骤3: 验证 gridIndex 一致
      const restoredIndexes = store2.items.map(i => ({ id: i.bookmarkId, index: i.gridIndex }))
      expect(restoredIndexes).toEqual(originalIndexes)
    })

    it('验证 addedAt 字段存在且有效', async () => {
      // 步骤1: 添加书签
      const store1 = useHomepageStore()
      await store1.loadLayout()
      await store1.addBookmark('bookmark-1')

      const originalDate = store1.items[0].addedAt

      // 验证是 Date 对象或有效日期字符串
      expect(originalDate).toBeDefined()
      expect(originalDate instanceof Date || typeof originalDate === 'string').toBe(true)

      // 步骤2: 刷新
      setActivePinia(createPinia())
      const store2 = useHomepageStore()
      await store2.loadLayout()

      // 步骤3: 验证字段存在
      expect(store2.items[0].addedAt).toBeDefined()
    })
  })
})
