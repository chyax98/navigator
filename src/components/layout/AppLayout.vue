<template>
  <n-layout
    class="app-layout"
    has-sider
  >
    <!-- 侧边栏 -->
    <div
      class="app-sidebar"
      :class="{ collapsed: isCollapsed }"
      :style="{ width: isCollapsed ? '88px' : sidebarWidth + 'px' }"
    >
      <div class="sidebar-content">
        <the-sidebar :is-collapsed="isCollapsed" />

        <!-- 可拖动的调整大小手柄（仅展开时显示） -->
        <div
          v-if="!isCollapsed"
          class="sidebar-resize-handle"
          @mousedown="startResize"
          @dblclick="resetWidth"
        />

        <!-- 收起/展开按钮 -->
        <n-button
          quaternary
          circle
          size="small"
          :class="['sidebar-toggle-btn', { 'is-collapsed': isCollapsed }]"
          @click="toggleSidebar"
        >
          <template #icon>
            <n-icon size="18">
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  :d="isCollapsed ? 'M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z' : 'M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z'"
                />
              </svg>
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <n-layout class="main-layout">
      <!-- 顶部导航 -->
      <n-layout-header
        bordered
        class="app-header"
      >
        <the-header />
      </n-layout-header>

      <!-- 内容区域 -->
      <n-layout-content
        class="app-content"
        :native-scrollbar="false"
      >
        <router-view v-slot="{ Component }">
          <transition
            name="fade"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>

    <!-- 快捷键帮助面板 -->
    <shortcuts-help-modal />
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NLayout, NLayoutHeader, NLayoutContent, NButton, NIcon } from 'naive-ui'
import TheHeader from './TheHeader.vue'
import TheSidebar from './TheSidebar.vue'
import ShortcutsHelpModal from '@/components/shortcuts/ShortcutsHelpModal.vue'
import { useConfigStore } from '@/stores/config'
import { useShortcuts } from '@/composables/useShortcuts'

// 初始化快捷键系统
useShortcuts()

const configStore = useConfigStore()

// 侧边栏宽度配置
const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280

// 从配置中读取或使用默认宽度
const sidebarWidth = ref<number>(configStore.config.sidebarWidth ?? DEFAULT_WIDTH)

// 侧边栏收起状态
const isCollapsed = ref<boolean>(configStore.config.sidebarCollapsed ?? false)

// 调整大小状态
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)
let rafId: number | null = null

/**
 * 开始调整大小
 */
function startResize(event: MouseEvent) {
  isResizing.value = true
  startX.value = event.clientX
  startWidth.value = sidebarWidth.value

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)

  // 防止文本选择
  event.preventDefault()
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

/**
 * 处理调整大小（使用 RAF 节流优化性能）
 */
function handleResize(event: MouseEvent) {
  if (!isResizing.value) return

  // 取消上一帧
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }

  // 下一帧更新
  rafId = requestAnimationFrame(() => {
    const deltaX = event.clientX - startX.value
    const newWidth = startWidth.value + deltaX

    // 限制宽度范围
    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      sidebarWidth.value = newWidth
    }
  })
}

/**
 * 停止调整大小
 */
function stopResize() {
  if (!isResizing.value) return

  isResizing.value = false

  // 取消动画帧
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)

  // 恢复样式
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  // 保存宽度到配置
  configStore.updateConfig({ sidebarWidth: sidebarWidth.value })
}

/**
 * 双击重置宽度
 */
function resetWidth() {
  sidebarWidth.value = DEFAULT_WIDTH
  configStore.updateConfig({ sidebarWidth: DEFAULT_WIDTH })
}

/**
 * 切换侧边栏收起/展开
 */
function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
  configStore.updateConfig({ sidebarCollapsed: isCollapsed.value })
}

/**
 * 键盘快捷键：Ctrl+B 切换侧边栏
 */
function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
    event.preventDefault()
    toggleSidebar()
  }
}

// 添加键盘监听
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

// 清理事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
  background: var(--color-bg-0);
  display: flex;
}

.app-sidebar {
  position: relative;
  height: 100vh;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border-light);
  background: var(--color-bg-1);
  overflow: hidden;
  transition: width var(--transition-slow);
  box-shadow: var(--shadow-sm);
}

.app-sidebar.collapsed {
  border-right: none;
  box-shadow: none;
}

.sidebar-content {
  position: relative;
  height: 100%;
  width: 100%;
}

.sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px; /* 增加到 8px 提升可点击性 */
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  transition: background-color 0.2s ease;
  z-index: 100;
}

.sidebar-resize-handle:hover {
  background-color: rgba(24, 160, 88, 0.12);
}

.sidebar-resize-handle:active {
  background-color: var(--n-primary-color);
}

/* 收起/展开按钮 */
.sidebar-toggle-btn {
  position: absolute;
  top: 50%;
  right: 12px; /* 展开时：在右侧边缘 */
  transform: translateY(-50%);
  z-index: 101;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 收起状态：按钮在侧边栏中央 */
.app-sidebar.collapsed .sidebar-toggle-btn {
  right: 50%;
  transform: translate(50%, -50%);
}

.main-layout {
  flex: 1;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-lg);
  background-color: var(--color-bg-1);
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-content {
  padding: var(--spacing-lg);
  height: calc(100vh - 64px);
  overflow-y: auto;
}

/* 页面切换动画：slideInUp + fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
