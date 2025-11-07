<template>
  <div class="category-bookmark-grid">
    <!-- 分类标题 -->
    <div
      v-if="category"
      class="category-header"
    >
      <div class="category-title">
        <!-- 新图标格式 -->
        <n-icon
          v-if="iconComponent"
          :size="32"
          :component="iconComponent"
          class="category-icon-new"
        />
        <!-- 旧 emoji 格式 -->
        <span
          v-else-if="isEmoji"
          class="category-icon"
        >{{ category.icon }}</span>
        <h2>{{ category.name }}</h2>
      </div>
      <div class="category-meta">
        <span class="bookmark-count">{{ totalBookmarkCount }} 个书签</span>
        <sort-selector view-type="category" />
      </div>
    </div>

    <!-- 分层展示内容 -->
    <div
      v-if="hasContent"
      class="category-content"
    >
      <!-- 当前分类的直接书签 -->
      <bookmark-grid
        v-if="directBookmarks.length > 0"
        :bookmarks="directBookmarks"
        :active-category-id="bookmarkStore.selectedCategoryId"
        :style="gridStyle"
        @edit="handleEdit"
        @delete="handleDelete"
        @add-to-homepage="handleAddToHomepage"
      />

      <!-- 子分类及其书签（递归展示） -->
      <div
        v-for="child in childCategories"
        :key="child.id"
        class="subcategory-section"
      >
        <CategorySection
          :category="child"
          :level="1"
          @edit="handleEdit"
          @delete="handleDelete"
          @add-to-homepage="handleAddToHomepage"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="empty-state"
    >
      <n-empty description="此文件夹暂无书签">
        <template #icon>
          <n-icon :size="64">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
              />
            </svg>
          </n-icon>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NEmpty, NIcon } from 'naive-ui'
import BookmarkGrid from '../bookmark/BookmarkGrid.vue'
import CategorySection from './CategorySection.vue'
import SortSelector from '../common/SortSelector.vue'
import { useBookmarkStore } from '@/stores/bookmark'
import { useHomepageStore } from '@/stores/homepage'
import { useConfigStore } from '@/stores/config'
import type { Bookmark, Category } from '@/types/bookmark'
import { getIconComponent, isEmojiFormat } from '@/utils/categoryIcon'

const bookmarkStore = useBookmarkStore()
const homepageStore = useHomepageStore()
const configStore = useConfigStore()

// 获取当前选中的分类
const category = computed<Category | undefined>(() => {
  return bookmarkStore.categories.find(c => c.id === bookmarkStore.selectedCategoryId)
})

// 获取直接属于当前分类的书签（不包括子分类）
const directBookmarks = computed<Bookmark[]>(() => {
  if (!bookmarkStore.selectedCategoryId) return []
  return bookmarkStore.bookmarks.filter(b => b.categoryId === bookmarkStore.selectedCategoryId)
})

// 获取当前分类的子分类
const childCategories = computed<Category[]>(() => {
  if (!bookmarkStore.selectedCategoryId) return []
  return bookmarkStore.categories.filter(c => c.parentId === bookmarkStore.selectedCategoryId)
})

// 总书签数（包括子分类）
const totalBookmarkCount = computed(() => {
  if (!bookmarkStore.selectedCategoryId) return 0
  return bookmarkStore.getCategoryBookmarks(bookmarkStore.selectedCategoryId).length
})

// 是否有内容（直接书签或子分类）
const hasContent = computed(() => {
  return directBookmarks.value.length > 0 || childCategories.value.length > 0
})

// 图标显示
const iconComponent = computed(() => category.value ? getIconComponent(category.value.icon) : null)
const isEmoji = computed(() => category.value ? isEmojiFormat(category.value.icon) : false)

// 网格样式（使用全局列数配置）
const gridStyle = computed(() => ({
  '--grid-columns': configStore.config.gridColumns
}))

// 处理书签操作
function handleEdit(bookmark: Bookmark) {
  // 触发编辑事件
  const event = new CustomEvent('edit-bookmark', { detail: { bookmark } })
  document.dispatchEvent(event)
}

function handleDelete(bookmark: Bookmark) {
  bookmarkStore.deleteBookmark(bookmark.id)
}

async function handleAddToHomepage(bookmark: Bookmark) {
  await homepageStore.addBookmark(bookmark.id)
}
</script>

<style scoped>
.category-bookmark-grid {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
}

.category-header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--n-border-color);
}

.category-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.category-icon {
  font-size: 32px;
  line-height: 1;
}

.category-icon-new {
  color: var(--primary-color);
}

.category-title h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--n-text-color);
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--n-text-color-3);
  font-size: 14px;
}

.bookmark-count {
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subcategory-section {
  margin-top: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* 响应式断点 */
@media (max-width: 800px) {
  .category-bookmark-grid {
    padding: 16px;
  }

  .category-title h2 {
    font-size: 24px;
  }

  .category-header {
    margin-bottom: 24px;
  }

  .subcategory-section {
    margin-top: 12px;
  }
}
</style>
