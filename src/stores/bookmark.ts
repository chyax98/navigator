/**
 * 书签状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed, toRaw, isProxy } from 'vue'
import type { Bookmark, Category, SearchResult, BookmarkSource, CategorySource } from '@/types/bookmark'
import { getStorage } from '@/utils/storage-factory'
import { searchManager } from '@/utils/search'
import { DebugPanel } from '@/utils/debug'

// 使用工厂函数获取环境适配的存储实现
const storageManager = getStorage()
import { normalizeUrl } from '@/utils/url'
import { sortBookmarks } from '@/utils/sort'
import { nanoid } from 'nanoid'
import { useConfigStore } from './config'
import {
  isChromeExtension,
  getChromeBookmarksBar,
  CHROME_BOOKMARKS_BAR_CATEGORY_ID
} from '@/services/chrome-bookmarks'

type AnyBookmark = Partial<Bookmark> & Record<string, any>
type AnyCategory = Partial<Category> & Record<string, any>

interface BookmarkDragState {
  bookmarkIds: string[]
  sourceCategoryId: string | null
  dropTargetCategoryId: string | null
}

interface CategoryDragState {
  draggedCategoryId: string | null
  dropParentId: string | null
  dropIndex: number | null
  indicatorCategoryId: string | null
  indicatorPosition: 'before' | 'after' | 'inside' | null
}

// 导入数据清洗工具：去除 Vue Proxy，并规范化日期与数组结构
function unwrapProxy<T>(value: T): T {
  return isProxy(value) ? toRaw(value) : value
}

function normalizeDateValue(value: unknown): Date {
  if (value instanceof Date) {
    // 检查 Date 对象是否有效（排除 Invalid Date）
    if (!Number.isNaN(value.getTime())) {
      return new Date(value.getTime())
    }
    // 无效的 Date 对象,fallback 到当前时间
    console.warn('[normalizeDateValue] Invalid Date object detected, using current time', value)
    return new Date()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const numericDate = new Date(value)
    if (!Number.isNaN(numericDate.getTime())) {
      return numericDate
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) {
      const dateFromString = new Date(trimmed)
      if (!Number.isNaN(dateFromString.getTime())) {
        return dateFromString
      }

      const numeric = Number(trimmed)
      if (!Number.isNaN(numeric)) {
        const dateFromNumeric = new Date(numeric)
        if (!Number.isNaN(dateFromNumeric.getTime())) {
          return dateFromNumeric
        }

        if (numeric > 1e12) {
          const microsecondsDate = new Date(numeric / 1000)
          if (!Number.isNaN(microsecondsDate.getTime())) {
            return microsecondsDate
          }
        }
      }
    }
  }

  return new Date()
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(item => String(item).trim())
    .filter(tag => tag.length > 0)
}

function sanitizeCategoryInput(input: AnyCategory, index: number): Category {
  const source = unwrapProxy(input)
  const id = typeof source.id === 'string' && source.id.trim().length > 0
    ? source.id.trim()
    : `import-category-${index}`

  const parentId = typeof source.parentId === 'string' && source.parentId.trim().length > 0
    ? source.parentId.trim()
    : undefined

  return {
    id,
    name: typeof source.name === 'string' && source.name.trim().length > 0 ? source.name.trim() : 'Unnamed',
    icon: typeof source.icon === 'string' && source.icon.trim().length > 0 ? source.icon.trim() : undefined,
    color: typeof source.color === 'string' && source.color.trim().length > 0 ? source.color.trim() : undefined,
    parentId,
    sort: typeof source.sort === 'number' && Number.isFinite(source.sort) ? source.sort : index,
    isPrivate: Boolean(source.isPrivate),
    isPinned: Boolean((source as any).isPinned),
    source: ((source as any).source === 'chrome' ? 'chrome' : 'user') as CategorySource
  }
}

function sanitizeBookmarkInput(input: AnyBookmark, fallbackCategoryId: string): Bookmark | null {
  const source = unwrapProxy(input)
  const url = typeof source.url === 'string' ? source.url.trim() : ''
  if (!url) {
    return null
  }

  const bookmark: Bookmark = {
    id: typeof source.id === 'string' && source.id.trim().length > 0 ? source.id.trim() : nanoid(),
    title: typeof source.title === 'string' && source.title.trim().length > 0 ? source.title.trim() : 'Untitled',
    url,
    description: typeof source.description === 'string' ? source.description : '',
    favicon: typeof source.favicon === 'string' && source.favicon.trim().length > 0 ? source.favicon.trim() : undefined,
    categoryId: typeof source.categoryId === 'string' && source.categoryId.trim().length > 0 ? source.categoryId.trim() : fallbackCategoryId,
    tags: sanitizeTags(source.tags),
    createdAt: normalizeDateValue(source.createdAt),
    updatedAt: normalizeDateValue(source.updatedAt),
    isPrivate: Boolean(source.isPrivate),
    clickCount: typeof source.clickCount === 'number' && Number.isFinite(source.clickCount) ? source.clickCount : 0,
    isPinned: Boolean(source.isPinned),
    sort: typeof source.sort === 'number' && Number.isFinite(source.sort) ? source.sort : 0,
    source: ((source as any).source === 'chrome' ? 'chrome' : 'user') as BookmarkSource
  }

  if (source.lastVisited) {
    bookmark.lastVisited = normalizeDateValue(source.lastVisited)
  }

  // 只有在书签被置顶时才保留 pinnedAt，否则忽略（确保数据一致性）
  if (bookmark.isPinned && source.pinnedAt) {
    bookmark.pinnedAt = normalizeDateValue(source.pinnedAt)
  }

  return bookmark
}

function prepareCategoryForStorage(category: Category): Category {
  const raw = unwrapProxy(category)
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    color: raw.color,
    parentId: raw.parentId,
    sort: raw.sort,
    isPrivate: Boolean(raw.isPrivate),
    isPinned: Boolean((raw as any).isPinned),
    source: raw.source || 'user'
  }
}

function prepareBookmarkForStorage(bookmark: Bookmark): Bookmark {
  const raw = unwrapProxy(bookmark)

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const url = typeof raw.url === 'string' ? raw.url.trim() : ''
  if (!url) {
    throw new Error('Bookmark url is required for storage')
  }

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0)
    : []

  const prepared: Bookmark = {
    id: typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : nanoid(),
    title: title.length > 0 ? title : url,
    url,
    description: typeof raw.description === 'string' ? raw.description : '',
    favicon: typeof raw.favicon === 'string' && raw.favicon.trim().length > 0 ? raw.favicon.trim() : undefined,
    categoryId: typeof raw.categoryId === 'string' && raw.categoryId.trim().length > 0 ? raw.categoryId.trim() : 'default',
    tags,
    createdAt: normalizeDateValue(raw.createdAt),
    updatedAt: normalizeDateValue(raw.updatedAt),
    isPrivate: Boolean(raw.isPrivate),
    clickCount: typeof raw.clickCount === 'number' && Number.isFinite(raw.clickCount) ? raw.clickCount : 0,
    isPinned: Boolean(raw.isPinned),
    sort: typeof raw.sort === 'number' && Number.isFinite(raw.sort) ? raw.sort : 0,
    source: raw.source || 'user',
    chromeId: raw.chromeId
  }

  if (raw.lastVisited) {
    prepared.lastVisited = normalizeDateValue(raw.lastVisited)
  }

  if (prepared.isPinned) {
    prepared.pinnedAt = normalizeDateValue(raw.pinnedAt ?? new Date())
  }

  return prepared
}

export const useBookmarkStore = defineStore('bookmark', () => {
  // Dependencies
  const configStore = useConfigStore()

  // State
  const bookmarks = ref<Bookmark[]>([])
  const categories = ref<Category[]>([])
  const selectedCategoryId = ref<string>('homepage')
  const viewMode = ref<'homepage' | 'category'>('homepage') // 视图模式：主页或分类视图
  const searchQuery = ref<string>('')
  const searchResults = ref<SearchResult[]>([])
  const loading = ref<boolean>(false)
  const collapsedCategories = ref<Set<string>>(new Set())
  const selectedBookmarkIds = ref<Set<string>>(new Set())
  const selectionAnchorId = ref<string | null>(null)
  const dragState = ref<BookmarkDragState | null>(null)
  const categoryDragState = ref<CategoryDragState | null>(null)
  const batchMode = ref<boolean>(false)

  // Getters
  const filteredBookmarks = computed(() => {
    DebugPanel.log('[filteredBookmarks] 🔎 当前状态: viewMode=', viewMode.value, ', selectedCategoryId=', selectedCategoryId.value)

    if (searchQuery.value) {
      return searchResults.value.map(r => r.bookmark)
    }

    // 获取排序类型
    const isHomepage = viewMode.value === 'homepage' || selectedCategoryId.value === 'homepage'
    const sortType = isHomepage
      ? (configStore.config.homepageSortType || 'default')
      : (configStore.config.categorySortType || 'default')

    let filtered: Bookmark[] = []

    // 主页视图：显示置顶书签
    if (isHomepage) {
      filtered = bookmarks.value.filter(b => b.isPinned)
      DebugPanel.log('[filteredBookmarks] 📍 主页视图：显示置顶书签', filtered.length, '/', bookmarks.value.length)
    }
    // Chrome 书签栏视图：显示 Chrome 书签（从 bookmarks.value 中过滤）
    else if (selectedCategoryId.value === CHROME_BOOKMARKS_BAR_CATEGORY_ID) {
      filtered = bookmarks.value.filter(b => b.source === 'chrome')
      DebugPanel.log('[filteredBookmarks] 🌐 Chrome 书签栏视图：过滤前', bookmarks.value.length, '个，过滤后', filtered.length, '个')

      // 调试：显示前 5 个书签的 source
      const samples = bookmarks.value.slice(0, 5).map(b => `${b.title}(source=${b.source})`).join(', ')
      DebugPanel.log('[filteredBookmarks] 📝 前5个书签:', samples)
    }
    // 分类视图：显示对应分类的书签（包括子分类）
    else {
      filtered = getCategoryBookmarks(selectedCategoryId.value)
      DebugPanel.log('[filteredBookmarks] 📁 分类视图：', selectedCategoryId.value, '有', filtered.length, '个书签（包括子分类）')
    }

    // URL 去重：同一个 URL 只保留一个书签
    // 优先级：user > chrome, isPinned > !isPinned, 较新的 > 较旧的
    const uniqueByUrl = new Map<string, Bookmark>()
    filtered.forEach(bookmark => {
      const normalizedUrl = normalizeUrl(bookmark.url)
      const existing = uniqueByUrl.get(normalizedUrl)

      if (!existing) {
        // 没有现存书签，直接添加
        uniqueByUrl.set(normalizedUrl, bookmark)
      } else {
        // 决定是否替换现存书签
        let shouldReplace = false

        // 优先级 1: user 书签优先于 chrome 书签
        if (existing.source === 'chrome' && bookmark.source === 'user') {
          shouldReplace = true
        }
        // 优先级 2: 同 source 时，置顶书签优先
        else if (existing.source === bookmark.source && !existing.isPinned && bookmark.isPinned) {
          shouldReplace = true
        }
        // 优先级 3: 同 source、同置顶状态时，保留较新的
        else if (
          existing.source === bookmark.source &&
          existing.isPinned === bookmark.isPinned &&
          new Date(bookmark.createdAt).getTime() > new Date(existing.createdAt).getTime()
        ) {
          shouldReplace = true
        }

        if (shouldReplace) {
          uniqueByUrl.set(normalizedUrl, bookmark)
        }
      }
    })

    const deduplicated = Array.from(uniqueByUrl.values())
    if (filtered.length !== deduplicated.length) {
      DebugPanel.log('[filteredBookmarks] 🔍 URL 去重：', filtered.length, '→', deduplicated.length)
    }
    return sortBookmarks(deduplicated, sortType)
  })

  const categorizedBookmarks = computed(() => {
    const map = new Map<string, Bookmark[]>()

    categories.value.forEach(category => {
      map.set(category.id, bookmarks.value.filter(b => b.categoryId === category.id))
    })

    return map
  })

  const selectedBookmarks = computed(() => bookmarks.value.filter(bookmark => selectedBookmarkIds.value.has(bookmark.id)))
  const selectedBookmarkCount = computed(() => selectedBookmarkIds.value.size)
  const selectedBookmarkIdList = computed(() => Array.from(selectedBookmarkIds.value))

  // 构建嵌套分类树
  const categoryTree = computed(() => {
    return buildCategoryTree(categories.value)
  })

  // 获取分类下的所有书签（包括子分类）
  function getCategoryBookmarks(categoryId: string): Bookmark[] {
    const category = categories.value.find(c => c.id === categoryId)
    if (!category) {
      DebugPanel.log('[getCategoryBookmarks] ⚠️ 未找到分类:', categoryId)
      return []
    }

    // 直接书签
    const directBookmarks = bookmarks.value.filter(b => b.categoryId === categoryId)

    // 子分类书签
    const childBookmarks: Bookmark[] = []
    const childCategories = categories.value.filter(c => c.parentId === categoryId)

    DebugPanel.log('[getCategoryBookmarks] 📂', category.name, ': 直接书签', directBookmarks.length, '个, 子分类', childCategories.length, '个')

    childCategories.forEach(child => {
      const childResults = getCategoryBookmarks(child.id)
      childBookmarks.push(...childResults)
    })

    const total = [...directBookmarks, ...childBookmarks]
    DebugPanel.log('[getCategoryBookmarks] ✅', category.name, ': 总共', total.length, '个书签')
    return total
  }

  const bookmarkCount = computed(() => bookmarks.value.length)

  const categoryCount = computed(() => categories.value.length)

  // 标签相关计算属性
  const allTags = computed(() => {
    const tagMap = new Map<string, number>()
    bookmarks.value.forEach(bookmark => {
      bookmark.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  function setBookmarkSelection(ids: string[], anchorId: string | null = null) {
    const normalized = Array.from(new Set(ids))
    selectedBookmarkIds.value = new Set(normalized)
    selectionAnchorId.value = anchorId ?? (normalized.length ? normalized[normalized.length - 1] : null)
  }

  function addBookmarksToSelection(ids: string[]) {
    if (!ids.length) return
    const next = new Set(selectedBookmarkIds.value)
    ids.forEach(id => next.add(id))
    selectedBookmarkIds.value = next
    selectionAnchorId.value = ids[ids.length - 1] ?? selectionAnchorId.value
  }

  function toggleBookmarkSelection(id: string) {
    const next = new Set(selectedBookmarkIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedBookmarkIds.value = next
    selectionAnchorId.value = id
  }

  function removeBookmarkFromSelection(id: string) {
    if (!selectedBookmarkIds.value.has(id)) return
    const next = new Set(selectedBookmarkIds.value)
    next.delete(id)
    selectedBookmarkIds.value = next
    if (selectionAnchorId.value === id) {
      if (next.size === 0) {
        selectionAnchorId.value = null
      } else {
        const ids = Array.from(next)
        selectionAnchorId.value = ids[ids.length - 1]
      }
    }
  }

  function clearBookmarkSelection() {
    if (selectedBookmarkIds.value.size === 0) return
    selectedBookmarkIds.value = new Set()
    selectionAnchorId.value = null
  }

  function setSelectionAnchor(id: string | null) {
    selectionAnchorId.value = id
  }

  function getSelectionAnchor() {
    return selectionAnchorId.value
  }

  function isBookmarkSelected(id: string) {
    return selectedBookmarkIds.value.has(id)
  }

  function beginBookmarkDrag(bookmarkIds: string[], sourceCategoryId: string | null) {
    const uniqueIds = Array.from(new Set(bookmarkIds))
    dragState.value = {
      bookmarkIds: uniqueIds,
      sourceCategoryId,
      dropTargetCategoryId: null
    }
  }

  function updateDragDropTarget(categoryId: string | null) {
    if (!dragState.value) return
    dragState.value = {
      ...dragState.value,
      dropTargetCategoryId: categoryId
    }
  }

  function endBookmarkDrag() {
    dragState.value = null
  }

  interface MoveBookmarksOptions {
    bookmarkIds: string[]
    nextBookmarkId?: string | null
    targetCategoryId?: string | null
    preserveCategories?: boolean
  }

  function findLastIndex<T>(list: T[], predicate: (item: T) => boolean): number {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (predicate(list[index]!)) {
        return index
      }
    }
    return -1
  }

  async function persistBookmarks(updates: Bookmark[]) {
    if (!updates.length) return
    await Promise.all(updates.map(async bookmark => {
      const prepared = prepareBookmarkForStorage(bookmark)
      await storageManager.saveBookmark(prepared)
      await searchManager.updateBookmark(prepared)
    }))
  }

  function findCategoryById(categoryId: string) {
    return categories.value.find(category => category.id === categoryId)
  }

  function normalizeParentId(id: string | null | undefined): string | null {
    return typeof id === 'string' && id.trim().length > 0 ? id : null
  }

  function isCategoryDescendant(candidateId: string, ancestorId: string): boolean {
    let current = findCategoryById(candidateId)
    const normalizedAncestor = normalizeParentId(ancestorId)
    while (current && current.parentId) {
      const parentId = normalizeParentId(current.parentId)
      if (parentId === normalizedAncestor) {
        return true
      }
      current = parentId ? findCategoryById(parentId) : undefined
    }
    return false
  }

  function getSortedSiblingCategories(parentId: string | null, excludeId?: string) {
    return categories.value
      .filter(category => normalizeParentId(category.parentId) === parentId && category.id !== excludeId)
      .sort((a, b) => a.sort - b.sort)
  }

  function reindexCategorySorts(parentId: string | null) {
    const siblings = getSortedSiblingCategories(parentId)
    siblings.forEach((category, index) => {
      category.sort = index
    })
  }

  async function saveCategoriesSnapshot(): Promise<void> {
    const categoriesForStorage = categories.value.map(category => prepareCategoryForStorage(category))
    await storageManager.saveCategories(categoriesForStorage)
  }

  async function moveBookmarksInternal(options: MoveBookmarksOptions) {
    const preserveCategories = options.preserveCategories !== false
    const uniqueIds = Array.from(new Set(options.bookmarkIds))
    if (uniqueIds.length === 0) return

    const idToBookmark = new Map(bookmarks.value.map(bookmark => [bookmark.id, bookmark]))
    const lookupOrder = new Map(uniqueIds.map((id, index) => [id, index]))
    const movingBookmarks = uniqueIds
      .map(id => idToBookmark.get(id))
      .filter((bookmark): bookmark is Bookmark => Boolean(bookmark))
      .sort((a, b) => (lookupOrder.get(a.id) ?? 0) - (lookupOrder.get(b.id) ?? 0))

    if (!movingBookmarks.length) return

    const remaining = bookmarks.value.filter(bookmark => !lookupOrder.has(bookmark.id))

    let insertionIndex = remaining.length
    if (options.nextBookmarkId) {
      const index = remaining.findIndex(bookmark => bookmark.id === options.nextBookmarkId)
      if (index !== -1) {
        insertionIndex = index
      }
    } else if (!preserveCategories && options.targetCategoryId) {
      const lastIndex = findLastIndex(remaining, bookmark => bookmark.categoryId === options.targetCategoryId)
      insertionIndex = lastIndex === -1 ? remaining.length : lastIndex + 1
    }

    if (!preserveCategories && options.targetCategoryId) {
      movingBookmarks.forEach(bookmark => {
        if (bookmark.categoryId !== options.targetCategoryId) {
          bookmark.categoryId = options.targetCategoryId!
          bookmark.updatedAt = new Date()
        }
      })
    }

    const newOrder = [
      ...remaining.slice(0, insertionIndex),
      ...movingBookmarks,
      ...remaining.slice(insertionIndex)
    ]

    const updates: Bookmark[] = []
    newOrder.forEach((bookmark, index) => {
      if (bookmark.sort !== index) {
        bookmark.sort = index
        bookmark.updatedAt = new Date()
        updates.push(bookmark)
      } else if (!preserveCategories && options.targetCategoryId && lookupOrder.has(bookmark.id)) {
        updates.push(bookmark)
      }
    })

    bookmarks.value = newOrder
    await persistBookmarks(updates)
  }

  async function reorderBookmarks(bookmarkIds: string[], nextBookmarkId?: string | null) {
    await moveBookmarksInternal({ bookmarkIds, nextBookmarkId })
  }

  async function moveBookmarksToCategory(bookmarkIds: string[], targetCategoryId: string, nextBookmarkId?: string | null) {
    await moveBookmarksInternal({
      bookmarkIds,
      nextBookmarkId,
      targetCategoryId,
      preserveCategories: false
    })
  }

  function beginCategoryDrag(categoryId: string) {
    categoryDragState.value = {
      draggedCategoryId: categoryId,
      dropParentId: null,
      dropIndex: null,
      indicatorCategoryId: null,
      indicatorPosition: null
    }
  }

  function updateCategoryDragTarget(
    parentId: string | null,
    index: number | null,
    indicatorCategoryId: string | null,
    indicatorPosition: 'before' | 'after' | 'inside' | null
  ) {
    if (!categoryDragState.value) return
    categoryDragState.value = {
      ...categoryDragState.value,
      dropParentId: parentId,
      dropIndex: index,
      indicatorCategoryId,
      indicatorPosition
    }
  }

  function endCategoryDrag() {
    categoryDragState.value = null
  }

  function canMoveCategory(categoryId: string, targetParentId: string | null) {
    if (categoryId === targetParentId) {
      return false
    }

    if (targetParentId && isCategoryDescendant(targetParentId, categoryId)) {
      return false
    }

    return true
  }

  async function moveCategory(categoryId: string, targetParentId: string | null, targetIndex: number): Promise<boolean> {
    const category = findCategoryById(categoryId)
    if (!category) {
      return false
    }

    const normalizedTargetParent = normalizeParentId(targetParentId)
    const normalizedCurrentParent = normalizeParentId(category.parentId)

    if (!canMoveCategory(categoryId, normalizedTargetParent)) {
      return false
    }

    const siblingsExcludingCategory = getSortedSiblingCategories(normalizedTargetParent, categoryId)
    const boundedIndex = Math.max(0, Math.min(targetIndex, siblingsExcludingCategory.length))

    category.parentId = normalizedTargetParent ?? undefined

    const targetSiblings = getSortedSiblingCategories(normalizedTargetParent, categoryId)
    targetSiblings.splice(boundedIndex, 0, category)
    targetSiblings.forEach((sibling, index) => {
      sibling.sort = index
    })

    if (normalizedCurrentParent !== normalizedTargetParent) {
      reindexCategorySorts(normalizedCurrentParent)
    }

    await saveCategoriesSnapshot()
    return true
  }

  function getCategorySiblingsMeta(categoryId: string) {
    const category = findCategoryById(categoryId)
    if (!category) return null
    const parentId = normalizeParentId(category.parentId)
    const siblings = getSortedSiblingCategories(parentId)
    const index = siblings.findIndex(sibling => sibling.id === categoryId)
    return { category, parentId, siblings, index }
  }

  async function moveCategoryRelative(categoryId: string, direction: 'up' | 'down'): Promise<boolean> {
    const meta = getCategorySiblingsMeta(categoryId)
    if (!meta) return false
    const { parentId, siblings, index } = meta
    if (index === -1) return false
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return false
    }
    return moveCategory(categoryId, parentId, targetIndex)
  }

  function canMoveCategoryUp(categoryId: string): boolean {
    const meta = getCategorySiblingsMeta(categoryId)
    if (!meta) return false
    return meta.index > 0
  }

  function canMoveCategoryDown(categoryId: string): boolean {
    const meta = getCategorySiblingsMeta(categoryId)
    if (!meta) return false
    return meta.index > -1 && meta.index < meta.siblings.length - 1
  }

  async function reindexBookmarkSorts() {
    const updates: Bookmark[] = []
    bookmarks.value.forEach((bookmark, index) => {
      if (bookmark.sort !== index) {
        bookmark.sort = index
        bookmark.updatedAt = new Date()
        updates.push(bookmark)
      }
    })
    await persistBookmarks(updates)
  }

  // 初始化搜索引擎
  async function initializeSearchEngine() {
    await configStore.syncAiClients()
    const searchConfig = {
      enableSemanticSearch: configStore.config.enableSemanticSearch || false,
      semanticWeight: configStore.config.semanticWeight || 0.6,
      keywordWeight: configStore.config.keywordWeight || 0.4
    }
    await searchManager.initialize(bookmarks.value, searchConfig)
  }

  // 初始化 Chrome 书签分类（仅显示入口，不读取书签数据）
  async function initChromeBookmarks() {
    if (!isChromeExtension()) {
      return
    }

    try {
      // 仅添加 Chrome 书签栏根分类（作为同步入口）
      const existingCategory = categories.value.find(c => c.id === CHROME_BOOKMARKS_BAR_CATEGORY_ID)
      if (!existingCategory) {
        categories.value.push({
          id: CHROME_BOOKMARKS_BAR_CATEGORY_ID,
          name: 'Chrome 书签栏',
          sort: 0,
          isPrivate: false,
          isPinned: false,
          source: 'chrome'
        })
      }

      // ⚠️ 重要：不在这里读取 Chrome 书签或分类数据
      // 原因：
      // 1. 每次刷新都读取会导致性能问题
      // 2. getChromeBookmarksBar() 会读取所有 Chrome 书签，浪费资源
      // 3. Chrome 分类结构只在用户点击"同步"时需要
      //
      // 用户操作流程：
      // 1. 侧边栏显示"Chrome 书签栏"分类入口
      // 2. 点击"同步 Chrome 书签"按钮 → 触发 syncFromChrome()
      // 3. syncFromChrome() 会读取并保存 Chrome 书签到 IndexedDB
    } catch (error) {
      console.error('Failed to initialize Chrome bookmarks:', error)
    }
  }

  // 从 Chrome 增量同步书签到 Navigator
  async function syncFromChrome(): Promise<{
    added: number
    updated: number
    deleted: number
  }> {
    if (!isChromeExtension()) {
      console.warn('Chrome Bookmarks API not available')
      return { added: 0, updated: 0, deleted: 0 }
    }

    try {
      DebugPanel.log('[syncFromChrome] 🔄 开始同步...')

      // 从 Chrome API 读取最新数据
      const { bookmarks: chromeBookmarks, categories: chromeCategories } = await getChromeBookmarksBar()
      DebugPanel.log('[syncFromChrome] 📥 从 Chrome 读取:', chromeBookmarks.length, '个书签,', chromeCategories.length, '个分类')

      // 统计
      let added = 0

      // 1. 同步分类
      // 创建 Chrome 分类的 ID 映射
      const chromeCategoyIds = new Set(chromeCategories.map(c => c.id))

      // 删除已不存在的 Chrome 分类
      const categoriesToDelete = categories.value.filter(
        c => c.source === 'chrome' &&
             c.id !== CHROME_BOOKMARKS_BAR_CATEGORY_ID &&
             !chromeCategoyIds.has(c.id)
      )
      categories.value = categories.value.filter(
        c => !categoriesToDelete.some(del => del.id === c.id)
      )

      // 添加或更新 Chrome 分类
      DebugPanel.log('[syncFromChrome] 📂 准备同步', chromeCategories.length, '个 Chrome 分类')
      let categoriesAdded = 0
      let categoriesUpdated = 0

      for (const chromeCategory of chromeCategories) {
        const existingIndex = categories.value.findIndex(c => c.id === chromeCategory.id)
        if (existingIndex === -1) {
          // 新增分类
          categories.value.push(chromeCategory)
          categoriesAdded++
          DebugPanel.log('[syncFromChrome] ➕ 新增分类:', chromeCategory.name)
        } else {
          // 检查是否需要更新
          const existing = categories.value[existingIndex]
          if (
            existing.name !== chromeCategory.name ||
            existing.parentId !== chromeCategory.parentId ||
            existing.sort !== chromeCategory.sort
          ) {
            categories.value[existingIndex] = {
              ...existing,
              // Chrome 管理的字段
              name: chromeCategory.name,
              parentId: chromeCategory.parentId,
              sort: chromeCategory.sort,
              source: 'chrome'
            }
            categoriesUpdated++
          }
        }
      }

      DebugPanel.log('[syncFromChrome] 📊 分类变更: 新增', categoriesAdded, '个, 更新', categoriesUpdated, '个')

      // 保存所有分类到存储（包括 Chrome 分类，确保刷新后不丢失）
      const categoriesForStorage = categories.value.map(cat => prepareCategoryForStorage(cat))
      DebugPanel.log('[syncFromChrome] 💾 准备保存', categoriesForStorage.length, '个分类到存储')
      await storageManager.saveCategories(categoriesForStorage)
      DebugPanel.log('[syncFromChrome] ✅ 分类保存完成')


      // 2. 同步书签（只增不删：URL 去重）
      DebugPanel.log('[syncFromChrome] 📊 当前已有书签:', bookmarks.value.length, '个')

      const existingUrls = new Set(
        bookmarks.value.map(b => normalizeUrl(b.url))
      )
      DebugPanel.log('[syncFromChrome] 🔍 已有 URL 数量:', existingUrls.size)

      const bookmarksToAdd: Bookmark[] = []

      for (const chromeBookmark of chromeBookmarks) {
        const normalizedUrl = normalizeUrl(chromeBookmark.url)

        // 跳过已存在的 URL（按 URL 去重，不按 ID）
        if (existingUrls.has(normalizedUrl)) {
          continue
        }

        // 新书签：添加到列表
        const preparedBookmark = prepareBookmarkForStorage(chromeBookmark)
        bookmarks.value.push(preparedBookmark)
        bookmarksToAdd.push(preparedBookmark)
        existingUrls.add(normalizedUrl)
        added++
      }

      DebugPanel.log('[syncFromChrome] ➕ 需要新增:', bookmarksToAdd.length, '个书签')

      // 逐个保存（使用互斥锁保护，确保数据安全）
      for (const bookmark of bookmarksToAdd) {
        DebugPanel.log('[syncFromChrome] 💾 保存:', bookmark.title)
        await storageManager.saveBookmark(bookmark)
        await searchManager.addBookmark(bookmark)
      }

      DebugPanel.log('[syncFromChrome] ✅ 同步完成，新增:', added, '个')

      // 更新配置：记录同步时间
      configStore.config.lastChromeSyncTime = new Date().toISOString()
      await storageManager.saveConfig(configStore.config)

      return { added, updated: 0, deleted: 0 }
    } catch (error) {
      console.error('Failed to sync Chrome bookmarks:', error)
      throw error
    }
  }

  // 构建分类树结构
  function buildCategoryTree(categories: Category[]): Category[] {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // 创建映射
    categories.forEach(category => {
      const isExpanded = !collapsedCategories.value.has(category.id)
      categoryMap.set(category.id, {
        ...category,
        children: [],
        level: 0,
        isExpanded
      })
    })

    // 构建树形结构
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)!

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(categoryNode)
          categoryNode.level = (parent.level || 0) + 1
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    // 排序
    const sortBySort = (categories: Category[]) => {
      categories.sort((a, b) => a.sort - b.sort)
      categories.forEach(category => {
        if (category.children) {
          sortBySort(category.children)
        }
      })
    }

    sortBySort(rootCategories)
    return rootCategories
  }

  // Actions
  async function loadBookmarks() {
    try {
      DebugPanel.log('[loadBookmarks] 📂 开始加载书签...')
      loading.value = true

      const [loadedBookmarks, loadedCategories] = await Promise.all([
        storageManager.getBookmarks(),
        storageManager.getCategories()
      ])

      DebugPanel.log('[loadBookmarks] 📥 从存储读取:', loadedBookmarks.length, '个书签')

      const updateMap = new Map<string, Bookmark>()
      const normalizedBookmarks = (loadedBookmarks || []).map((bookmark, index) => {
        const normalized: Bookmark = {
          ...bookmark,
          createdAt: bookmark.createdAt instanceof Date ? bookmark.createdAt : new Date(bookmark.createdAt),
          updatedAt: bookmark.updatedAt instanceof Date ? bookmark.updatedAt : new Date(bookmark.updatedAt),
          sort: typeof bookmark.sort === 'number' && Number.isFinite(bookmark.sort) ? bookmark.sort : index,
          // 标准化 source 字段：Chrome 书签用 'chrome'，其他默认 'user'
          source: (bookmark as any).source === 'chrome' ? 'chrome' : 'user',
          // 显式保留置顶状态（确保布尔值不被意外覆盖）
          isPinned: Boolean(bookmark.isPinned)
        }

        if (normalized.sort !== bookmark.sort || (bookmark as any).source === undefined) {
          updateMap.set(normalized.id, normalized)
        }

        if (bookmark.lastVisited && !(bookmark.lastVisited instanceof Date)) {
          normalized.lastVisited = new Date(bookmark.lastVisited)
        }

        // 只有在书签被置顶时才保留 pinnedAt，确保数据一致性
        if (normalized.isPinned && bookmark.pinnedAt && !(bookmark.pinnedAt instanceof Date)) {
          normalized.pinnedAt = new Date(bookmark.pinnedAt)
        }

        return normalized
      })

      normalizedBookmarks.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))

      // 重新索引排序号（但不立即保存）
      normalizedBookmarks.forEach((bookmark, index) => {
        if (bookmark.sort !== index) {
          bookmark.sort = index
        }
      })

      bookmarks.value = normalizedBookmarks

      // 统计书签分布
      const chromeCount = normalizedBookmarks.filter(b => b.source === 'chrome').length
      const userCount = normalizedBookmarks.filter(b => b.source === 'user').length
      const pinnedCount = normalizedBookmarks.filter(b => b.isPinned).length

      DebugPanel.log('[loadBookmarks] ✅ 最终加载:', normalizedBookmarks.length, '个书签到内存')
      DebugPanel.log('[loadBookmarks] 📊 分布: Chrome', chromeCount, '个, User', userCount, '个, 置顶', pinnedCount, '个')

      // 标准化分类数据，确保所有必需字段都存在
      const normalizedCategories = (loadedCategories || getDefaultCategories()).map(category => ({
        ...category,
        isPrivate: typeof category.isPrivate === 'boolean' ? category.isPrivate : false,
        sort: typeof category.sort === 'number' ? category.sort : 0,
        // 标准化 source 字段：Chrome 分类用 'chrome'，其他默认 'user'
        source: ((category as any).source === 'chrome' ? 'chrome' : 'user') as CategorySource
      }))

      categories.value = normalizedCategories

      // 统计分类分布
      const chromeCategories = normalizedCategories.filter(c => c.source === 'chrome').length
      const userCategories = normalizedCategories.filter(c => c.source === 'user').length
      DebugPanel.log('[loadBookmarks] 📁 分类: Chrome', chromeCategories, '个, User', userCategories, '个, 总计', normalizedCategories.length, '个')

      // 只在需要更新 source 字段时才保存（其他情况不保存，避免覆盖）
      if (updateMap.size > 0) {
        await persistBookmarks(Array.from(updateMap.values()))
      }

      clearBookmarkSelection()
      endBookmarkDrag()

      // 初始化搜索引擎（可配置是否启用语义搜索）
      await initializeSearchEngine()

      // 初始化 Chrome 书签
      await initChromeBookmarks()
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
    } finally {
      loading.value = false
    }
  }

  async function addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'clickCount' | 'sort' | 'source'>) {
    const initialBookmark: Bookmark = {
      ...bookmark,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      clickCount: 0,
      isPinned: Boolean(bookmark.isPinned),
      sort: bookmarks.value.length,
      source: 'user' // 用户手动添加的书签
    }

    const preparedBookmark = prepareBookmarkForStorage(initialBookmark)
    bookmarks.value.push(preparedBookmark)
    await storageManager.saveBookmark(preparedBookmark)
    await searchManager.addBookmark(preparedBookmark)

    return preparedBookmark
  }

  async function updateBookmark(id: string, updates: Partial<Bookmark>) {
    const index = bookmarks.value.findIndex(b => b.id === id)
    if (index === -1) return

    const originalBookmark = bookmarks.value[index]
    DebugPanel.log('[updateBookmark] 📝 更新前:', originalBookmark.title, '| isPinned =', originalBookmark.isPinned)
    DebugPanel.log('[updateBookmark] 📝 更新参数:', JSON.stringify(updates))

    const updatedBookmark = {
      ...unwrapProxy(bookmarks.value[index]),
      ...updates,
      updatedAt: new Date()
    }

    DebugPanel.log('[updateBookmark] 📝 合并后:', updatedBookmark.title, '| isPinned =', updatedBookmark.isPinned)

    const preparedBookmark = prepareBookmarkForStorage(updatedBookmark)
    DebugPanel.log('[updateBookmark] 📝 准备保存:', preparedBookmark.title, '| isPinned =', preparedBookmark.isPinned)

    bookmarks.value[index] = preparedBookmark
    await storageManager.saveBookmark(preparedBookmark)
    await searchManager.updateBookmark(preparedBookmark)

    DebugPanel.log('[updateBookmark] ✅ 更新完成，内存中 isPinned =', bookmarks.value[index].isPinned)
  }

  async function toggleBookmarkPin(id: string) {
    const target = bookmarks.value.find(b => b.id === id)
    if (!target) return

    const next = !target.isPinned
    const categoryName = categories.value.find(c => c.id === target.categoryId)?.name

    await updateBookmark(id, { isPinned: next, pinnedAt: next ? new Date() : undefined })

    // 用户反馈提示
    if (typeof window !== 'undefined' && (window as any).$message) {
      if (next) {
        ;(window as any).$message.success('已添加到主页')
      } else if (categoryName) {
        ;(window as any).$message.info(`已从主页移除，书签仍在「${categoryName}」分类中`)
      } else {
        ;(window as any).$message.info('已从主页移除')
      }
    }
  }

  async function deleteBookmark(id: string) {
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    removeBookmarkFromSelection(id)
    await storageManager.deleteBookmark(id)
    await searchManager.removeBookmark(id)
    await reindexBookmarkSorts()
  }

  async function addCategory(category: Omit<Category, 'id' | 'sort' | 'source'>) {
    const newCategory: Category = {
      ...category,
      id: nanoid(),
      sort: categories.value.length,
      source: 'user' // 用户手动添加的分类
    }

    categories.value.push(newCategory)
    await storageManager.saveCategories(categories.value)

    return newCategory
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1) return

    categories.value[index] = {
      ...categories.value[index],
      ...updates
    }

    await storageManager.saveCategories(categories.value)
  }

  async function toggleCategoryPin(id: string) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1) return
    const current = Boolean((categories.value[index] as any).isPinned)
    categories.value[index] = {
      ...categories.value[index],
      isPinned: !current
    }
    await storageManager.saveCategories(categories.value)
  }

  async function deleteCategory(id: string) {
    const categoryToDelete = findCategoryById(id)
    const parentId = normalizeParentId(categoryToDelete?.parentId)

    // 将该分类下的书签移到未分类
    const defaultCategory = categories.value.find(c => c.name === '未分类')
    if (defaultCategory) {
      bookmarks.value.forEach(bookmark => {
        if (bookmark.categoryId === id) {
          bookmark.categoryId = defaultCategory.id
        }
      })
    }

    categories.value = categories.value.filter(c => c.id !== id)
    if (collapsedCategories.value.has(id)) {
      const next = new Set(collapsedCategories.value)
      next.delete(id)
      collapsedCategories.value = next
    }
    reindexCategorySorts(parentId)
    await saveCategoriesSnapshot()
  }

  async function search(query: string) {
    searchQuery.value = query

    if (!query.trim()) {
      searchResults.value = []
      return
    }

    try {
      const results = await searchManager.search(query)
      searchResults.value = results
    } catch (error) {
      console.error('Search failed:', error)
      searchResults.value = []
    }
  }

  async function importBookmarks(data: { bookmarks: Bookmark[], categories: Category[] }) {
    const rawData = unwrapProxy(data) as { bookmarks?: unknown; categories?: unknown }

    const fallbackCategoryId = categories.value.find(c => c.name === '未分类')?.id
      ?? categories.value.find(c => c.id === 'default')?.id
      ?? categories.value[0]?.id
      ?? 'default'

    const normalizedCategories = Array.isArray(rawData.categories)
      ? (rawData.categories as AnyCategory[]).map((category, index) => sanitizeCategoryInput(category, index))
      : []

    const normalizedBookmarks = Array.isArray(rawData.bookmarks)
      ? (rawData.bookmarks as AnyBookmark[])
        .map(bookmark => sanitizeBookmarkInput(bookmark, fallbackCategoryId))
        .filter((bookmark): bookmark is Bookmark => bookmark !== null)
      : []

    const importedCategories = normalizedCategories.map((category, index) => ({
      ...category,
      id: nanoid(),
      sort: categories.value.length + index
    }))

    const categoryIdMap = new Map<string, string>()
    normalizedCategories.forEach((original, index) => {
      categoryIdMap.set(original.id, importedCategories[index].id)
    })

    importedCategories.forEach(category => {
      if (category.parentId) {
        const newParentId = categoryIdMap.get(category.parentId)
        category.parentId = newParentId ?? undefined
      }
    })

    const baseSort = bookmarks.value.length
    const importedBookmarks = normalizedBookmarks.map((bookmark, index) => {
      const newCategoryId = categoryIdMap.get(bookmark.categoryId) ?? fallbackCategoryId
      const prepared: Bookmark = {
        ...bookmark,
        id: nanoid(),
        categoryId: newCategoryId,
        tags: [...bookmark.tags],
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
        clickCount: typeof bookmark.clickCount === 'number' ? bookmark.clickCount : 0,
        isPrivate: Boolean(bookmark.isPrivate),
        // 导入时默认清除置顶状态（置顶是个人化偏好，不应随配置传递）
        isPinned: false,
        pinnedAt: undefined,
        sort: typeof bookmark.sort === 'number' && Number.isFinite(bookmark.sort)
          ? bookmark.sort
          : baseSort + index
      }

      if (bookmark.lastVisited) {
        prepared.lastVisited = new Date(bookmark.lastVisited)
      }

      return prepareBookmarkForStorage(prepared)
    })

    // 添加到现有数据
    bookmarks.value.push(...importedBookmarks)
    categories.value.push(...importedCategories)

    await reindexBookmarkSorts()

    // 保存到存储
    for (const bookmark of importedBookmarks) {
      const bookmarkForStorage = prepareBookmarkForStorage(bookmark)
      await storageManager.saveBookmark(bookmarkForStorage)
    }

    const categoriesForStorage = categories.value.map(cat => prepareCategoryForStorage(cat))
    void storageManager.saveCategories(categoriesForStorage)

    // 重建搜索索引
    await searchManager.rebuildIndex(bookmarks.value)
  }

  async function exportBookmarks() {
    return {
      bookmarks: bookmarks.value,
      categories: categories.value
    }
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
  }

  function selectCategory(categoryId: string) {
    selectedCategoryId.value = categoryId
    clearSearch()
    // 如果选择的是 'homepage'，切换到主页视图
    if (categoryId === 'homepage') {
      viewMode.value = 'homepage'
    } else {
      // 否则切换到分类视图
      viewMode.value = 'category'
    }
  }

  function setViewMode(mode: 'homepage' | 'category') {
    viewMode.value = mode
  }

  function toggleCategoryExpand(categoryId: string) {
    const next = new Set(collapsedCategories.value)
    if (next.has(categoryId)) {
      next.delete(categoryId)
    } else {
      next.add(categoryId)
    }
    collapsedCategories.value = next
  }

  // 更新搜索配置
  async function updateSearchConfig() {
    await initializeSearchEngine()
  }

  // 重建搜索索引（增量向量生成）
  async function rebuildSearchIndex() {
    await searchManager.rebuildIndex(bookmarks.value)
  }

  function getDefaultCategories(): Category[] {
    return [
      {
        id: 'default',
        name: '未分类',
        sort: 0,
        isPrivate: false,
        isPinned: false,
        source: 'user'
      },
      {
        id: 'favorites',
        name: '收藏',
        sort: 1,
        isPrivate: false,
        isPinned: false,
        source: 'user'
      }
    ]
  }

  // 标签管理方法
  function getBookmarksByTag(tag: string): Bookmark[] {
    return bookmarks.value.filter(bookmark => bookmark.tags.includes(tag))
  }

  async function addTagToBookmark(bookmarkId: string, tag: string) {
    const bookmark = bookmarks.value.find(b => b.id === bookmarkId)
    if (!bookmark) return

    const normalizedTag = tag.trim()
    if (!normalizedTag || bookmark.tags.includes(normalizedTag)) return

    bookmark.tags = [...bookmark.tags, normalizedTag]
    bookmark.updatedAt = new Date()

    const prepared = prepareBookmarkForStorage(bookmark)
    await storageManager.saveBookmark(prepared)
    await searchManager.updateBookmark(prepared)
  }

  async function removeTagFromBookmark(bookmarkId: string, tag: string) {
    const bookmark = bookmarks.value.find(b => b.id === bookmarkId)
    if (!bookmark) return

    const index = bookmark.tags.indexOf(tag)
    if (index === -1) return

    bookmark.tags = bookmark.tags.filter(t => t !== tag)
    bookmark.updatedAt = new Date()

    const prepared = prepareBookmarkForStorage(bookmark)
    await storageManager.saveBookmark(prepared)
    await searchManager.updateBookmark(prepared)
  }

  async function renameTag(oldTag: string, newTag: string) {
    const normalizedNewTag = newTag.trim()
    if (!normalizedNewTag || oldTag === normalizedNewTag) return

    const affectedBookmarks = bookmarks.value.filter(b => b.tags.includes(oldTag))

    await Promise.all(affectedBookmarks.map(async bookmark => {
      bookmark.tags = bookmark.tags.map(t => t === oldTag ? normalizedNewTag : t)
      bookmark.updatedAt = new Date()

      const prepared = prepareBookmarkForStorage(bookmark)
      await storageManager.saveBookmark(prepared)
      await searchManager.updateBookmark(prepared)
    }))
  }

  async function deleteTag(tag: string) {
    const affectedBookmarks = bookmarks.value.filter(b => b.tags.includes(tag))

    await Promise.all(affectedBookmarks.map(async bookmark => {
      bookmark.tags = bookmark.tags.filter(t => t !== tag)
      bookmark.updatedAt = new Date()

      const prepared = prepareBookmarkForStorage(bookmark)
      await storageManager.saveBookmark(prepared)
      await searchManager.updateBookmark(prepared)
    }))
  }

  // 批量操作方法
  function toggleBatchMode() {
    batchMode.value = !batchMode.value
    if (!batchMode.value) {
      clearBookmarkSelection()
    }
  }

  function selectAll() {
    const visibleBookmarks = filteredBookmarks.value
    visibleBookmarks.forEach(b => selectedBookmarkIds.value.add(b.id))
    // 触发响应式更新
    selectedBookmarkIds.value = new Set(selectedBookmarkIds.value)
  }

  async function batchMove(targetCategoryId: string) {
    const ids = Array.from(selectedBookmarkIds.value)

    await Promise.all(ids.map(async id => {
      const bookmark = bookmarks.value.find(b => b.id === id)
      if (bookmark) {
        bookmark.categoryId = targetCategoryId
        bookmark.updatedAt = new Date()

        const prepared = prepareBookmarkForStorage(bookmark)
        await storageManager.saveBookmark(prepared)
        await searchManager.updateBookmark(prepared)
      }
    }))

    clearBookmarkSelection()
  }

  async function batchAddTags(tags: string[]) {
    const ids = Array.from(selectedBookmarkIds.value)

    await Promise.all(ids.map(async id => {
      const bookmark = bookmarks.value.find(b => b.id === id)
      if (bookmark) {
        // 合并标签并去重
        bookmark.tags = [...new Set([...bookmark.tags, ...tags])]
        bookmark.updatedAt = new Date()

        const prepared = prepareBookmarkForStorage(bookmark)
        await storageManager.saveBookmark(prepared)
        await searchManager.updateBookmark(prepared)
      }
    }))
  }

  async function batchPin() {
    const ids = Array.from(selectedBookmarkIds.value)
    let pinnedCount = 0

    await Promise.all(ids.map(async id => {
      const bookmark = bookmarks.value.find(b => b.id === id)
      if (bookmark && !bookmark.isPinned) {
        bookmark.isPinned = true
        bookmark.pinnedAt = new Date()
        bookmark.updatedAt = new Date()

        const prepared = prepareBookmarkForStorage(bookmark)
        await storageManager.saveBookmark(prepared)
        await searchManager.updateBookmark(prepared)
        pinnedCount++
      }
    }))

    clearBookmarkSelection()

    // 用户反馈
    if (typeof window !== 'undefined' && (window as any).$message && pinnedCount > 0) {
      ;(window as any).$message.success(`已将 ${pinnedCount} 个书签添加到主页`)
    }
  }

  async function batchUnpin() {
    const ids = Array.from(selectedBookmarkIds.value)
    let unpinnedCount = 0

    await Promise.all(ids.map(async id => {
      const bookmark = bookmarks.value.find(b => b.id === id)
      if (bookmark && bookmark.isPinned) {
        bookmark.isPinned = false
        bookmark.pinnedAt = undefined
        bookmark.updatedAt = new Date()

        const prepared = prepareBookmarkForStorage(bookmark)
        await storageManager.saveBookmark(prepared)
        await searchManager.updateBookmark(prepared)
        unpinnedCount++
      }
    }))

    clearBookmarkSelection()

    // 用户反馈
    if (typeof window !== 'undefined' && (window as any).$message && unpinnedCount > 0) {
      ;(window as any).$message.info(`已将 ${unpinnedCount} 个书签从主页移除`)
    }
  }

  async function batchDelete() {
    const ids = Array.from(selectedBookmarkIds.value)

    // 从存储中删除
    await Promise.all(ids.map(id => storageManager.deleteBookmark(id)))

    // 从内存中删除
    bookmarks.value = bookmarks.value.filter(b => !ids.includes(b.id))

    // 从搜索索引中删除
    await Promise.all(ids.map(id => searchManager.removeBookmark(id)))

    clearBookmarkSelection()
  }

  // 重复检测方法
  function findDuplicateBookmarks(url: string): Bookmark[] {
    const normalizedUrl = normalizeUrl(url)
    return bookmarks.value.filter(bookmark =>
      normalizeUrl(bookmark.url) === normalizedUrl
    )
  }

  function checkDuplicate(url: string): { isDuplicate: boolean; existing?: Bookmark } {
    const duplicates = findDuplicateBookmarks(url)
    return {
      isDuplicate: duplicates.length > 0,
      existing: duplicates[0]
    }
  }

  // 获取所有重复书签组
  const duplicateGroups = computed(() => {
    const urlMap = new Map<string, Bookmark[]>()

    bookmarks.value.forEach(bookmark => {
      const normalized = normalizeUrl(bookmark.url)
      if (!urlMap.has(normalized)) {
        urlMap.set(normalized, [])
      }
      urlMap.get(normalized)!.push(bookmark)
    })

    // 只返回有重复的组
    return Array.from(urlMap.entries())
      .filter(([_, bookmarks]) => bookmarks.length > 1)
      .map(([normalizedUrl, bookmarks]) => ({
        normalizedUrl,
        bookmarks,
        count: bookmarks.length
      }))
      .sort((a, b) => b.count - a.count)
  })

  const selectionExports = {
    selectedBookmarks,
    selectedBookmarkCount,
    selectedBookmarkIdList,
    setBookmarkSelection,
    addBookmarksToSelection,
    toggleBookmarkSelection,
    removeBookmarkFromSelection,
    clearBookmarkSelection,
    setSelectionAnchor,
    getSelectionAnchor,
    isBookmarkSelected,
    beginBookmarkDrag,
    updateDragDropTarget,
    endBookmarkDrag,
    reorderBookmarks,
    moveBookmarksToCategory,
    categoryDragState,
    beginCategoryDrag,
    updateCategoryDragTarget,
    endCategoryDrag,
    moveCategory,
    canMoveCategory,
    moveCategoryRelative,
    canMoveCategoryUp,
    canMoveCategoryDown
  }

  return {
    // State
    bookmarks,
    categories,
    selectedCategoryId,
    viewMode,
    searchQuery,
    searchResults,
    loading,
    dragState,

    // Getters
    filteredBookmarks,
    categorizedBookmarks,
    categoryTree,
    bookmarkCount,
    categoryCount,
    allTags,

    // Actions
    loadBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    toggleBookmarkPin,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryPin,
    search,
    importBookmarks,
    exportBookmarks,
    getCategoryBookmarks,
    clearSearch,
    selectCategory,
    setViewMode,
    initializeSearchEngine,
    updateSearchConfig,
    rebuildSearchIndex,
    toggleCategoryExpand,
    findCategoryById,

    // Chrome 书签
    initChromeBookmarks,
    syncFromChrome,

    // 标签管理
    getBookmarksByTag,
    addTagToBookmark,
    removeTagFromBookmark,
    renameTag,
    deleteTag,

    // 重复检测
    findDuplicateBookmarks,
    checkDuplicate,
    duplicateGroups,

    // 批量操作
    batchMode,
    toggleBatchMode,
    selectAll,
    batchMove,
    batchAddTags,
    batchPin,
    batchUnpin,
    batchDelete,

    ...selectionExports
  }
})
