/**
 * 书签排序工具函数
 */

import type { Bookmark } from '@/types/bookmark'
import type { BookmarkSortType } from '@/types/sort'

/**
 * 根据排序类型对书签数组进行排序
 * @param bookmarks - 待排序的书签数组
 * @param sortType - 排序类型
 * @returns 排序后的书签数组（新数组）
 */
export function sortBookmarks(bookmarks: Bookmark[], sortType: BookmarkSortType): Bookmark[] {
  // 创建副本，避免修改原数组
  const sorted = [...bookmarks]

  switch (sortType) {
    case 'lastVisited':
      // 最近访问：按 lastVisited 降序，未访问的排最后
      return sorted.sort((a, b) => {
        if (!a.lastVisited && !b.lastVisited) return 0
        if (!a.lastVisited) return 1
        if (!b.lastVisited) return -1
        return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
      })

    case 'clickCount':
      // 访问次数：按 clickCount 降序
      return sorted.sort((a, b) => {
        const countA = a.clickCount || 0
        const countB = b.clickCount || 0
        if (countB !== countA) {
          return countB - countA
        }
        // 次数相同时，按最近访问排序
        if (!a.lastVisited && !b.lastVisited) return 0
        if (!a.lastVisited) return 1
        if (!b.lastVisited) return -1
        return new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
      })

    case 'createdAt-desc':
      // 最新创建：按 createdAt 降序
      return sorted.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

    case 'createdAt-asc':
      // 最早创建：按 createdAt 升序
      return sorted.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

    case 'title':
      // 标题排序：按标题字母顺序（支持中文拼音排序）
      return sorted.sort((a, b) => {
        return a.title.localeCompare(b.title, 'zh-CN')
      })

    case 'default':
    default:
      // 默认排序：按 sort 字段升序
      return sorted.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  }
}
