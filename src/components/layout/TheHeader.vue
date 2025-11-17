<template>
  <div class="header-container">
    <!-- 搜索框区域 -->
    <div class="header-search">
      <search-box />
    </div>

    <!-- 中间操作按钮 -->
    <div class="header-center">
      <!-- 添加书签 -->
      <n-button
        type="primary"
        @click="showAddBookmark"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24"><path
              fill="currentColor"
              d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
            /></svg>
          </n-icon>
        </template>
        <span class="btn-text">添加书签</span>
      </n-button>
    </div>

    <!-- 右侧操作 -->
    <div class="header-actions">
      <!-- 回到主页按钮（仅在文件夹视图显示） -->
      <n-button
        v-if="bookmarkStore.viewMode === 'category'"
        secondary
        @click="goToHomepage"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"
              />
            </svg>
          </n-icon>
        </template>
        回到主页
      </n-button>

      <!-- 同步 Chrome 书签 -->
      <n-button
        v-if="isChromeExtension"
        secondary
        :loading="syncing"
        @click="handleSync"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"
              />
            </svg>
          </n-icon>
        </template>
        同步书签
      </n-button>

      <!-- 布局设置 -->
      <n-popover
        v-model:show="showGridSettings"
        trigger="click"
        placement="bottom-end"
        :show-arrow="true"
      >
        <template #trigger>
          <n-button
            quaternary
            circle
            title="布局设置"
          >
            <template #icon>
              <n-icon size="20">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3"
                  />
                </svg>
              </n-icon>
            </template>
          </n-button>
        </template>
        <GridSettingsPanel />
      </n-popover>

      <!-- 主题切换 -->
      <n-button
        quaternary
        circle
        title="切换主题"
        @click="toggleTheme"
      >
        <template #icon>
          <n-icon size="20">
            <svg
              v-if="isDark"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"
              />
            </svg>
          </n-icon>
        </template>
      </n-button>

      <!-- 设置 -->
      <n-button
        quaternary
        circle
        title="设置"
        @click="showSettings = true"
      >
        <template #icon>
          <n-icon size="20">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z"
              />
            </svg>
          </n-icon>
        </template>
      </n-button>
    </div>

    <!-- 添加书签对话框 -->
    <bookmark-form-modal v-model:show="showModal" />

    <!-- 设置对话框 -->
    <settings v-model:show="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NPopover, useMessage } from 'naive-ui'
import { useConfigStore } from '@/stores/config'
import { useBookmarkStore } from '@/stores/bookmark'
import SearchBox from '../common/SearchBox.vue'
import BookmarkFormModal from '../bookmark/BookmarkFormModal.vue'
import Settings from '@/views/Settings.vue'
import GridSettingsPanel from '../homepage/GridSettingsPanel.vue'
import { syncChromeBookmarks } from '@/services/chrome-sync'

const configStore = useConfigStore()
const bookmarkStore = useBookmarkStore()
const message = useMessage()

const showModal = ref(false)
const showSettings = ref(false)
const syncing = ref(false)

const isChromeExtension = computed(() => {
  return typeof chrome !== 'undefined' && chrome.bookmarks !== undefined
})

async function handleSync() {
  syncing.value = true
  try {
    const result = await syncChromeBookmarks()
    await bookmarkStore.loadBookmarks()
    message.success(`同步完成：新增 ${result.added} 个，跳过 ${result.skipped} 个`)
  } catch (error) {
    message.error('同步失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    syncing.value = false
  }
}
const showGridSettings = ref(false)

// 事件处理函数
function handleShowAddBookmark() {
  showModal.value = true
}

// 监听快捷键事件
onMounted(() => {
  document.addEventListener('show-add-bookmark', handleShowAddBookmark)
})

onUnmounted(() => {
  document.removeEventListener('show-add-bookmark', handleShowAddBookmark)
})

const isDark = computed(() => {
  const theme = configStore.config.theme
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
})

async function toggleTheme() {
  const currentTheme = configStore.config.theme
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  await configStore.setTheme(newTheme)
}

function showAddBookmark() {
  showModal.value = true
}

function goToHomepage() {
  // 切换到主页视图
  bookmarkStore.setViewMode('homepage')
  bookmarkStore.selectCategory('homepage')
}
</script>

<style scoped>
.header-container {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
}

.header-search {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0; /* 允许收缩 */
}

.header-center {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 响应式：平板 */
@media (max-width: 1024px) {
  .header-container {
    grid-template-columns: 1fr auto;
    gap: 12px;
  }

  .header-search {
    grid-column: 1 / -1;
    order: -1;
  }

  .header-center {
    justify-content: flex-start;
  }

  .header-actions {
    justify-content: flex-end;
  }
}

/* 响应式：手机 */
@media (max-width: 768px) {
  .header-container {
    gap: 8px;
  }

  .header-center .btn-text {
    display: none;
  }

  .header-actions :deep(.n-button__content) {
    display: none;
  }
}

@media (max-width: 480px) {
  .header-actions {
    gap: 4px;
  }
}
</style>
