/**
 * 主页网格布局类型定义
 *
 * 定义主页书签网格的数据模型、配置和校验规则
 * @see specs/001-homepage-grid-layout/data-model.md
 */

import type { Bookmark } from './bookmark'

/**
 * 主页布局配置
 *
 * 存储在 localStorage 的网格显示参数
 */
export interface HomepageLayoutConfig {
  /** 数据模型版本号，当前版本: 1 */
  version: number

  /** 网格列数（1-6列），默认 3 */
  columns: number

  /** 配置最后修改时间 */
  lastModified: Date

  /** 是否显示空状态引导文案（默认 true） */
  showEmptyGuide?: boolean
}

/**
 * 主页书签项
 *
 * 主页中单个书签的配置数据，不存储完整书签对象
 * 书签对象通过 bookmarkId 从 bookmarkStore 中查找
 */
export interface HomepageItem {
  /** 关联的书签 ID（来自 bookmarkStore.bookmarks） */
  bookmarkId: string

  /** 网格配置索引（0-based），决定显示顺序（0=第一个） */
  gridIndex: number

  /** 添加到主页的时间戳 */
  addedAt: Date
}

/**
 * 完整主页布局
 *
 * 包含配置和书签项列表，存储在 localStorage 中
 * 存储键名：'navigator_homepage_layout'
 */
export interface HomepageLayout {
  /** 配置信息 */
  config: HomepageLayoutConfig

  /** 主页书签项列表（按 gridIndex 排序） */
  items: HomepageItem[]
}

/**
 * 主页书签项与完整书签对象组合
 *
 * 用于渲染时关联完整书签信息
 */
export interface HomepageItemWithBookmark extends HomepageItem {
  /** 关联的完整书签对象 */
  bookmark: Bookmark
}

// ===== 验证函数类型 =====

/**
 * 验证主页配置
 *
 * @param config - 待验证的配置对象
 * @returns 配置是否合法
 */
export type ValidateConfigFn = (config: HomepageLayoutConfig) => boolean

/**
 * 验证主页书签项
 *
 * @param item - 待验证的书签项
 * @param bookmarks - 当前所有书签列表
 * @returns 书签项是否合法
 */
export type ValidateItemFn = (item: HomepageItem, bookmarks: Bookmark[]) => boolean

/**
 * 验证完整布局
 *
 * @param layout - 待验证的布局
 * @param bookmarks - 当前所有书签列表
 * @returns 验证结果（合法标志 + 错误列表）
 */
export type ValidateLayoutFn = (
  layout: HomepageLayout,
  bookmarks: Bookmark[]
) => { valid: boolean; errors: string[] }

/**
 * 自动修复布局
 *
 * @param layout - 损坏的布局
 * @param bookmarks - 当前所有书签列表
 * @returns 修复后的布局
 */
export type RepairLayoutFn = (layout: HomepageLayout, bookmarks: Bookmark[]) => HomepageLayout

// ===== 默认值常量 =====

/**
 * 默认主页配置
 */
export const DEFAULT_CONFIG: HomepageLayoutConfig = {
  version: 1,
  columns: 3,
  lastModified: new Date(),
  showEmptyGuide: true
}

/**
 * localStorage 存储键名
 */
export const STORAGE_KEY = 'navigator_homepage_layout'

/**
 * 网格列数约束
 */
export const COLUMN_CONSTRAINTS = {
  MIN: 1,
  MAX: 6,
  DEFAULT: 3
} as const
