<template>
  <div
    class="category-node"
    :data-category-id="category.id"
  >
    <div
      class="category-item"
      :class="{
        selected: isSelected,
        'has-children': hasChildren,
        'is-drop-target': isDropTarget || isCategoryDropTarget || isDropBefore || isDropAfter || isDropInside,
        'is-dragged': isCategoryDragged
      }"
      :style="{ paddingLeft: `${level * 20 + 16}px` }"
      @click="handleSelect"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <!-- 展开/折叠按钮 -->
      <n-icon
        v-if="hasChildren"
        class="expand-icon"
        @click.stop="handleToggle"
      >
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
          />
        </svg>
      </n-icon>
      <div
        v-else
        class="expand-spacer"
      />

      <!-- 文件夹图标 -->
      <n-icon
        class="category-folder-icon"
        size="16"
      >
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
          />
        </svg>
      </n-icon>

      <!-- 分类名称 -->
      <n-ellipsis
        class="category-name"
        :tooltip="{ placement: 'right', delay: 300 }"
      >
        {{ category.name }}
      </n-ellipsis>

      <!-- 书签数量 -->
      <span class="category-count">{{ bookmarkCount }}</span>

      <!-- 操作按钮 -->
      <div
        class="category-actions"
        @click.stop
      >
        <div class="category-order-buttons">
          <n-button
            text
            size="tiny"
            class="order-btn"
            :disabled="!canMoveUp"
            @click.stop="handleMoveUp"
          >
            <n-icon size="14">
              <svg viewBox="0 0 24 24"><path
                fill="currentColor"
                d="M7,14L12,9L17,14H7Z"
              /></svg>
            </n-icon>
          </n-button>
          <n-button
            text
            size="tiny"
            class="order-btn"
            :disabled="!canMoveDown"
            @click.stop="handleMoveDown"
          >
            <n-icon size="14">
              <svg viewBox="0 0 24 24"><path
                fill="currentColor"
                d="M7,10L12,15L17,10H7Z"
              /></svg>
            </n-icon>
          </n-button>
        </div>
        <n-dropdown
          trigger="hover"
          :options="actionOptions"
          :theme-overrides="dropdownThemeOverrides"
          @select="handleAction"
        >
          <n-button
            text
            size="small"
          >
            <n-icon size="14">
              <svg viewBox="0 0 24 24"><path
                fill="currentColor"
                d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"
              /></svg>
            </n-icon>
          </n-button>
        </n-dropdown>
      </div>
    </div>

    <!-- 子分类 -->
    <div
      v-if="showChildrenContainer"
      class="children"
    >
      <draggable
        :model-value="category.children ?? []"
        item-key="id"
        class="category-children-list"
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
        :move="handleChildMove"
        @start="handleChildDragStart"
        @end="handleDragEnd"
        @change="handleChildChange"
      >
        <template #item="{ element }">
          <CategoryNode
            v-if="category.isExpanded !== false"
            :category="element"
            :selected-category-id="selectedCategoryId"
            :level="level + 1"
            @select="$emit('select', $event)"
            @toggle="$emit('toggle', $event)"
          />
        </template>
        <template #footer>
          <div
            v-if="isDraggingCategory && !(category.children && category.children.length)"
            class="category-drop-placeholder"
          >
            拖拽到此处创建子分类
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { NIcon, NButton, NDropdown, NEllipsis, useMessage, useDialog } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Category } from '@/types/bookmark'
import Draggable from 'vuedraggable'
import type { SortableEvent, MoveEvent } from 'sortablejs'

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

interface Props {
  category: Category
  selectedCategoryId: string
  level: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [categoryId: string]
  toggle: [categoryId: string]
}>()

const bookmarkStore = useBookmarkStore()
const { dragState, categoryDragState } = storeToRefs(bookmarkStore)
const message = useMessage()
const dialog = useDialog()
const categoriesGroup = { name: 'categories', pull: true, put: true }
const dropdownThemeOverrides: GlobalThemeOverrides = {
  Dropdown: {
    optionTextColor: '#1f2937',
    optionTextColorHover: '#1a5fd0',
    optionTextColorActive: '#1a5fd0',
    optionTextColorPressed: '#1a5fd0',
    optionColorHover: 'rgba(32, 128, 240, 0.12)',
    optionColorActive: 'rgba(32, 128, 240, 0.16)'
  }
}

const hasChildren = computed(() => props.category.children && props.category.children.length > 0)
const bookmarkCount = computed(() => bookmarkStore.getCategoryBookmarks(props.category.id).length)
const isSelected = computed(() => props.selectedCategoryId === props.category.id)
const canAcceptDrop = computed(() => Boolean(dragState.value?.bookmarkIds?.length))
const isDropTarget = computed(() => dragState.value?.dropTargetCategoryId === props.category.id)
const isDraggingCategory = computed(() => Boolean(categoryDragState?.value?.draggedCategoryId))
const isCategoryDropTarget = computed(() => categoryDragState?.value?.dropParentId === props.category.id && categoryDragState.value?.indicatorPosition === 'inside')
const isCategoryDragged = computed(() => categoryDragState?.value?.draggedCategoryId === props.category.id)
const showChildrenContainer = computed(() => {
  if (isCategoryDropTarget.value) {
    return true
  }
  return props.category.isExpanded !== false
})
const isDropBefore = computed(() => categoryDragState?.value?.indicatorCategoryId === props.category.id && categoryDragState.value?.indicatorPosition === 'before')
const isDropAfter = computed(() => categoryDragState?.value?.indicatorCategoryId === props.category.id && categoryDragState.value?.indicatorPosition === 'after')
const isDropInside = computed(() => categoryDragState?.value?.indicatorPosition === 'inside' && categoryDragState.value?.dropParentId === props.category.id)

