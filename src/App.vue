<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <n-loading-bar-provider>
          <app-layout />
          <ContextMenu
            :visible="contextMenuVisible"
            :x="contextMenuX"
            :y="contextMenuY"
            @close="closeContextMenu"
          />
        </n-loading-bar-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, NLoadingBarProvider, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import AppLayout from './components/layout/AppLayout.vue'
import ContextMenu from './components/common/ContextMenu.vue'
import { useConfigStore } from './stores/config'
import { useBookmarkStore } from './stores/bookmark'
import { useMessage } from 'naive-ui'

const configStore = useConfigStore()
const bookmarkStore = useBookmarkStore()
const message = useMessage()

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 主题配置
const theme = computed(() => {
  if (configStore.config.theme === 'dark') {
    return darkTheme
  }
  return null
})

// 初始化应用
onMounted(async () => {
  // 加载配置
  configStore.loadConfig()

  // 应用主题
  const themeValue = configStore.config.theme
  if (themeValue === 'auto') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', themeValue)
  }

  // 加载书签数据
  await bookmarkStore.loadBookmarks()

  // 监听全局事件
  setupGlobalListeners()
})

// 设置全局事件监听
function setupGlobalListeners() {
  // 右键菜单
  document.addEventListener('contextmenu', handleContextMenu)
  document.addEventListener('click', handleClick)

  // 快捷键
  document.addEventListener('keydown', handleKeydown)

  // 自定义事件
  document.addEventListener('add-bookmark', handleAddBookmark)
  document.addEventListener('add-bookmark-from-clipboard', handleAddBookmarkFromClipboard)
}

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('contextmenu', handleContextMenu)
  document.removeEventListener('click', handleClick)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('add-bookmark', handleAddBookmark)
  document.removeEventListener('add-bookmark-from-clipboard', handleAddBookmarkFromClipboard)
})

// 右键菜单处理
function handleContextMenu(e: MouseEvent) {
  // 防止在输入框、链接等元素上显示
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'A') {
    return
  }

  e.preventDefault()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

function handleClick() {
  contextMenuVisible.value = false
}

function closeContextMenu() {
  contextMenuVisible.value = false
}

// 快捷键处理
function handleKeydown(e: KeyboardEvent) {
  // Ctrl+D 添加书签
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault()
    handleAddBookmark()
  }
}

// 添加书签处理
function handleAddBookmark() {
  message.info('添加书签功能开发中...')
}

function handleAddBookmarkFromClipboard(e: any) {
  const { url } = e.detail
  message.info(`从剪贴板添加书签: ${url}`)
}
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
