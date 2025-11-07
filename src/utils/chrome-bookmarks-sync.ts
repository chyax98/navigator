/**
 * Chrome 浏览器书签同步功能
 * 读取浏览器原生书签并转换为 Navigator 格式
 */

import type { Bookmark, Category } from '@/types/bookmark'

/**
 * Chrome 书签树节点类型
 */
interface ChromeBookmarkNode {
  id: string
  parentId?: string
  title: string
  url?: string
  dateAdded?: number
  dateGroupModified?: number
  children?: ChromeBookmarkNode[]
}

/**
 * 同步选项
 */
interface SyncOptions {
  /** 是否覆盖现有书签（默认 false，仅新增） */
  overwrite?: boolean
  /** 是否导入书签栏（默认 true） */
  includeBookmarksBar?: boolean
  /** 是否导入其他书签（默认 true） */
  includeOtherBookmarks?: boolean
  /** 是否导入移动端书签（默认 false） */
  includeMobileBookmarks?: boolean
  /** URL 过滤器（返回 false 表示跳过） */
  urlFilter?: (url: string) => boolean
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean
  categoriesAdded: number
  bookmarksAdded: number
  bookmarksUpdated: number
  bookmarksSkipped: number
  errors: string[]
}

/**
 * 默认分类 ID（用于未分类的书签）
 */
const DEFAULT_CATEGORY_ID = 'browser-sync-default'

/**
 * 检查是否在 Chrome Extension 环境中
 */
function checkChromeBookmarksAPI(): void {
  if (typeof chrome === 'undefined' || !chrome.bookmarks) {
    throw new Error('Chrome Bookmarks API not available')
  }
}

/**
 * 获取浏览器书签树
 */
async function getChromeBookmarkTree(): Promise<ChromeBookmarkNode[]> {
  checkChromeBookmarksAPI()

  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((tree) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(tree)
      }
    })
  })
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 清理分类名称
 */
function sanitizeCategoryName(name: string): string {
  // 移除特殊字符，保留中英文、数字、空格
  return name.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') || '未命名分类'
}

/**
 * 从 Chrome 书签节点提取分类
 */
function extractCategories(
  node: ChromeBookmarkNode,
  parentId?: string,
  sort = 0
): Category[] {
  const categories: Category[] = []

  // 跳过根节点和不包含子节点的节点
  if (!node.children || node.children.length === 0) {
    return categories
  }

  // 为当前文件夹创建分类
  if (node.title && node.id !== '0') {
    const category: Category = {
      id: `chrome-${node.id}`,
      name: sanitizeCategoryName(node.title),
      sort,
      isPrivate: false,
      parentId,
      source: 'chrome'
    }
    categories.push(category)
  }

  // 递归处理子节点
  let childSort = 0
  for (const child of node.children) {
    if (child.children) {
      // 子文件夹
      const currentParentId = node.id !== '0' ? `chrome-${node.id}` : parentId
      const subCategories = extractCategories(child, currentParentId, childSort++)
      categories.push(...subCategories)
    }
  }

  return categories
}

/**
 * 从 Chrome 书签节点提取书签
 */
function extractBookmarks(
  node: ChromeBookmarkNode,
  categoryId?: string,
  options?: SyncOptions
): Bookmark[] {
  const bookmarks: Bookmark[] = []

  if (!node.children) {
    // 叶子节点：书签
    if (node.url) {
      // URL 过滤
      if (options?.urlFilter && !options.urlFilter(node.url)) {
        return bookmarks
      }

      const bookmark: Bookmark = {
        id: generateId(),
        title: node.title || node.url,
        url: node.url,
        categoryId: categoryId || DEFAULT_CATEGORY_ID,
        tags: [],
        createdAt: new Date(node.dateAdded || Date.now()),
        updatedAt: new Date(node.dateGroupModified || Date.now()),
        isPrivate: false,
        clickCount: 0,
        sort: 0,
        source: 'chrome'
      }
      bookmarks.push(bookmark)
    }
    return bookmarks
  }

  // 非叶子节点：文件夹
  const currentCategoryId = node.id !== '0' ? `chrome-${node.id}` : categoryId

  for (const child of node.children) {
    const childBookmarks = extractBookmarks(child, currentCategoryId, options)
    bookmarks.push(...childBookmarks)
  }

  return bookmarks
}

/**
 * 同步浏览器书签到 Navigator
 */
