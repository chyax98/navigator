/**
 * Chrome 书签实时读取服务
 * 直接读取 Chrome 书签栏，无需手动导入，支持实时监听
 */

import type { Bookmark, Category, BookmarkSource, CategorySource } from '@/types/bookmark'

/**
 * Chrome 书签栏 ID（固定为 "1"）
 */
const BOOKMARKS_BAR_ID = '1'

/**
 * Chrome 书签栏分类 ID 前缀
 */
export const CHROME_CATEGORY_ID_PREFIX = 'chrome-category-'
export const CHROME_BOOKMARK_ID_PREFIX = 'chrome-bookmark-'
export const CHROME_BOOKMARKS_BAR_CATEGORY_ID = 'chrome-bookmarks-bar'

/**
 * 检查是否在 Chrome Extension 环境中
 */
export function isChromeExtension(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.bookmarks
}

/**
 * 获取 Chrome 书签栏中的所有书签和分类
 */
export async function getChromeBookmarksBar(): Promise<{
  bookmarks: Bookmark[]
  categories: Category[]
}> {
  if (!isChromeExtension()) {
    console.warn('Chrome Bookmarks API not available')
    return { bookmarks: [], categories: [] }
  }

  try {
    return new Promise<{ bookmarks: Bookmark[]; categories: Category[] }>((resolve, reject) => {
      // 使用 getTree 获取整棵树，然后找到书签栏
      chrome.bookmarks.getTree((nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!nodes || nodes.length === 0) {
          resolve({ bookmarks: [], categories: [] })
          return
        }

        // Chrome 书签树结构：根节点 -> 书签栏 (id="1")
        const root = nodes[0]
        const bookmarksBar = root.children?.find(node => node.id === BOOKMARKS_BAR_ID)

        if (!bookmarksBar) {
          console.warn('Bookmarks bar not found')
          resolve({ bookmarks: [], categories: [] })
          return
        }

        const result = traverseBookmarkNode(bookmarksBar, null, [])
        resolve(result)
      })
    })
  } catch (error) {
    console.error('Failed to get Chrome bookmarks bar:', error)
    return { bookmarks: [], categories: [] }
  }
}

/**
 * 递归遍历书签节点，提取书签和分类
 */
function traverseBookmarkNode(
  node: chrome.bookmarks.BookmarkTreeNode,
  parentCategoryId: string | null,
  path: string[]
): { bookmarks: Bookmark[]; categories: Category[] } {
  const bookmarks: Bookmark[] = []
  const categories: Category[] = []

  // 跳过根节点本身，直接处理其子节点
  const children = node.children || []

  for (const child of children) {
    if (child.url) {
      // 这是一个书签
      const bookmark = convertChromeBookmarkToBookmark(
        child,
        parentCategoryId || CHROME_BOOKMARKS_BAR_CATEGORY_ID
      )
      bookmarks.push(bookmark)
    } else {
      // 这是一个文件夹，转换为分类
      const category = convertChromeNodeToCategory(child, parentCategoryId)
      categories.push(category)

      // 递归处理子节点
      const childPath = [...path, child.title || 'Untitled']
      const childResult = traverseBookmarkNode(
        child,
        category.id,
        childPath
      )

      bookmarks.push(...childResult.bookmarks)
      categories.push(...childResult.categories)
    }
  }

  return { bookmarks, categories }
}

/**
 * 将 Chrome 文件夹节点转换为 Navigator 分类格式
 */
function convertChromeNodeToCategory(
  node: chrome.bookmarks.BookmarkTreeNode,
  parentId: string | null
): Category {
  return {
    id: `${CHROME_CATEGORY_ID_PREFIX}${node.id}`,
    name: node.title || 'Untitled Folder',
    parentId: parentId || undefined,
    sort: node.index || 0,
    isPrivate: false,
    source: 'chrome' as CategorySource // Chrome 同步的分类
  }
}

/**
 * 将 Chrome 书签节点转换为 Navigator 书签格式
 */
function convertChromeBookmarkToBookmark(
  node: chrome.bookmarks.BookmarkTreeNode,
  categoryId: string
): Bookmark {
  return {
    id: `${CHROME_BOOKMARK_ID_PREFIX}${node.id}`,
    title: node.title || node.url || 'Untitled',
    url: node.url!,
    categoryId,
    tags: [],
    createdAt: node.dateAdded ? new Date(node.dateAdded) : new Date(),
    updatedAt: new Date(),
    isPrivate: false,
    clickCount: 0,
    sort: node.index || 0,
    source: 'chrome' as BookmarkSource // Chrome 同步的书签
  }
}


/**
 * 获取 Chrome 书签栏统计信息
 */
export async function getChromeBookmarksBarStats(): Promise<{
  totalBookmarks: number
  totalCategories: number
}> {
  if (!isChromeExtension()) {
    return { totalBookmarks: 0, totalCategories: 0 }
  }

  try {
    const { bookmarks, categories } = await getChromeBookmarksBar()
    return {
      totalBookmarks: bookmarks.length,
      totalCategories: categories.length
    }
  } catch (error) {
    console.error('Failed to get Chrome bookmarks bar stats:', error)
    return { totalBookmarks: 0, totalCategories: 0 }
  }
}

