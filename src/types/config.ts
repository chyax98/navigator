/**
 * 应用配置类型定义
 */

import type { BookmarkSortType } from './sort'

/**
 * 网格列数约束
 */
export const GRID_COLUMN_CONSTRAINTS = {
  MIN: 1,
  MAX: 6,
  DEFAULT: 3
} as const

export interface AppConfig {
  theme: 'light' | 'dark' | 'auto'
  language: string
  searchEngine: string
  passwordEnabled: boolean
  autoBackup: boolean
  maxBookmarksPerPage: number
  defaultView: 'grid' | 'list'
  showFavicon: boolean
  enableAnimations: boolean
  enableDragSort: boolean // 拖拽排序开关
  gridColumns: number // 网格列数（用于所有视图）
  // 侧边栏宽度（像素）
  sidebarWidth?: number
  // 侧边栏是否收起
  sidebarCollapsed?: boolean
  // 置顶分类排序模式与自定义顺序
  pinnedCategorySortMode: 'byCount' | 'custom'
  pinnedCategoryOrder: string[]
  // 主页功能模块的显示顺序（手动拖拽）
  homeFeaturesOrder: string[]
  apiConnectionStatus?: 'connected' | 'disconnected'
  apiConnectionMessage?: string
  apiLastTestedAt?: string

  // AI API配置 (可选插件)
  enableSemanticSearch?: boolean
  semanticWeight?: number // 语义搜索权重 0-1
  keywordWeight?: number // 关键词搜索权重 0-1
  aiApiProvider?: 'openai' | 'siliconflow' // API提供商
  openaiApiKey?: string // OpenAI API密钥
  siliconflowApiBaseUrl?: string // 硅基流动 API Base URL
  siliconflowApiKey?: string // 硅基流动 API 密钥
  embeddingModel?: string // Embedding模型名
  chatModel?: string // 聊天模型名（用于AI标签生成）

  // 网页元数据提取 API
  linkPreviewApiKey?: string // LinkPreview API 密钥（用于获取网页元数据）

  // Chrome 书签同步配置
  lastChromeSyncTime?: string // 上次从 Chrome 同步的时间（ISO 8601）

  // 书签排序配置
  homepageSortType?: BookmarkSortType // 主页排序方式
  categorySortType?: BookmarkSortType // 分类页排序方式
}

export interface SessionData {
  authenticated: boolean
  lastActivity: Date
  sessionId: string
}

export const defaultConfig: AppConfig = {
  theme: 'auto',
  language: 'zh-CN',
  searchEngine: 'fuse',
  passwordEnabled: false,
  autoBackup: true,
  maxBookmarksPerPage: 50,
  defaultView: 'grid',
  showFavicon: true,
  enableAnimations: true,
  enableDragSort: true,
  gridColumns: 3, // 默认 3 列，与主页布局保持一致
  sidebarWidth: 280, // 默认侧边栏宽度
  sidebarCollapsed: false, // 默认不收起侧边栏
  pinnedCategorySortMode: 'custom',
  pinnedCategoryOrder: [],
  homeFeaturesOrder: ['create', 'recent', 'settings'],
  apiConnectionStatus: 'disconnected',
  apiConnectionMessage: '尚未进行连接测试',
  apiLastTestedAt: '',

  // AI API配置 (可选插件)
  enableSemanticSearch: false, // 默认关闭
  semanticWeight: 0.6,
  keywordWeight: 0.4,
  aiApiProvider: 'siliconflow', // 默认使用硅基流动
  openaiApiKey: '', // OpenAI API密钥（可选）
  siliconflowApiBaseUrl: 'https://api.siliconflow.cn/v1', // 硅基流动API Base URL
  siliconflowApiKey: '', // 硅基流动API密钥
  embeddingModel: 'BAAI/bge-m3', // 硅基流动推荐的多语言embedding模型（免费）
  chatModel: 'Qwen/Qwen2.5-7B-Instruct', // 硅基流动 2025 最新免费模型（Qwen2.5）

  // 网页元数据提取 API
  linkPreviewApiKey: '', // LinkPreview API 密钥（免费60次/小时）

  // Chrome 书签同步配置
  lastChromeSyncTime: '',

  // 书签排序配置
  homepageSortType: 'default',
  categorySortType: 'default'
}
