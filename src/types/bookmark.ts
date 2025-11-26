/**
 * 书签数据类型定义
 */

// 书签来源类型
export type BookmarkSource = 'user' | 'chrome'

export interface Bookmark {
  id: string
  title: string
  url: string
  description?: string
  favicon?: string
  categoryId: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  isPrivate: boolean
  clickCount: number
  lastVisited?: Date
  isPinned?: boolean
  pinnedAt?: Date
  sort: number
  source: BookmarkSource
  chromeId?: string
}

// 分类来源类型
export type CategorySource = 'user' | 'chrome'

export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  parentId?: string // 支持嵌套分类
  sort: number
  isPrivate: boolean
  // 是否置顶到主页
  isPinned?: boolean
  children?: Category[] // 子分类（用于UI展示）
  level?: number // 层级深度，用于UI缩进
  isExpanded?: boolean // 是否展开（UI状态）
  source: CategorySource // 分类来源：user=用户创建，chrome=Chrome同步
}

export interface Tag {
  id: string
  name: string
  color?: string
  count: number
}

export interface SearchResult {
  bookmark: Bookmark
  score: number
  matches?: any[]
}

export interface SearchOptions {
  categoryId?: string
  tags?: string[]
  isPrivate?: boolean
  limit?: number
}
