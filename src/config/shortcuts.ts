/**
 * 快捷键配置
 */

export interface Shortcut {
  key: string
  description: string
  category: string
  action?: string // 事件名称或操作标识
}

/**
 * 检测是否是 macOS
 */
export const isMac = () => {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
}

/**
 * 获取修饰键名称（Ctrl 或 Command）
 */
export const getModifierKey = () => {
  return isMac() ? '⌘' : 'Ctrl'
}

/**
 * 格式化快捷键显示（将 Ctrl 替换为 ⌘ on Mac）
 */
export function formatShortcut(key: string): string {
  if (isMac()) {
    return key
      .replace(/Ctrl/g, '⌘')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
  }
  return key
}

/**
 * 默认快捷键配置
 */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // 导航
  {
    key: 'Ctrl+1',
    description: '切换到主页视图',
    category: '导航',
    action: 'view-homepage'
  },
  {
    key: 'Ctrl+2',
    description: '切换到分类视图',
    category: '导航',
    action: 'view-category'
  },

  // 搜索
  {
    key: 'Ctrl+K',
    description: '聚焦搜索框',
    category: '搜索',
    action: 'focus-search'
  },
  {
    key: 'Ctrl+F',
    description: '聚焦搜索框（备用）',
    category: '搜索',
    action: 'focus-search'
  },
  {
    key: 'Escape',
    description: '清空搜索或关闭弹窗',
    category: '搜索',
    action: 'escape'
  },

  // 操作
  {
    key: 'Ctrl+N',
    description: '添加新书签',
    category: '操作',
    action: 'add-bookmark'
  },
  {
    key: 'Ctrl+B',
    description: '切换批量模式',
    category: '操作',
    action: 'toggle-batch'
  },

  // 批量操作
  {
    key: 'Ctrl+A',
    description: '全选（批量模式下）',
    category: '批量',
    action: 'select-all'
  },
  {
    key: 'Ctrl+Shift+A',
    description: '取消选择',
    category: '批量',
    action: 'clear-selection'
  },

  // 帮助
  {
    key: '?',
    description: '显示快捷键帮助',
    category: '帮助',
    action: 'show-shortcuts'
  }
]

/**
 * 获取指定分类的快捷键
 */
export function getShortcutsByCategory(category: string): Shortcut[] {
  return DEFAULT_SHORTCUTS.filter(s => s.category === category)
}

/**
 * 获取所有分类
 */
export function getCategories(): string[] {
  return [...new Set(DEFAULT_SHORTCUTS.map(s => s.category))]
}
