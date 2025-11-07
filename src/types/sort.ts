/**
 * 书签排序相关类型定义
 */

/**
 * 书签排序方式
 */
export type BookmarkSortType =
  | 'lastVisited'    // 最近访问
  | 'clickCount'     // 访问次数
  | 'createdAt-desc' // 最新创建
  | 'createdAt-asc'  // 最早创建
  | 'title'          // 标题排序
  | 'default'        // 默认排序（手动排序）

/**
 * 排序选项配置
 */
export interface SortOption {
  value: BookmarkSortType
  label: string
  icon: string
  description?: string
}

/**
 * 所有可用的排序选项
 */
export const SORT_OPTIONS: SortOption[] = [
  {
    value: 'default',
    label: '默认排序',
    icon: '≡',
    description: '按手动拖拽顺序'
  },
  {
    value: 'lastVisited',
    label: '最近访问',
    icon: '🕐',
    description: '最近打开的排在前面'
  },
  {
    value: 'clickCount',
    label: '访问次数',
    icon: '🔥',
    description: '访问次数多的排在前面'
  },
  {
    value: 'createdAt-desc',
    label: '最新创建',
    icon: '📅',
    description: '新创建的排在前面'
  },
  {
    value: 'createdAt-asc',
    label: '最早创建',
    icon: '📆',
    description: '最早创建的排在前面'
  },
  {
    value: 'title',
    label: '标题排序',
    icon: '🔤',
    description: '按标题字母顺序'
  }
]

/**
 * 排序配置（用于持久化）
 */
export interface SortConfig {
  homepage: BookmarkSortType    // 主页排序方式
  category: BookmarkSortType    // 分类页排序方式
}