const canMoveUp = computed(() => bookmarkStore.canMoveCategoryUp(props.category.id))
const canMoveDown = computed(() => bookmarkStore.canMoveCategoryDown(props.category.id))

const actionOptions = computed(() => [
  {
    label: '添加子分类',
    key: 'add-child',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z' })
    ])
  },
  {
    label: props.category.isPinned ? '取消置顶' : '置顶到主页',
    key: 'toggle-pin',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z' })
    ])
  },
  {
    label: '编辑分类',
    key: 'edit',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z' })
    ])
  },
  {
    label: '删除分类',
    key: 'delete',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z' })
    ])
  }
])

function getCategoryIdFromEvent(event: SortableEvent) {
  const element = event?.item as HTMLElement | null
  return element?.dataset?.categoryId ?? null
}

function handleChildDragStart(event: SortableEvent) {
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

async function handleChildChange(event: any) {
  await handleDragChange(event, props.category.id)
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

function handleChildMove(event: DraggableMoveEvent) {
  return handleMove(event, props.category.id)
}

async function handleMoveUp() {
  await bookmarkStore.moveCategoryRelative(props.category.id, 'up')
}

async function handleMoveDown() {
  await bookmarkStore.moveCategoryRelative(props.category.id, 'down')
}

function handleSelect() {
  emit('select', props.category.id)
}

function handleToggle() {
  emit('toggle', props.category.id)
}

async function handleAction(key: string) {
  switch (key) {
    case 'add-child':
      // 触发添加子分类事件
      {
        const event = new CustomEvent('add-child-category', {
          detail: { parentId: props.category.id }
        })
        document.dispatchEvent(event)
      }
      break
    case 'toggle-pin':
      {
        const wasPinned = Boolean(props.category.isPinned)
        await bookmarkStore.toggleCategoryPin(props.category.id)
        message.success(wasPinned ? '已取消置顶' : '已置顶到主页')
      }
      break
    case 'edit':
      // 触发编辑分类事件
      {
        const event = new CustomEvent('edit-category', {
          detail: { category: props.category }
        })
        document.dispatchEvent(event)
      }
      break
    case 'delete':
      handleDelete()
      break
  }
}

function handleDelete() {
  const childBookmarks = bookmarkStore.getCategoryBookmarks(props.category.id)
  const hasBookmarks = childBookmarks.length > 0

  dialog.warning({
    title: '确认删除',
    content: hasBookmarks
      ? `分类"${props.category.name}"包含 ${childBookmarks.length} 个书签，删除后将把它们移动到"未分类"。确定继续吗？`
      : `确定删除分类"${props.category.name}"吗？`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await bookmarkStore.deleteCategory(props.category.id)
        message.success('分类已删除')
      } catch (error) {
        message.error('删除失败')
        console.error(error)
      }
    }
  })
}

function handleDragEnter(event: DragEvent) {
  if (!canAcceptDrop.value) return
  event.preventDefault()
  bookmarkStore.updateDragDropTarget(props.category.id)
}

function handleDragOver(event: DragEvent) {
  if (!canAcceptDrop.value) return
  event.preventDefault()
  bookmarkStore.updateDragDropTarget(props.category.id)
}

function handleDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement
  const related = event.relatedTarget as Node | null
  if (!current.contains(related)) {
    bookmarkStore.updateDragDropTarget(null)
  }
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  const state = bookmarkStore.dragState
  if (!state || !state.bookmarkIds.length) return

  try {
    await bookmarkStore.moveBookmarksToCategory(state.bookmarkIds, props.category.id)
  } finally {
    bookmarkStore.updateDragDropTarget(null)
    bookmarkStore.endBookmarkDrag()
  }
}
</script>

<style scoped>
.category-node {
  user-select: none;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: var(--transition-base);
  margin: 2px 8px;
  position: relative;
  color: var(--sidebar-text-color);
}

.category-item:hover {
  background: var(--sidebar-item-hover);
}

.category-item:hover .category-actions {
  opacity: 1;
}

.category-item.selected {
  background: var(--sidebar-item-active);
  color: var(--sidebar-text-active);
}

.category-item.is-drop-target {
  background: var(--drag-indicator-bg);
  border-left: 3px solid var(--drag-indicator-color);
}

.category-item.is-dragged {
  opacity: var(--drag-ghost-opacity);
}

.expand-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  transition: transform 0.2s;
  cursor: pointer;
}

.expand-spacer {
  width: 20px;
}

.category-folder-icon {
  color: var(--sidebar-text-secondary);
  flex-shrink: 0;
}

.selected .category-folder-icon {
  color: var(--sidebar-text-active);
}

.category-name {
  flex: 1;
  font-size: var(--font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  color: var(--sidebar-text-secondary);
  background: transparent;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  margin-right: 4px;
  font-weight: 500;
}

.selected .category-count {
  color: rgba(255, 255, 255, 0.85);
}

.category-actions {
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-order-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
}

.category-order-buttons .order-btn {
  color: var(--n-text-color-3);
  padding: 2px;
}

.category-order-buttons .order-btn:hover {
  color: var(--primary-color);
}

.category-order-buttons .order-btn:disabled {
  color: rgba(148, 163, 184, 0.4);
}

.children {
  position: relative;
  margin-left: 24px;
}

.children::before {
  content: '';
  position: absolute;
  left: 28px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--n-border-color);
  opacity: 0.3;
}

.category-children-list {
  display: block;
  padding-left: 4px;
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
  margin: 6px 0 6px 20px;
  padding: 10px 12px;
  border: 1.5px dashed var(--drag-indicator-border);
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  color: var(--sidebar-text-secondary);
  background: var(--drag-indicator-bg);
  text-align: center;
}
</style>
