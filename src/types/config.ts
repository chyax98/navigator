/**
 * 应用配置类型定义
 */

export interface ThemeConfig {
  // 颜色配置
  primaryColor: string
  accentColor: string
  backgroundColor: string

  // 样式配置
  borderRadius: 'small' | 'medium' | 'large'
  cardShadow: boolean
  fontSize: 'small' | 'medium' | 'large'

  // 布局配置
  gridColumns: number // 网格列数
  cardSpacing: number // 卡片间距
}

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
  themeConfig: ThemeConfig // 新增主题配置
  enableDragSort: boolean // 新增拖拽排序开关
}

export interface SessionData {
  authenticated: boolean
  lastActivity: Date
  sessionId: string
}

export const defaultThemeConfig: ThemeConfig = {
  primaryColor: '#18a058',
  accentColor: '#2080f0',
  backgroundColor: '#ffffff',
  borderRadius: 'medium',
  cardShadow: true,
  fontSize: 'medium',
  gridColumns: 4,
  cardSpacing: 16
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
  themeConfig: defaultThemeConfig, // 新增主题配置
  enableDragSort: false // 新增拖拽排序开关
}
