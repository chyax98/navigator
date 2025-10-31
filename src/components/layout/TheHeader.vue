<template>
  <div class="header-container">
    <!-- Logo -->
    <div class="header-logo">
      <n-icon size="32" color="#18a058">
        <svg viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z"/>
        </svg>
      </n-icon>
      <span class="header-title">Navigator</span>
    </div>

    <!-- 搜索框 -->
    <div class="header-search">
      <search-box />
    </div>

    <!-- 右侧操作 -->
    <div class="header-actions">
      <!-- 主题切换 -->
      <n-button quaternary circle @click="toggleTheme">
        <template #icon>
          <n-icon size="20">
            <svg v-if="isDark" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"/>
            </svg>
          </n-icon>
        </template>
      </n-button>

      <!-- 添加书签 -->
      <n-button type="primary" @click="showAddBookmark">
        <template #icon>
          <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></n-icon>
        </template>
        添加书签
      </n-button>

      <!-- 更多操作 -->
      <n-dropdown :options="menuOptions" @select="handleMenuSelect">
        <n-button quaternary circle>
          <template #icon>
            <n-icon size="20">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </n-dropdown>
    </div>

    <!-- 添加书签对话框 -->
    <bookmark-form-modal v-model:show="showModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, NDropdown } from 'naive-ui'
import { useConfigStore } from '@/stores/config'
import SearchBox from '../common/SearchBox.vue'
import BookmarkFormModal from '../bookmark/BookmarkFormModal.vue'

const router = useRouter()
const configStore = useConfigStore()

const showModal = ref(false)

const isDark = computed(() => {
  const theme = configStore.config.theme
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
})

const menuOptions = [
  {
    label: '导入书签',
    key: 'import',
    icon: () => '📥'
  },
  {
    label: '导出书签',
    key: 'export',
    icon: () => '📤'
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: '设置',
    key: 'settings',
    icon: () => '⚙️'
  }
]

function toggleTheme() {
  const currentTheme = configStore.config.theme
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  configStore.setTheme(newTheme)
}

function showAddBookmark() {
  showModal.value = true
}

function handleMenuSelect(key: string) {
  switch (key) {
    case 'import':
      router.push('/import')
      break
    case 'export':
      // 导出功能将在后续实现
      console.log('Export bookmarks')
      break
    case 'settings':
      router.push('/settings')
      break
  }
}
</script>

<style scoped>
.header-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--n-text-color);
}

.header-search {
  flex: 1;
  max-width: 600px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
</style>
