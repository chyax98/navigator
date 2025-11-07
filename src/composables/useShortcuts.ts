/**
 * 快捷键系统组合式函数
 */
import { useMagicKeys, whenever } from '@vueuse/core'
import { useBookmarkStore } from '@/stores/bookmark'

/**
 * 快捷键事件映射
 */
const SHORTCUT_EVENTS = {
  'show-shortcuts': 'show-shortcuts-help',
  'add-bookmark': 'show-add-bookmark',
  'focus-search': 'focus-search-input',
  'escape': 'handle-escape',
  'view-homepage': 'switch-view-homepage',
  'view-category': 'switch-view-category',
  'toggle-batch': 'toggle-batch-mode',
  'select-all': 'batch-select-all',
  'clear-selection': 'batch-clear-selection'
} as const

/**
 * 发送快捷键事件
 */
function emitShortcutEvent(action: string) {
  const eventName = SHORTCUT_EVENTS[action as keyof typeof SHORTCUT_EVENTS]
  if (eventName) {
    document.dispatchEvent(new CustomEvent(eventName))
  }
}

/**
 * 检查是否应该阻止快捷键
 * 在输入框、文本域等元素中禁用某些快捷键
 */
function shouldPreventShortcut(event?: KeyboardEvent): boolean {
  if (!event) return false

  const target = event.target as HTMLElement
  const tagName = target.tagName.toLowerCase()

  // 在输入框和文本域中，只允许 Escape 和某些特定快捷键
  if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
    return event.key !== 'Escape'
  }

  return false
}

/**
 * 快捷键系统
 */
export function useShortcuts() {
  const keys = useMagicKeys()
  const bookmarkStore = useBookmarkStore()

  // Ctrl+K / Ctrl+F: 聚焦搜索框
  whenever(() => keys['Ctrl+K'].value || keys['Meta+K'].value || keys['Ctrl+F'].value || keys['Meta+F'].value, (v) => {
    if (v) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        emitShortcutEvent('focus-search')
      }
    }
  })

  // Ctrl+N: 添加新书签
  whenever(() => keys['Ctrl+N'].value || keys['Meta+N'].value, (v) => {
    if (v) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        emitShortcutEvent('add-bookmark')
      }
    }
  })

  // Ctrl+B: 切换批量模式
  whenever(() => keys['Ctrl+B'].value || keys['Meta+B'].value, (v) => {
    if (v) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        emitShortcutEvent('toggle-batch')
      }
    }
  })

  // Ctrl+1: 切换到主页视图
  whenever(() => keys['Ctrl+1'].value || keys['Meta+1'].value, (v) => {
    if (v) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        bookmarkStore.setViewMode('homepage')
      }
    }
  })

  // Ctrl+2: 切换到分类视图
  whenever(() => keys['Ctrl+2'].value || keys['Meta+2'].value, (v) => {
    if (v) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        bookmarkStore.setViewMode('category')
      }
    }
  })

  // Ctrl+A: 全选（仅在批量模式下）
  whenever(() => keys['Ctrl+A'].value || keys['Meta+A'].value, (v) => {
    if (v && bookmarkStore.batchMode) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        bookmarkStore.selectAll()
      }
    }
  })

  // Ctrl+Shift+A: 取消选择（仅在批量模式下）
  whenever(() => (keys['Ctrl+Shift+A'].value || keys['Meta+Shift+A'].value), (v) => {
    if (v && bookmarkStore.batchMode) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        bookmarkStore.clearBookmarkSelection()
      }
    }
  })

  // Escape: 关闭弹窗或清空搜索
  whenever(keys.Escape, (v) => {
    if (v) {
      emitShortcutEvent('escape')
    }
  })

  // ?: 显示快捷键帮助（Shift+/）
  whenever(() => keys.Shift.value && keys['/'].value, (v) => {
    if (v) {
      const event = window.event as KeyboardEvent | undefined
      if (event && !shouldPreventShortcut(event)) {
        event.preventDefault()
        emitShortcutEvent('show-shortcuts')
      }
    }
  })
}
