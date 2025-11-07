/**
 * 书签导入工具
 * 支持 Chrome 书签、JSON、HTML 等格式
 */

import type { Bookmark, Category } from '@/types/bookmark'
import { nanoid } from 'nanoid'

function getFaviconUrl(_rawUrl: string | undefined | null): string | undefined {
  // 不再生成外部 favicon URL，返回 undefined
  // 让 useFavicon composable 和 favicon-cache 服务自动处理
  return undefined
}

interface ChromeBookmarkNode {
  children?: ChromeBookmarkNode[]
  date_added?: string
  date_last_used?: string
  date_modified?: string
  guid?: string
  id?: string
  name?: string
  type?: string
  url?: string
}

interface ChromeBookmarkRoot {
  checksum?: string
  roots: {
    bookmark_bar: ChromeBookmarkNode
    other: ChromeBookmarkNode
    synced?: ChromeBookmarkNode
  }
  version: number
}

/**
 * 解析 Chrome 书签 JSON
 */
export async function parseChromeBookmarks(file: File): Promise<{ bookmarks: Bookmark[], categories: Category[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data: ChromeBookmarkRoot = JSON.parse(content)

        const bookmarks: Bookmark[] = []
        const categories: Category[] = []
        const categoryMap = new Map<string, string>()

        // 解析书签栏
        if (data.roots.bookmark_bar) {
          parseBookmarkNode(
            data.roots.bookmark_bar,
            'bookmark_bar',
            bookmarks,
            categories,
            categoryMap
          )
        }

        // 解析其他书签
        if (data.roots.other) {
          parseBookmarkNode(
            data.roots.other,
            'other',
            bookmarks,
            categories,
            categoryMap
          )
        }

        resolve({ bookmarks, categories })
      } catch (error) {
        reject(new Error('Failed to parse Chrome bookmarks: ' + error))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * 递归解析书签节点
 */
function parseBookmarkNode(
  node: ChromeBookmarkNode,
  categoryId: string,
  bookmarks: Bookmark[],
  categories: Category[],
  categoryMap: Map<string, string>,
  parentId?: string
): void {
  if (node.type === 'folder') {
    const id = nanoid()
    categoryMap.set(node.id || node.name || '', id)

    categories.push({
      id,
      name: node.name || 'Unnamed',
      parentId,
      sort: categories.length,
      isPrivate: false,
      source: 'user'
    })

    // 递归处理子节点
    if (node.children) {
      node.children.forEach(child => {
        parseBookmarkNode(child, id, bookmarks, categories, categoryMap, id)
      })
    }
  } else if (node.type === 'url' && node.url) {
    const favicon = getFaviconUrl(node.url)

    bookmarks.push({
      id: nanoid(),
      title: node.name || 'Untitled',
      url: node.url,
      description: '',
      ...(favicon ? { favicon } : {}),
      categoryId,
      tags: [],
      createdAt: node.date_added ? new Date(parseInt(node.date_added) / 1000) : new Date(),
      updatedAt: new Date(),
      isPrivate: false,
      clickCount: 0,
      sort: bookmarks.length,
      source: 'user'
    })
  }
}

/**
 * 解析 HTML 书签文件
 */
export async function parseHTMLBookmarks(file: File): Promise<{ bookmarks: Bookmark[], categories: Category[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')

        const bookmarks: Bookmark[] = []
        const categories: Category[] = []

        // 解析 HTML 结构
        const parseElement = (element: Element, categoryId: string, parentId?: string) => {
          const dt = element.querySelectorAll(':scope > dt')

          dt.forEach(item => {
            const h3 = item.querySelector('h3')
            const a = item.querySelector('a')

            if (h3) {
              // 这是一个文件夹
              const id = nanoid()
              categories.push({
                id,
                name: h3.textContent || 'Unnamed',
                parentId,
                sort: categories.length,
                isPrivate: false,
                source: 'user'
              })

              const dl = item.querySelector('dl')
              if (dl) {
                parseElement(dl, id, id)
              }
            } else if (a) {
              // 这是一个书签
              const url = a.getAttribute('href') || ''
              if (url) {
                const favicon = getFaviconUrl(url)

                bookmarks.push({
                  id: nanoid(),
                  title: a.textContent || 'Untitled',
                  url,
                  description: '',
                  ...(favicon ? { favicon } : {}),
                  categoryId,
                  tags: [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isPrivate: false,
                  clickCount: 0,
                  sort: bookmarks.length,
                  source: 'user'
                })
              }
            }
          })
        }

        const rootDl = doc.querySelector('dl')
        if (rootDl) {
          const rootId = 'root'
          categories.push({
            id: rootId,
            name: 'Imported',
            sort: 0,
            isPrivate: false,
            source: 'user'
          })
          parseElement(rootDl, rootId)
        }

        resolve({ bookmarks, categories })
      } catch (error) {
        reject(new Error('Failed to parse HTML bookmarks: ' + error))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * 解析 JSON 书签文件
 */
export async function parseJSONBookmarks(file: File): Promise<{ bookmarks: Bookmark[], categories: Category[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        if (data.bookmarks && data.categories) {
          resolve({
            bookmarks: data.bookmarks,
            categories: data.categories
          })
        } else {
          reject(new Error('Invalid JSON format'))
        }
      } catch (error) {
        reject(new Error('Failed to parse JSON: ' + error))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * 自动检测并解析书签文件
 */
export async function parseBookmarkFile(file: File): Promise<{ bookmarks: Bookmark[], categories: Category[] }> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'json':
      // 尝试作为 Chrome 书签或通用 JSON
      try {
        return await parseChromeBookmarks(file)
      } catch {
        return await parseJSONBookmarks(file)
      }

    case 'html':
    case 'htm':
      return await parseHTMLBookmarks(file)

    default:
      throw new Error('Unsupported file format: ' + extension)
  }
}
