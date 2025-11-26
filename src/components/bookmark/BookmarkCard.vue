<template>
  <n-tooltip
    placement="top"
    :show-arrow="true"
  >
    <template #trigger>
      <div
        class="bookmark-card"
        :class="{
          'batch-mode': bookmarkStore.batchMode,
          'selected': bookmarkStore.batchMode && isSelected
        }"
        @click="handleCardClick"
      >
        <!-- 批量选择复选框 -->
        <n-checkbox
          v-if="bookmarkStore.batchMode"
          :checked="isSelected"
          class="selection-checkbox"
          @click.stop="handleToggleSelection"
        />

        <div class="card-top">
          <div class="card-favicon">
            <img
              :src="faviconUrl"
              :alt="bookmark.title"
              @error="handleError"
            >
          </div>
          <div class="card-header">
            <div class="card-title">
              {{ bookmark.title }}
            </div>
          </div>
          <div
            class="card-toolbar"
            @click.stop
          >
            <n-dropdown
              trigger="hover"
              :options="actionOptions"
              @select="handleActionSelect"
            >
              <n-button
                quaternary
                circle
                size="small"
              >
                <template #icon>
                  <n-icon size="18">
                    <svg viewBox="0 0 24 24"><path
                      fill="currentColor"
                      d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"
                    /></svg>
                  </n-icon>
                </template>
              </n-button>
            </n-dropdown>
          </div>
        </div>

        <div class="card-url-block">
          <n-text
            depth="3"
            class="url-label"
          >
            链接
          </n-text>
          <div class="url-content">
            {{ bookmark.url }}
          </div>
        </div>
      </div>
    </template>
    <template #default>
      <div style="max-width: 400px;">
        <div style="font-weight: 600; margin-bottom: 4px;">
          {{ bookmark.title }}
        </div>
        <div
          v-if="bookmark.description"
          style="font-size: 12px; color: rgba(255, 255, 255, 0.7); line-height: 1.4;"
        >
          {{ bookmark.description }}
        </div>
      </div>
    </template>
  </n-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NDropdown, NIcon, NTooltip, NCheckbox, NText, useMessage } from 'naive-ui'
import type { Bookmark } from '@/types/bookmark'
import { useBookmarkStore } from '@/stores/bookmark'
import { useHomepageStore } from '@/stores/homepage'
import { useFavicon } from '@/composables/useFavicon'

interface Props {
  bookmark: Bookmark
}

const props = defineProps<Props>()
const message = useMessage()
const bookmarkStore = useBookmarkStore()
const homepageStore = useHomepageStore()

// 使用 favicon 缓存
const { faviconUrl, handleError } = useFavicon(props.bookmark.url, props.bookmark.favicon)

const emit = defineEmits<{
  edit: [bookmark: Bookmark]
  delete: [bookmark: Bookmark]
  detail: [bookmark: Bookmark]
  'add-to-homepage': [bookmark: Bookmark]
  'toggle-pin': [bookmark: Bookmark]
}>()

// 检查书签是否已在主页
const isInHomepage = computed(() => {
  return homepageStore.hasBookmark(props.bookmark.id)
})

// 检查书签是否被选中
const isSelected = computed(() => {
  return bookmarkStore.isBookmarkSelected(props.bookmark.id)
})

const actionOptions = computed(() => [
  { key: 'open-new-tab', label: '新标签打开' },
  { key: 'copy-link', label: '复制链接' },
  { key: 'toggle-homepage', label: isInHomepage.value ? '从主页移除' : '添加到主页' },
  { type: 'divider', key: 'd1' },
  { key: 'detail', label: '查看详情' },
  { key: 'edit', label: '编辑书签' },
  { key: 'delete', label: '删除书签' }
])

// 处理卡片点击
function handleCardClick() {
  if (bookmarkStore.batchMode) {
    handleToggleSelection()
  } else {
    handleOpen()
  }
}

// 处理批量选择切换
function handleToggleSelection() {
  bookmarkStore.toggleBookmarkSelection(props.bookmark.id)
}

async function handleOpen() {
  // 更新访问统计
  await updateVisitStats()
  window.open(props.bookmark.url, '_blank')
}

async function handleOpenNewTab() {
  // 更新访问统计
  await updateVisitStats()
  window.open(props.bookmark.url, '_blank', 'noopener')
}

// 更新访问统计
async function updateVisitStats() {
  try {
    await bookmarkStore.updateBookmark(props.bookmark.id, {
      clickCount: (props.bookmark.clickCount || 0) + 1,
      lastVisited: new Date()
    })
  } catch (error) {
    console.error('更新访问统计失败:', error)
  }
}

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(props.bookmark.url)
    message.success('链接已复制')
  } catch (error) {
    console.error(error)
    message.error('复制失败')
  }
}

function handleActionSelect(key: string) {
  switch (key) {
    case 'open-new-tab':
      handleOpenNewTab()
      break
    case 'copy-link':
      handleCopyLink()
      break
    case 'toggle-homepage':
      handleAddToHomepage()
      break
    case 'detail':
      emit('detail', props.bookmark)
      break
    case 'edit':
      emit('edit', props.bookmark)
      break
    case 'delete':
      emit('delete', props.bookmark)
      break
  }
}

async function handleAddToHomepage() {
  try {
    if (isInHomepage.value) {
      // 从主页移除
      await homepageStore.removeBookmark(props.bookmark.id)
      message.success('已从主页移除')
    } else {
      // 添加到主页
      await homepageStore.addBookmark(props.bookmark.id)
      message.success('已添加到主页')
    }
  } catch (error) {
    message.error('操作失败：' + (error as Error).message)
  }
}

// handleImageError 已移至 useFavicon composable
</script>

<style scoped>
.bookmark-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-base);
  backdrop-filter: blur(12px);
  height: 140px;
  min-width: 0;
  overflow: hidden;
  word-break: break-all;
  box-shadow: var(--shadow-sm);
}

.bookmark-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--n-primary-color);
}

.card-top {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.card-favicon img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.card-header {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.card-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.card-url-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;
}

.url-label {
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.url-content {
  font-size: 11px;
  color: var(--n-text-color-2);
  line-height: 1.4;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  .bookmark-card {
    padding: 14px;
    gap: 10px;
  }

  .card-top {
    align-items: flex-start;
  }

  .card-toolbar {
    gap: 4px;
  }
}

/* 批量模式样式 */
.bookmark-card.batch-mode {
  cursor: pointer;
  user-select: none;
}

.bookmark-card.selected {
  border: 2px solid var(--n-primary-color);
  background: var(--n-primary-color-hover);
  box-shadow: 0 4px 12px var(--n-primary-color-pressed);
}

.selection-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: var(--n-color);
  border-radius: 4px;
  padding: 2px;
}
</style>
