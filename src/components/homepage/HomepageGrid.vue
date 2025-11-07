<template>
  <div class="homepage-container">
    <!-- 空状态 -->
    <n-empty
      v-if="homepageStore.isEmpty"
      :description="emptyDescription"
      class="homepage-empty"
    >
      <template #icon>
        <n-icon
          :size="64"
          :component="GridOutline"
        />
      </template>
    </n-empty>

    <!-- 主页内容 -->
    <div v-else class="homepage-content">
      <!-- 主页标题栏 -->
      <div class="homepage-header">
        <h2>我的主页</h2>
        <sort-selector view-type="homepage" />
      </div>

      <!-- 网格布局 -->
      <draggable
        v-model="homepageStore.items"
        class="homepage-grid"
        :style="gridStyle"
        :group="{ name: 'homepage', pull: false, put: false }"
        item-key="bookmarkId"
        :animation="200"
        ghost-class="sortable-ghost"
        chosen-class="sortable-chosen"
        drag-class="sortable-drag"
        @add="handleDragAdd"
        @update="handleDragUpdate"
        @start="homepageStore.dragging = true"
        @end="homepageStore.dragging = false"
      >
        <template #item="{ element }">
          <div class="homepage-bookmark-item">
            <BookmarkCard
              v-if="getBookmark(element.bookmarkId)"
              :bookmark="getBookmark(element.bookmarkId)!"
              @edit="handleEdit"
              @delete="handleDelete"
              @detail="handleDetail"
              @add-to-homepage="handleAddToHomepage"
            />
          </div>
        </template>
      </draggable>
    </div>

    <!-- 书签详情模态框 -->
    <bookmark-detail-modal
      v-if="detailBookmark"
      v-model:show="showDetail"
      :bookmark="detailBookmark"
      @edit="handleEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHomepageStore } from '@/stores/homepage'
import { useBookmarkStore } from '@/stores/bookmark'
import { useConfigStore } from '@/stores/config'
import draggable from 'vuedraggable'
import BookmarkCard from '../bookmark/BookmarkCard.vue'
import BookmarkDetailModal from '../bookmark/BookmarkDetailModal.vue'
import SortSelector from '../common/SortSelector.vue'
import { NEmpty, NIcon } from 'naive-ui'
import { GridOutline } from '@vicons/ionicons5'
import type { Bookmark } from '@/types/bookmark'

const homepageStore = useHomepageStore()
const bookmarkStore = useBookmarkStore()
const configStore = useConfigStore()

const showDetail = ref(false)
const detailBookmark = ref<Bookmark | null>(null)

/**
 * 空状态描述文案
 */
const emptyDescription = computed(() => {
  return homepageStore.config.showEmptyGuide
    ? '点击书签卡片上的"添加到主页"按钮开始自定义主页'
    : '主页为空'
})

/**
 * 网格样式（动态列数 - 使用全局配置）
 */
const gridStyle = computed(() => ({
  '--grid-columns': configStore.config.gridColumns
}))

/**
 * 根据书签 ID 获取书签对象
 *
 * @param bookmarkId - 书签 ID
 * @returns 书签对象或 undefined
 */
function getBookmark(bookmarkId: string): Bookmark | undefined {
  return bookmarkStore.bookmarks.find((b) => b.id === bookmarkId)
}

/**
 * 处理从侧边栏拖入书签事件
 *
 * @param event - Sortable 拖拽添加事件
 */
async function handleDragAdd(event: any) {
  await homepageStore.handleDragAdd(event)
}

/**
 * 处理主页内部拖拽排序事件
 *
 * @param event - Sortable 拖拽更新事件
 */
async function handleDragUpdate(event: any) {
  await homepageStore.handleDragUpdate(event)
}

function handleEdit(bookmark: Bookmark) {
  const event = new CustomEvent('edit-bookmark', { detail: { bookmark } })
  document.dispatchEvent(event)
}

function handleDelete(bookmark: Bookmark) {
  bookmarkStore.deleteBookmark(bookmark.id)
}

async function handleAddToHomepage(bookmark: Bookmark) {
  await homepageStore.addBookmark(bookmark.id)
}

function handleDetail(bookmark: Bookmark) {
  detailBookmark.value = bookmark
  showDetail.value = true
}
</script>

<style scoped>
.homepage-container {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
  position: relative;
}

.homepage-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.homepage-content {
  width: 100%;
}

.homepage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--n-border-color);
}

.homepage-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--n-text-color);
}

.homepage-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 6), 1fr);
  gap: var(--card-spacing);
  width: 100%;
  /* 固定网格行高，避免拖拽时布局抖动 */
  grid-auto-rows: 140px;
}

.homepage-bookmark-item {
  position: relative;
  min-width: 0;
  /* 固定高度，避免拖拽时布局变化 */
  height: 140px;
}

/* 响应式断点 */
@media (max-width: 1200px) {
  .homepage-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 800px) {
  .homepage-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .homepage-container {
    padding: 16px;
  }

  .homepage-grid {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .homepage-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 拖拽视觉反馈样式 */
/* 拖拽占位符（原位置） - 优化后不显示，避免布局抖动 */
:deep(.sortable-ghost) {
  opacity: 0;
  /* 保持原始尺寸，避免其他元素移动 */
}

/* 被选中的元素 */
:deep(.sortable-chosen) {
  cursor: grabbing;
  /* 保持原始尺寸 */
  transform: none;
}

/* 拖拽中的元素 - 简化视觉效果，避免布局影响 */
:deep(.sortable-drag) {
  opacity: 0.8;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  cursor: grabbing;
  z-index: 9999;
  /* 不旋转，保持平滑体验 */
  transform: none;
}
</style>
