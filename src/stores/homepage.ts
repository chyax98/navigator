/**
 * 主页书签网格 Store
 *
 * 管理主页书签网格的状态、配置和持久化
 * @see specs/001-homepage-grid-layout/contracts/store-actions.ts
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBookmarkStore } from './bookmark'
import type {
  HomepageLayout,
  HomepageLayoutConfig,
  HomepageItem,
  HomepageItemWithBookmark
} from '@/types/homepage'
import { DEFAULT_CONFIG, COLUMN_CONSTRAINTS } from '@/types/homepage'
import { getStorage } from '@/utils/storage-factory'
import { DebugPanel } from '@/utils/debug'

export const useHomepageStore = defineStore('homepage', () => {
  const bookmarkStore = useBookmarkStore()
  const storage = getStorage()

  // ===== State =====

  /**
   * 网格配置
   */
  const config = ref<HomepageLayoutConfig>({ ...DEFAULT_CONFIG })

  /**
   * 主页书签项
   */
  const items = ref<HomepageItem[]>([])

  /**
   * 加载状态
   */
  const loading = ref(false)

  /**
   * 拖拽状态
   */
  const dragging = ref(false)

  // ===== Getters =====

  /**
   * 书签项与完整书签对象
   *
   * 过滤掉不存在的书签
   */
  const itemsWithBookmarks = computed<HomepageItemWithBookmark[]>(() => {
    return items.value
      .map((item) => {
        const bookmark = bookmarkStore.bookmarks.find((b) => b.id === item.bookmarkId)
        if (!bookmark) return null
        return {
          ...item,
          bookmark
        }
      })
      .filter((item): item is HomepageItemWithBookmark => item !== null)
  })

  /**
   * 网格行数
   */
  const gridRows = computed(() => {
    return Math.ceil(items.value.length / config.value.columns)
  })

  /**
   * 是否为空主页
   */
  const isEmpty = computed(() => items.value.length === 0)

  /**
   * 书签项数量
   */
  const itemCount = computed(() => items.value.length)

  // ===== Actions =====

  /**
   * 从统一存储层读取主页布局
   *
   * @throws {Error} 读取失败时使用默认配置
   */
  async function loadLayout(): Promise<void> {
    try {
      loading.value = true
      const data = await storage.getHomepageLayout()

      if (!data) {
        // 使用默认配置
        config.value = { ...DEFAULT_CONFIG }
        items.value = []
        return
      }

      // T039: 数据版本兼容性检查
      if (!data.config || !data.items) {
        throw new Error("Invalid layout data: missing required fields")
      }

      if (data.config.version !== DEFAULT_CONFIG.version) {
        console.warn(
          `Layout version mismatch: expected ${DEFAULT_CONFIG.version}, got ${data.config.version}. Resetting to default.`
        )
        config.value = { ...DEFAULT_CONFIG }
        items.value = []
        return
      }

      // 恢复数据（storage 已经处理了 Date 反序列化）
      config.value = data.config
      items.value = data.items

      // 修复布局
      await repairLayout()
    } catch (error) {
      console.error('Failed to load homepage layout:', error)
      // 读取失败使用默认配置
      config.value = { ...DEFAULT_CONFIG }
      items.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存主页布局到统一存储层
   *
   * @throws {Error} 保存失败时抛出错误
   */
  async function persistLayout(): Promise<void> {
    try {
      DebugPanel.log('[Homepage] 💾 开始保存布局，当前书签数:', items.value.length)

      // T040: 持久化前验证数据完整性
      const validation = validateLayout()
      if (!validation.valid) {
        DebugPanel.log('[Homepage] ❌ 布局验证失败:', validation.errors)
        console.error("Cannot persist invalid layout:", validation.errors)
        throw new Error(`Invalid layout: ${validation.errors.join(", ")}`)
      }

      config.value.lastModified = new Date()

      const layout: HomepageLayout = {
        config: config.value,
        items: items.value
      }

      DebugPanel.log('[Homepage] 📝 准备保存:', items.value.length, '个书签项')
      await storage.saveHomepageLayout(layout)
      DebugPanel.log('[Homepage] ✅ 保存成功')
    } catch (error) {
      DebugPanel.log('[Homepage] ❌ 保存失败:', (error as Error).message)
      console.error('Failed to persist homepage layout:', error)
      throw error
    }
  }

  /**
   * 添加书签到主页
   *
   * @param bookmarkId - 书签 ID
   * @param gridIndex - 网格索引（可选，默认为末尾）
   * @throws {Error} 书签不存在或已存在时抛出错误
   */
  async function addBookmark(bookmarkId: string, gridIndex?: number): Promise<void> {
    // 检查书签是否存在
    const bookmark = bookmarkStore.bookmarks.find((b) => b.id === bookmarkId)
    if (!bookmark) {
      throw new Error(`Bookmark not found: ${bookmarkId}`)
    }

    DebugPanel.log('[Homepage] ➕ 添加书签到主页:', bookmark.title, '| ID:', bookmarkId)

    // 检查是否已存在主页
    if (hasBookmark(bookmarkId)) {
      DebugPanel.log('[Homepage] ⚠️ 书签已在主页:', bookmarkId)
      return
    }

    const index = gridIndex ?? items.value.length
    const newItem: HomepageItem = {
      bookmarkId,
      gridIndex: index,
      addedAt: new Date()
    }

    items.value.push(newItem)
    DebugPanel.log('[Homepage] 📊 当前主页书签数:', items.value.length)
    reindexItems()
    await persistLayout()
    DebugPanel.log('[Homepage] ✅ 添加完成')
  }

  /**
   * 从主页移除书签
   *
   * @param bookmarkId - 书签 ID
   */
  async function removeBookmark(bookmarkId: string): Promise<void> {
    items.value = items.value.filter((item) => item.bookmarkId !== bookmarkId)
    reindexItems()
    await persistLayout()
  }

  /**
   * 重新排序主页书签
   *
   * @param oldIndex - 原索引位置
   * @param newIndex - 新索引位置
   */
  async function reorderItems(oldIndex: number, newIndex: number): Promise<void> {
    if (oldIndex === newIndex) return

    const [movedItem] = items.value.splice(oldIndex, 1)
    items.value.splice(newIndex, 0, movedItem)

    reindexItems()
    await persistLayout()
  }

  /**
   * 清空所有主页书签
   */
  async function clearAllItems(): Promise<void> {
    items.value = []
    await persistLayout()
  }

  /**
   * 更新主页配置
   *
   * @param columns - 网格列数（3-12列）
   * @param showEmptyGuide - 是否显示空状态引导
   * @throws {Error} 列数超出范围时抛出错误
   */
  async function updateConfig(
    columns?: number,
    showEmptyGuide?: boolean
  ): Promise<void> {
    if (columns !== undefined) {
      if (columns < COLUMN_CONSTRAINTS.MIN || columns > COLUMN_CONSTRAINTS.MAX) {
        throw new Error(
          `Columns must be between ${COLUMN_CONSTRAINTS.MIN} and ${COLUMN_CONSTRAINTS.MAX}`
        )
      }
      config.value.columns = columns
    }

    if (showEmptyGuide !== undefined) {
      config.value.showEmptyGuide = showEmptyGuide
    }

    await persistLayout()
  }

  /**
   * 重置为默认配置
   */
  async function resetConfig(): Promise<void> {
    config.value = { ...DEFAULT_CONFIG }
    await persistLayout()
  }

  /**
   * 处理从侧边栏拖入书签事件
   *
   * @param event - Sortable 拖拽添加事件
   */
  async function handleDragAdd(event: any): Promise<void> {
    try {
      const bookmark = event.item._underlying_vm_
      if (!bookmark) {
        console.error('No bookmark data in drag event')
        return
      }

      await addBookmark(bookmark.id, event.newIndex)
    } catch (error) {
      console.error('Failed to handle drag add:', error)
    }
  }

  /**
   * 处理主页内部拖拽排序事件
   *
   * @param event - Sortable 拖拽更新事件
   */
  async function handleDragUpdate(event: any): Promise<void> {
    try {
      await reorderItems(event.oldIndex, event.newIndex)
    } catch (error) {
      console.error('Failed to handle drag update:', error)
    }
  }

  /**
   * 处理从主页移除书签事件
   *
   * @param event - Sortable 拖拽移除事件
   */
  async function handleDragRemove(event: any): Promise<void> {
    try {
      const item = items.value[event.oldIndex]
      if (item) {
        await removeBookmark(item.bookmarkId)
      }
    } catch (error) {
      console.error('Failed to handle drag remove:', error)
    }
  }

  /**
   * 检查书签是否已存在主页
   *
   * @param bookmarkId - 书签 ID
   * @returns 是否存在
   */
  function hasBookmark(bookmarkId: string): boolean {
    return items.value.some((item) => item.bookmarkId === bookmarkId)
  }

  /**
   * 根据书签 ID 查找主页项
   *
   * @param bookmarkId - 书签 ID
   * @returns 主页项或 undefined
   */
  function findItemByBookmarkId(bookmarkId: string): HomepageItem | undefined {
    return items.value.find((item) => item.bookmarkId === bookmarkId)
  }

  /**
   * 验证布局完整性
   *
   * @returns 验证结果
   */
  function validateLayout(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证配置
    if (config.value.version !== 1) {
      errors.push(`Invalid version: ${config.value.version}`)
    }

    if (
      config.value.columns < COLUMN_CONSTRAINTS.MIN ||
      config.value.columns > COLUMN_CONSTRAINTS.MAX
    ) {
      errors.push(
        `Invalid columns: ${config.value.columns} (must be ${COLUMN_CONSTRAINTS.MIN}-${COLUMN_CONSTRAINTS.MAX})`
      )
    }

    // 验证书签项
    const seenIds = new Set<string>()
    const seenIndices = new Set<number>()

    for (const item of items.value) {
      // T040: 检查 gridIndex 有效性
      if (item.gridIndex < 0 || !Number.isInteger(item.gridIndex)) {
        errors.push(`Invalid gridIndex: ${item.gridIndex} for bookmark ${item.bookmarkId}`)
      }

      // 检查重复书签
      if (seenIds.has(item.bookmarkId)) {
        errors.push(`Duplicate bookmark: ${item.bookmarkId}`)
      }
      seenIds.add(item.bookmarkId)

      // 检查重复索引
      if (seenIndices.has(item.gridIndex)) {
        errors.push(`Duplicate gridIndex: ${item.gridIndex}`)
      }
      seenIndices.add(item.gridIndex)

      // 检查书签是否存在
      const bookmark = bookmarkStore.bookmarks.find((b) => b.id === item.bookmarkId)
      if (!bookmark) {
        errors.push(`Bookmark not found: ${item.bookmarkId}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 自动修复布局问题
   */
  async function repairLayout(): Promise<void> {
    const validation = validateLayout()

    if (validation.valid) return

    console.warn('Repairing homepage layout:', validation.errors)

    // 移除不存在的书签
    items.value = items.value.filter((item) => {
      const bookmark = bookmarkStore.bookmarks.find((b) => b.id === item.bookmarkId)
      return bookmark !== undefined
    })

    // 移除重复书签（保留第一个）
    const seenIds = new Set<string>()
    items.value = items.value.filter((item) => {
      if (seenIds.has(item.bookmarkId)) {
        return false
      }
      seenIds.add(item.bookmarkId)
      return true
    })

    // 重新编号索引
    reindexItems()

    // 修复列数
    if (
      config.value.columns < COLUMN_CONSTRAINTS.MIN ||
      config.value.columns > COLUMN_CONSTRAINTS.MAX
    ) {
      config.value.columns = COLUMN_CONSTRAINTS.DEFAULT
    }

    await persistLayout()
  }

  /**
   * 重新编号书签项的 gridIndex（确保连续）
   */
  function reindexItems(): void {
    items.value.forEach((item, index) => {
      item.gridIndex = index
    })
  }

  return {
    // State
    config,
    items,
    loading,
    dragging,

    // Getters
    itemsWithBookmarks,
    gridRows,
    isEmpty,
    itemCount,

    // Actions
    loadLayout,
    persistLayout,
    addBookmark,
    removeBookmark,
    reorderItems,
    clearAllItems,
    updateConfig,
    resetConfig,
    handleDragAdd,
    handleDragUpdate,
    handleDragRemove,
    hasBookmark,
    findItemByBookmarkId,
    validateLayout,
    repairLayout
  }
})
