<template>
  <div
    class="category-tree"
    :class="{ collapsed: isCollapsed }"
  >
    <!-- 主页入口 -->
    <n-tooltip
      :disabled="!isCollapsed"
      placement="right"
    >
      <template #trigger>
        <div
          class="category-item home-item"
          :class="{ selected: bookmarkStore.viewMode === 'homepage' }"
          @click="goToHomepage"
        >
          <n-icon class="category-icon">
            <svg viewBox="0 0 24 24"><path
              fill="currentColor"
              d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"
            /></svg>
          </n-icon>
          <span
            v-if="!isCollapsed"
            class="category-name"
          >主页</span>
          <span
            v-if="!isCollapsed"
            class="category-count"
          >{{ homepageBookmarkCount }}</span>
        </div>
      </template>
      主页 ({{ homepageBookmarkCount }})
    </n-tooltip>

    <!-- 分隔线 -->
    <n-divider v-if="!isCollapsed" />

    <!-- 紧凑模式：显示第一层分类图标和名称（4字+省略号） -->
    <template v-if="isCollapsed">
      <n-tooltip
        v-for="category in categoryTree"
        :key="category.id"
        placement="right"
      >
        <template #trigger>
          <div
            class="category-item compact-item"
            :class="{ selected: bookmarkStore.selectedCategoryId === category.id }"
            @click="selectCategory(category.id)"
          >
            <n-icon
              class="category-icon"
              :color="category.color"
            >
              <svg viewBox="0 0 24 24"><path
                fill="currentColor"
                d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
              /></svg>
            </n-icon>
            <span class="compact-name">{{ truncateText(category.name) }}</span>
          </div>
        </template>
        {{ category.name }} ({{ bookmarkStore.getCategoryBookmarks(category.id).length }})
      </n-tooltip>
    </template>

    <!-- 完整模式：显示完整分类树 -->
    <draggable
      v-else
      :model-value="categoryTree"
      item-key="id"
      :class="['category-draggable-root', { 'category-drop-active': isRootCategoryDropTarget }]"
      :group="categoriesGroup"
      ghost-class="category-ghost"
      drag-class="category-dragging"
      chosen-class="category-chosen"
      fallback-class="category-fallback"
      :animation="150"
      :delay="50"
      :delay-on-touch-only="true"
      :scroll="true"
      :scroll-sensitivity="80"
      :scroll-speed="15"
      :force-fallback="false"
      :move="handleRootMove"
      @start="handleRootDragStart"
      @end="handleDragEnd"
      @change="handleRootChange"
    >
      <template #item="{ element }">
        <div
          class="category-tree-node"
          :data-category-id="element.id"
        >
          <CategoryNode
            :category="element"
            :selected-category-id="bookmarkStore.selectedCategoryId"
            :level="0"
            @select="selectCategory"
            @toggle="toggleCategory"
          />
        </div>
      </template>
      <template #footer>
        <div
          v-if="!categoryTree.length"
          class="category-drop-placeholder"
        >
          拖拽分类到此处
        </div>
      </template>
    </draggable>

    <div
      v-if="!isCollapsed"
      class="add-category"
    >
      <n-button
        text
        @click="handleAddCategory"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24"><path
              fill="currentColor"
              d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
            /></svg>
          </n-icon>
        </template>
        添加分类
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NButton, NTooltip, NDivider } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useBookmarkStore } from '@/stores/bookmark'
import { useHomepageStore } from '@/stores/homepage'
import type { Category } from '@/types/bookmark'
import CategoryNode from './CategoryNode.vue'
import Draggable from 'vuedraggable'
import type { SortableEvent, MoveEvent } from 'sortablejs'

interface Props {
  isCollapsed?: boolean
}

defineProps<Props>()

type DraggableMoveEvent = MoveEvent & {
  draggedContext?: {
    element?: {
      id?: string
    }
  }
  relatedContext?: {
    index?: number | null
  }
}

const bookmarkStore = useBookmarkStore()
const homepageStore = useHomepageStore()
const { categoryDragState } = storeToRefs(bookmarkStore)
const categoryTree = computed(() => bookmarkStore.categoryTree)
const categoriesGroup = { name: 'categories', pull: true, put: true }
const isRootCategoryDropTarget = computed(() => {
  if (!categoryDragState?.value?.draggedCategoryId) {
    return false
  }
  if (categoryDragState.value.dropParentId !== null) {
    return false
  }
  return categoryDragState.value.indicatorPosition === 'inside' || !categoryDragState.value.indicatorCategoryId
})

// 主页书签数量（来自 homepageStore）
const homepageBookmarkCount = computed(() => {
  return homepageStore.items.length
})

// 文本截断函数：4个字+省略号
function truncateText(text: string, maxLength: number = 4): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

function goToHomepage() {
  bookmarkStore.setViewMode('homepage')
  bookmarkStore.selectCategory('homepage')
}

