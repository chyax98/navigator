<template>
  <div
    class="category-section"
    :class="`level-${level}`"
  >
    <!-- 子分类标题（类似 Markdown ## 标题） -->
    <div class="section-header">
      <component
        :is="headerTag"
        class="section-title"
      >
        <!-- 图标 -->
        <n-icon
          v-if="iconComponent"
          :size="iconSize"
          :component="iconComponent"
          class="section-icon-new"
        />
        <span
          v-else-if="isEmoji"
          class="section-icon"
          :style="{ fontSize: iconSize + 'px' }"
        >{{ category.icon }}</span>

        <span class="section-name">{{ category.name }}</span>
        <span class="section-count">{{ totalBookmarkCount }}</span>
      </component>
    </div>

    <!-- 当前分类的直接书签 -->
    <bookmark-grid
      v-if="directBookmarks.length > 0"
      :bookmarks="directBookmarks"
      :active-category-id="category.id"
      :style="gridStyle"
      class="section-bookmarks"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @add-to-homepage="$emit('add-to-homepage', $event)"
    />

    <!-- 递归展示子分类 -->
    <div
      v-if="childCategories.length > 0"
      class="subsections"
    >
      <CategorySection
        v-for="child in childCategories"
        :key="child.id"
        :category="child"
        :level="level + 1"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @add-to-homepage="$emit('add-to-homepage', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import BookmarkGrid from '../bookmark/BookmarkGrid.vue'
import { useBookmarkStore } from '@/stores/bookmark'
import { useConfigStore } from '@/stores/config'
import type { Bookmark, Category } from '@/types/bookmark'
import { getIconComponent, isEmojiFormat } from '@/utils/categoryIcon'

interface Props {
  category: Category
  level: number // 层级深度，用于控制标题大小
}

const props = defineProps<Props>()

defineEmits<{
  edit: [bookmark: Bookmark]
  delete: [bookmark: Bookmark]
  'add-to-homepage': [bookmark: Bookmark]
}>()

const bookmarkStore = useBookmarkStore()
const configStore = useConfigStore()

// 获取直接属于当前分类的书签
const directBookmarks = computed<Bookmark[]>(() => {
  return bookmarkStore.bookmarks.filter(b => b.categoryId === props.category.id)
})

// 获取子分类
const childCategories = computed<Category[]>(() => {
  return bookmarkStore.categories.filter(c => c.parentId === props.category.id)
})

// 总书签数（递归统计）
const totalBookmarkCount = computed(() => {
  return bookmarkStore.getCategoryBookmarks(props.category.id).length
})

// 根据层级确定标题标签（h3-h6）
const headerTag = computed(() => {
  const level = Math.min(props.level + 2, 6) // h3, h4, h5, h6
  return `h${level}`
})

// 根据层级确定图标大小
const iconSize = computed(() => {
  const sizes = [24, 20, 18, 16]
  return sizes[Math.min(props.level - 1, sizes.length - 1)]
})

// 图标显示
const iconComponent = computed(() => getIconComponent(props.category.icon))
const isEmoji = computed(() => isEmojiFormat(props.category.icon))

// 网格样式（使用全局列数配置）
const gridStyle = computed(() => ({
  '--grid-columns': configStore.config.gridColumns
}))
</script>

<style scoped>
.category-section {
  margin-bottom: 32px;
}

.section-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--n-border-color);
  opacity: 0.9;
}

.section-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--n-text-color);
  transition: color 0.2s;
}

.section-title:hover {
  color: var(--primary-color);
}

/* 层级 1: h3 */
.level-1 .section-title {
  font-size: 22px;
}

.level-1 .section-header {
  border-bottom-width: 2px;
}

/* 层级 2: h4 */
.level-2 .section-title {
  font-size: 20px;
}

/* 层级 3+: h5, h6 */
.level-3 .section-title,
.level-4 .section-title,
.level-5 .section-title {
  font-size: 18px;
}

.section-icon {
  line-height: 1;
}

.section-icon-new {
  color: var(--primary-color);
}

.section-name {
  flex: 1;
  min-width: 0; /* 允许文本截断 */
}

.section-count {
  font-size: 14px;
  opacity: 0.6;
  font-weight: normal;
  background: var(--n-action-color);
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
}

.section-bookmarks {
  margin-bottom: 24px;
}

.subsections {
  margin-left: 16px;
  margin-top: 24px;
  padding-left: 16px;
  border-left: 2px solid var(--n-border-color);
}

/* 层级缩进 */
.level-2 .subsections {
  margin-left: 12px;
  padding-left: 12px;
  border-left-width: 1px;
}

.level-3 .subsections,
.level-4 .subsections,
.level-5 .subsections {
  margin-left: 8px;
  padding-left: 8px;
  border-left-style: dashed;
}

/* 响应式 */
@media (max-width: 800px) {
  .category-section {
    margin-bottom: 24px;
  }

  .level-1 .section-title {
    font-size: 20px;
  }

  .level-2 .section-title {
    font-size: 18px;
  }

  .level-3 .section-title,
  .level-4 .section-title,
  .level-5 .section-title {
    font-size: 16px;
  }

  .subsections {
    margin-left: 8px;
    padding-left: 8px;
  }

  .level-2 .subsections,
  .level-3 .subsections,
  .level-4 .subsections,
  .level-5 .subsections {
    margin-left: 4px;
    padding-left: 4px;
  }
}
</style>
