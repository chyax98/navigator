/**
 * Chrome 书签实时读取服务
 * 直接读取 Chrome 书签栏，无需手动导入，支持实时监听
 */

import type { Bookmark, Category, BookmarkSource, CategorySource } from '@/types/bookmark'
import { DebugPanel } from '@/utils/debug'

/**
 * Chrome 书签位置 ID
 */
const BOOKMARKS_BAR_ID = '1'        // 书签栏
const OTHER_BOOKMARKS_ID = '2'      // 其他书签
// const MOBILE_BOOKMARKS_ID = '3'  // 移动设备书签（暂不支持）

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
 * 获取所有 Chrome 书签（书签栏 + 其他书签）
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
      chrome.bookmarks.getTree((nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!nodes || nodes.length === 0) {
          resolve({ bookmarks: [], categories: [] })
          return
        }

        const root = nodes[0]
        DebugPanel.log('[getChromeBookmarksBar] 📂 Chrome 根节点子节点数量:', root.children?.length)

        const allBookmarks: Bookmark[] = []
        const allCategories: Category[] = []

        // 读取书签栏（id="1"）
        const bookmarksBar = root.children?.find(node => node.id === BOOKMARKS_BAR_ID)
        DebugPanel.log('[getChromeBookmarksBar] 📌 书签栏子节点数量:', bookmarksBar?.children?.length)

        // 调试：显示前3个子节点的类型
        if (bookmarksBar?.children) {
          const samples = bookmarksBar.children.slice(0, 3).map(n =>
            `${n.title}(${n.url ? 'bookmark' : 'folder'})`
          ).join(', ')
          DebugPanel.log('[getChromeBookmarksBar] 📝 前3个节点:', samples)
        }

        if (bookmarksBar) {
          const barResult = traverseBookmarkNode(bookmarksBar, null, ['书签栏'])
          DebugPanel.log('[getChromeBookmarksBar] ✅ 书签栏结果: 书签', barResult.bookmarks.length, '个, 分类', barResult.categories.length, '个')
          allBookmarks.push(...barResult.bookmarks)
          allCategories.push(...barResult.categories)
        }

        // 读取其他书签（id="2"）
        const otherBookmarks = root.children?.find(node => node.id === OTHER_BOOKMARKS_ID)
        if (otherBookmarks) {
          const otherResult = traverseBookmarkNode(otherBookmarks, null, ['其他书签'])
          allBookmarks.push(...otherResult.bookmarks)
          allCategories.push(...otherResult.categories)
        }

        resolve({ bookmarks: allBookmarks, categories: allCategories })
      })
    })
  } catch (error) {
    console.error('Failed to get Chrome bookmarks:', error)
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
  DebugPanel.log(`[traverseBookmarkNode] 📂 处理节点: ${node.title}, 子节点数: ${children.length}`)

  let folderCount = 0
  let bookmarkCount = 0

  for (const child of children) {
    if (child.url) {
      // 这是一个书签
      const bookmark = convertChromeBookmarkToBookmark(
        child,
        parentCategoryId || CHROME_BOOKMARKS_BAR_CATEGORY_ID
      )
      bookmarks.push(bookmark)
      bookmarkCount++
    } else {
      // 这是一个文件夹，转换为分类
      folderCount++
      const category = convertChromeNodeToCategory(child, parentCategoryId)
      categories.push(category)
      DebugPanel.log(`[traverseBookmarkNode] ➕ 发现文件夹: ${child.title}, ID: ${category.id}`)

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

  DebugPanel.log(`[traverseBookmarkNode] ✅ ${node.title}: 文件夹 ${folderCount} 个, 书签 ${bookmarkCount} 个`)

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
  // Chrome dateAdded 是微秒时间戳（16位）,需除以1000转换为毫秒
  // 示例: 1731811200000000 (微秒) → 1731811200000 (毫秒) → 2024-11-17
  const createdAt = node.dateAdded
    ? new Date(Math.floor(node.dateAdded / 1000))
    : new Date()

  return {
    id: `${CHROME_BOOKMARK_ID_PREFIX}${node.id}`,
    title: node.title || node.url || 'Untitled',
    url: node.url!,
    categoryId,
    tags: [],
    createdAt,
    updatedAt: new Date(),
    isPrivate: false,
    clickCount: 0,
    isPinned: false, // Chrome 书签默认不置顶
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

