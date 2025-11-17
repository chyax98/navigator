/**
 * Chrome 书签增量同步服务
 * 只增不删 + URL 去重
 */

import type { Bookmark } from '@/types/bookmark'
import { nanoid } from 'nanoid'
import { getStorage } from '@/utils/storage-factory'

const storage = getStorage()

interface ChromeBookmarkNode {
  id: string
  title: string
  url?: string
  children?: ChromeBookmarkNode[]
}

/**
 * 展平 Chrome 书签树，只提取链接
 */
function flattenBookmarks(node: ChromeBookmarkNode): ChromeBookmarkNode[] {
  const result: ChromeBookmarkNode[] = []

  if (node.url) {
    result.push(node)
  }

  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenBookmarks(child))
    }
  }

  return result
}

/**
 * 规范化 URL（用于去重）
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

/**
 * 增量同步 Chrome 书签
 * 规则：
 * 1. 只增不删
 * 2. URL 去重（如果 URL 已存在，跳过）
 * 3. 保留用户的置顶状态
 */
export async function syncChromeBookmarks(): Promise<{ added: number; skipped: number }> {
  if (typeof chrome === 'undefined' || !chrome.bookmarks) {
    throw new Error('Chrome Bookmarks API 不可用')
  }

  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree(async (tree: chrome.bookmarks.BookmarkTreeNode[]) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      try {
        const bookmarksBar = tree[0]?.children?.find(n => n.id === '1')
        if (!bookmarksBar) {
          resolve({ added: 0, skipped: 0 })
          return
        }

        const chromeBookmarks = flattenBookmarks(bookmarksBar)
        let localBookmarks = await storage.getBookmarks()

        const existingUrls = new Set(
          localBookmarks.map(b => normalizeUrl(b.url))
        )

        const newBookmarks: Bookmark[] = []
        let skipped = 0

        for (const chromeB of chromeBookmarks) {
          if (!chromeB.url) continue

          const normalizedUrl = normalizeUrl(chromeB.url)

          if (existingUrls.has(normalizedUrl)) {
            skipped++
            continue
          }

          const newBookmark: Bookmark = {
            id: nanoid(),
            chromeId: chromeB.id,
            title: chromeB.title || chromeB.url,
            url: chromeB.url,
            categoryId: 'default',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isPrivate: false,
            clickCount: 0,
            isPinned: false,
            sort: localBookmarks.length + newBookmarks.length,
            source: 'chrome'
          }

          newBookmarks.push(newBookmark)
          existingUrls.add(normalizedUrl)
        }

        if (newBookmarks.length > 0) {
          localBookmarks.push(...newBookmarks)
          const serialized = localBookmarks.map(b => ({
            ...b,
            isPinned: Boolean(b.isPinned),
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
            lastVisited: b.lastVisited?.toISOString(),
            pinnedAt: b.pinnedAt?.toISOString()
          }))

          await new Promise<void>((resolveSet, rejectSet) => {
            chrome.storage.local.set({ navigator_bookmarks: serialized }, () => {
              if (chrome.runtime.lastError) {
                rejectSet(new Error(chrome.runtime.lastError.message))
              } else {
                resolveSet()
              }
            })
          })
        }

        resolve({ added: newBookmarks.length, skipped })
      } catch (error) {
        reject(error)
      }
    })
  })
}