export async function syncBrowserBookmarks(
  existingCategories: Category[],
  existingBookmarks: Bookmark[],
  options: SyncOptions = {}
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    categoriesAdded: 0,
    bookmarksAdded: 0,
    bookmarksUpdated: 0,
    bookmarksSkipped: 0,
    errors: []
  }

  try {
    checkChromeBookmarksAPI()

    // 获取浏览器书签树
    const tree = await getChromeBookmarkTree()
    if (!tree || tree.length === 0) {
      result.errors.push('浏览器书签树为空')
      return result
    }

    const rootNode = tree[0]
    if (!rootNode.children) {
      result.errors.push('浏览器书签根节点无效')
      return result
    }

    // 解析各个书签文件夹
    const newCategories: Category[] = []
    const newBookmarks: Bookmark[] = []

    for (const topNode of rootNode.children) {
      // 过滤指定的书签文件夹
      const nodeTitle = topNode.title?.toLowerCase() || ''

      if (nodeTitle === 'bookmarks bar' || nodeTitle === '书签栏') {
        if (options.includeBookmarksBar !== false) {
          newCategories.push(...extractCategories(topNode))
          newBookmarks.push(...extractBookmarks(topNode, undefined, options))
        }
      } else if (nodeTitle === 'other bookmarks' || nodeTitle === '其他书签') {
        if (options.includeOtherBookmarks !== false) {
          newCategories.push(...extractCategories(topNode))
          newBookmarks.push(...extractBookmarks(topNode, undefined, options))
        }
      } else if (nodeTitle === 'mobile bookmarks' || nodeTitle === '移动设备书签') {
        if (options.includeMobileBookmarks === true) {
          newCategories.push(...extractCategories(topNode))
          newBookmarks.push(...extractBookmarks(topNode, undefined, options))
        }
      } else {
        // 自定义文件夹
        newCategories.push(...extractCategories(topNode))
        newBookmarks.push(...extractBookmarks(topNode, undefined, options))
      }
    }

    // 创建默认分类（如果有未分类的书签）
    const hasDefaultCategory = newBookmarks.some(b => b.categoryId === DEFAULT_CATEGORY_ID)
    if (hasDefaultCategory && !newCategories.find(c => c.id === DEFAULT_CATEGORY_ID)) {
      newCategories.unshift({
        id: DEFAULT_CATEGORY_ID,
        name: '浏览器书签（未分类）',
        sort: -1,
        isPrivate: false,
        source: 'chrome'
      })
    }

    // 合并分类（避免重复）
    const existingCategoryIds = new Set(existingCategories.map(c => c.id))
    for (const category of newCategories) {
      if (!existingCategoryIds.has(category.id)) {
        existingCategories.push(category)
        result.categoriesAdded++
      }
    }

    // 合并书签
    const existingBookmarkUrls = new Map(
      existingBookmarks.map(b => [b.url.toLowerCase(), b])
    )

    for (const bookmark of newBookmarks) {
      const existingBookmark = existingBookmarkUrls.get(bookmark.url.toLowerCase())

      if (existingBookmark) {
        if (options.overwrite) {
          // 覆盖现有书签
          Object.assign(existingBookmark, {
            title: bookmark.title,
            categoryId: bookmark.categoryId,
            updatedAt: new Date()
          })
          result.bookmarksUpdated++
        } else {
          // 跳过已存在的书签
          result.bookmarksSkipped++
        }
      } else {
        // 新增书签
        existingBookmarks.push(bookmark)
        result.bookmarksAdded++
      }
    }

    result.success = true
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error))
  }

  return result
}

/**
 * 递归统计书签节点
 */
function countBookmarkNodes(
  node: ChromeBookmarkNode,
  stats: { bookmarks: number; folders: number }
): void {
  if (node.url) {
    stats.bookmarks++
  } else if (node.children) {
    if (node.id !== '0') {
      stats.folders++
    }
    node.children.forEach(child => countBookmarkNodes(child, stats))
  }
}

/**
 * 获取浏览器书签统计信息
 */
export async function getBrowserBookmarksStats(): Promise<{
  totalBookmarks: number
  totalFolders: number
}> {
  try {
    checkChromeBookmarksAPI()

    const tree = await getChromeBookmarkTree()
    const stats = { bookmarks: 0, folders: 0 }

    tree.forEach(node => countBookmarkNodes(node, stats))

    return { totalBookmarks: stats.bookmarks, totalFolders: stats.folders }
  } catch {
    return { totalBookmarks: 0, totalFolders: 0 }
  }
}

/**
 * 检查是否支持浏览器书签同步
 */
export function isBrowserBookmarksSyncSupported(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.bookmarks
}
