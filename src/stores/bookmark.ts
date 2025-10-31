/**
 * 书签状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Bookmark, Category, SearchResult } from '@/types/bookmark'
import { storageManager } from '@/utils/storage'
import { searchManager } from '@/utils/search'
import { nanoid } from 'nanoid'

export const useBookmarkStore = defineStore('bookmark', () => {
  // State
  const bookmarks = ref<Bookmark[]>([])
  const categories = ref<Category[]>([])
  const selectedCategoryId = ref<string>('all')
  const searchQuery = ref<string>('')
  const searchResults = ref<SearchResult[]>([])
  const loading = ref<boolean>(false)

  // Getters
  const filteredBookmarks = computed(() => {
    if (searchQuery.value) {
      return searchResults.value.map(r => r.bookmark)
    }

    if (selectedCategoryId.value === 'all') {
      return bookmarks.value
    }

    return bookmarks.value.filter(b => b.categoryId === selectedCategoryId.value)
  })

  const categorizedBookmarks = computed(() => {
    const map = new Map<string, Bookmark[]>()

    categories.value.forEach(category => {
      map.set(category.id, bookmarks.value.filter(b => b.categoryId === category.id))
    })

    return map
  })

  // 构建嵌套分类树
  const categoryTree = computed(() => {
    return buildCategoryTree(categories.value)
  })

  // 获取分类下的所有书签（包括子分类）
  function getCategoryBookmarks(categoryId: string): Bookmark[] {
    const category = categories.value.find(c => c.id === categoryId)
    if (!category) return []

    // 直接书签
    const directBookmarks = bookmarks.value.filter(b => b.categoryId === categoryId)

    // 子分类书签
    const childBookmarks: Bookmark[] = []
    const childCategories = categories.value.filter(c => c.parentId === categoryId)
    childCategories.forEach(child => {
      childBookmarks.push(...getCategoryBookmarks(child.id))
    })

    return [...directBookmarks, ...childBookmarks]
  }

  const bookmarkCount = computed(() => bookmarks.value.length)

  const categoryCount = computed(() => categories.value.length)

  // 构建分类树结构
  function buildCategoryTree(categories: Category[]): Category[] {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // 创建映射
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [], level: 0 })
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
      loading.value = true
      await storageManager.initDatabase()

      const loadedBookmarks = await storageManager.getBookmarks()
      const loadedCategories = storageManager.getCategories()

      bookmarks.value = loadedBookmarks || []
      categories.value = loadedCategories || getDefaultCategories()

      // 初始化搜索引擎
      await searchManager.initialize(bookmarks.value)
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
    } finally {
      loading.value = false
    }
  }

  async function addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'clickCount'>) {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      clickCount: 0
    }

    bookmarks.value.push(newBookmark)
    await storageManager.saveBookmark(newBookmark)
    await searchManager.addBookmark(newBookmark)

    return newBookmark
  }

  async function updateBookmark(id: string, updates: Partial<Bookmark>) {
    const index = bookmarks.value.findIndex(b => b.id === id)
    if (index === -1) return

    const updatedBookmark = {
      ...bookmarks.value[index],
      ...updates,
      updatedAt: new Date()
    }

    bookmarks.value[index] = updatedBookmark
    await storageManager.saveBookmark(updatedBookmark)
    await searchManager.updateBookmark(updatedBookmark)
  }

  async function deleteBookmark(id: string) {
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    await storageManager.deleteBookmark(id)
    await searchManager.removeBookmark(id)
  }

  async function addCategory(category: Omit<Category, 'id' | 'sort'>) {
    const newCategory: Category = {
      ...category,
      id: nanoid(),
      sort: categories.value.length
    }

    categories.value.push(newCategory)
    storageManager.saveCategories(categories.value)

    return newCategory
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1) return

    categories.value[index] = {
      ...categories.value[index],
      ...updates
    }

    storageManager.saveCategories(categories.value)
  }

  async function deleteCategory(id: string) {
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
    storageManager.saveCategories(categories.value)
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
    // 合并导入的数据
    const importedBookmarks = data.bookmarks.map(b => ({
      ...b,
      id: nanoid() // 生成新 ID 避免冲突
    }))

    const importedCategories = data.categories.map(c => ({
      ...c,
      id: nanoid(),
      sort: categories.value.length + c.sort
    }))

    // 更新分类 ID 引用
    const categoryIdMap = new Map<string, string>()
    data.categories.forEach((oldCat, index) => {
      categoryIdMap.set(oldCat.id, importedCategories[index].id)
    })

    importedBookmarks.forEach(bookmark => {
      const newCategoryId = categoryIdMap.get(bookmark.categoryId)
      if (newCategoryId) {
        bookmark.categoryId = newCategoryId
      }
    })

    // 添加到现有数据
    bookmarks.value.push(...importedBookmarks)
    categories.value.push(...importedCategories)

    // 保存到存储
    for (const bookmark of importedBookmarks) {
      await storageManager.saveBookmark(bookmark)
    }
    storageManager.saveCategories(categories.value)

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
  }

  function getDefaultCategories(): Category[] {
    return [
      {
        id: 'default',
        name: '未分类',
        icon: '📁',
        color: '#808080',
        sort: 0,
        isPrivate: false
      },
      {
        id: 'favorites',
        name: '收藏',
        icon: '⭐',
        color: '#FFD700',
        sort: 1,
        isPrivate: false
      }
    ]
  }

  return {
    // State
    bookmarks,
    categories,
    selectedCategoryId,
    searchQuery,
    searchResults,
    loading,

    // Getters
    filteredBookmarks,
    categorizedBookmarks,
    categoryTree,
    bookmarkCount,
    categoryCount,

    // Actions
    loadBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addCategory,
    updateCategory,
    deleteCategory,
    search,
    importBookmarks,
    exportBookmarks,
    getCategoryBookmarks,
    clearSearch,
    selectCategory
  }
})