function selectCategory(categoryId: string) {
  bookmarkStore.setViewMode('category')
  bookmarkStore.selectCategory(categoryId)
}

function toggleCategory(categoryId: string) {
  bookmarkStore.toggleCategoryExpand(categoryId)
}

function getCategoryIdFromEvent(event: SortableEvent) {
  const element = event?.item as HTMLElement | null
  return element?.dataset?.categoryId ?? null
}

function handleRootDragStart(event: SortableEvent) {
  const categoryId = getCategoryIdFromEvent(event)
  if (categoryId) {
    bookmarkStore.beginCategoryDrag(categoryId)
  }
}

function handleDragEnd() {
  bookmarkStore.updateCategoryDragTarget(null, null, null, null)
  bookmarkStore.endCategoryDrag()
}

async function handleDragChange(event: any, parentId: string | null) {
  const added = event.added
  const moved = event.moved
  const payload = added ?? moved

  if (!payload?.element) {
    return
  }

  const targetIndex = payload.newIndex
  if (targetIndex === undefined || targetIndex === null) {
    return
  }

  bookmarkStore.updateCategoryDragTarget(parentId, targetIndex, null, null)
  await bookmarkStore.moveCategory(payload.element.id, parentId, targetIndex)
}

async function handleRootChange(event: any) {
  await handleDragChange(event, null)
}

function handleRootMove(event: DraggableMoveEvent) {
  return handleMove(event, null)
}

function handleMove(event: DraggableMoveEvent, parentId: string | null) {
  const draggedId = event.draggedContext?.element?.id
  if (!draggedId) {
    return true
  }

  const allowed = bookmarkStore.canMoveCategory(draggedId, parentId)
  if (!allowed) {
    return false
  }

  const nextIndex = event.relatedContext?.index ?? null
  const relatedElement = (event.relatedContext as any)?.element as Category | undefined
  const targetList = (event.relatedContext as any)?.list as Category[] | undefined

  let indicatorCategoryId: string | null = null
  let indicatorPosition: 'before' | 'after' | 'inside' | null = null

  if (relatedElement?.id) {
    indicatorCategoryId = relatedElement.id
    indicatorPosition = 'before'
  } else if (targetList && targetList.length > 0) {
    const last = targetList[targetList.length - 1]
    if (last) {
      indicatorCategoryId = last.id
      indicatorPosition = 'after'
    }
  } else {
    indicatorCategoryId = parentId
    indicatorPosition = 'inside'
  }

  bookmarkStore.updateCategoryDragTarget(parentId, nextIndex, indicatorCategoryId, indicatorPosition)
  return true
}

function handleAddCategory() {
  // 触发添加分类事件，由 AppContent 处理
  document.dispatchEvent(new CustomEvent('add-category'))
}
</script>

<style scoped>
.category-tree {
  padding: 8px 0;
}

.category-tree.collapsed {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: all 0.2s;
  margin: 2px 8px;
}

.category-item:hover {
  background: var(--n-action-color);
}

.category-item.selected {
  background: var(--sidebar-item-active);
  color: var(--sidebar-text-active);
}

.category-item.is-drop-target {
  background: var(--drag-indicator-bg);
  border-left: 3px solid var(--drag-indicator-color);
}

.category-tree.collapsed .category-item {
  margin: 4px 0;
  padding: 8px 6px;
  width: 100%;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.category-tree.collapsed .compact-item {
  border-radius: 12px;
}

.compact-name {
  font-size: 11px;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  display: block;
  word-break: keep-all;
}

.category-draggable-root {
  display: block;
}

.category-draggable-root.category-drop-active {
  background: var(--drag-indicator-bg);
  border-radius: var(--border-radius);
  border-left: 3px solid var(--drag-indicator-color);
}

.category-tree-node {
  margin-bottom: 2px;
}

.category-ghost {
  opacity: 0.4 !important;
  background: var(--drag-indicator-bg) !important;
  border: 2px dashed var(--drag-indicator-color) !important;
}

.category-dragging {
  opacity: 0.8 !important;
  cursor: grabbing !important;
}

.category-chosen {
  background: var(--sidebar-item-hover) !important;
  cursor: grabbing !important;
}

.category-fallback {
  opacity: 0.5 !important;
  background: var(--drag-indicator-bg) !important;
}

.category-drop-placeholder {
  margin: 8px 16px;
  padding: 12px;
  border: 1.5px dashed var(--drag-indicator-border);
  border-radius: var(--border-radius-sm);
  color: var(--sidebar-text-secondary);
  background: var(--drag-indicator-bg);
  font-size: 12px;
  text-align: center;
}

.all-item {
  font-weight: 500;
}

.category-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: var(--font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 12px;
  opacity: 0.7;
  background: var(--n-color);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.category-item.selected .category-count {
  opacity: 1;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.15);
}

.add-category {
  padding: 8px 16px;
  margin-top: 8px;
}

.add-category .n-button {
  width: 100%;
  justify-content: flex-start;
}
</style>
