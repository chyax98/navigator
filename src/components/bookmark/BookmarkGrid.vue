<template>
  <div class="bookmark-grid-container">
    <draggable
      v-if="draggableItems.length"
      v-model="draggableItems"
      item-key="id"
      :class="gridClass"
      :group="{ name: 'bookmarks', pull: false, put: false }"
      :sort="true"
      :animation="200"
      ghost-class="bookmark-ghost"
      chosen-class="bookmark-chosen"
      drag-class="bookmark-dragging"
      fallback-class="bookmark-placeholder"
      :fallback-tolerance="6"
      @start="handleDragStart"
      @end="handleDragEnd"
    >
      <template #item="{ element }">
        <div
          class="bookmark-item"
          :data-bookmark-id="element.id"
          :class="{
            'is-selected': isSelected(element.id),
            'is-dragging': draggingIdsSet.has(element.id)
          }"
          @mousedown.capture="handlePointerDown($event, element)"
          @click.capture="handleCardClick($event, element)"
        >
          <div
            v-if="isSelected(element.id)"
            class="bookmark-selection-indicator"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M7.5 13.5L4.5 10.5L3.45 11.55L7.5 15.6L16.5 6.6L15.45 5.55L7.5 13.5Z"
              />
            </svg>
          </div>
          <bookmark-card
            :bookmark="element"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
            @detail="handleDetail($event)"
            @add-to-homepage="emit('add-to-homepage', $event)"
            @toggle-pin="emit('toggle-pin', $event)"
          />
        </div>
      </template>
    </draggable>
    <div
      v-else
      class="bookmark-grid-empty"
    >
      <slot name="empty" />
    </div>
    <div
      v-if="isDragging"
      class="grid-drop-overlay"
    >
      拖动卡片以重新排序
    </div>

    <!-- 书签详情模态框 -->
    <bookmark-detail-modal
      v-if="detailBookmark"
      v-model:show="showDetail"
      :bookmark="detailBookmark"
      @edit="emit('edit', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SortableEvent } from 'sortablejs'
import Draggable from 'vuedraggable'
import BookmarkCard from './BookmarkCard.vue'
import BookmarkDetailModal from './BookmarkDetailModal.vue'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Bookmark } from '@/types/bookmark'

interface Props {
  bookmarks: Bookmark[]
  compact?: boolean
  activeCategoryId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  activeCategoryId: null
})

const emit = defineEmits<{
  edit: [bookmark: Bookmark]
  delete: [bookmark: Bookmark]
  'add-to-homepage': [bookmark: Bookmark]
  'toggle-pin': [bookmark: Bookmark]
}>()

const bookmarkStore = useBookmarkStore()

const draggableItems = ref<Bookmark[]>([])
const isDragging = ref(false)
const draggingIds = ref<string[]>([])
const showDetail = ref(false)
const detailBookmark = ref<Bookmark | null>(null)

watch(() => props.bookmarks, (next) => {
  draggableItems.value = next.slice()
}, { immediate: true })

const gridClass = computed(() => ({
  'bookmark-grid': true,
  compact: props.compact,
  'drag-active': isDragging.value
}))

const selectedIdSet = computed(() => new Set(bookmarkStore.selectedBookmarkIdList))
const draggingIdsSet = computed(() => new Set(draggingIds.value))

function isSelected(id: string) {
  return selectedIdSet.value.has(id)
}

function getOrderedIds(): string[] {
  return draggableItems.value.map(item => item.id)
}


function selectRange(target: Bookmark) {
  const ids = getOrderedIds()
  const anchorId = bookmarkStore.getSelectionAnchor()
  const anchorIndex = anchorId ? ids.indexOf(anchorId) : -1
  const targetIndex = ids.indexOf(target.id)

  if (targetIndex === -1) {
    bookmarkStore.setBookmarkSelection([target.id], target.id)
    return
  }

  if (anchorIndex === -1) {
    bookmarkStore.setBookmarkSelection([target.id], target.id)
    return
  }

  const [start, end] = anchorIndex < targetIndex
    ? [anchorIndex, targetIndex]
    : [targetIndex, anchorIndex]

  const range = ids.slice(start, end + 1)
  bookmarkStore.setBookmarkSelection(range, target.id)
}

function handlePointerDown(event: MouseEvent, bookmark: Bookmark) {
  if (event.button !== 0) return

  if (event.shiftKey) {
    event.preventDefault()
    selectRange(bookmark)
    return
  }

  if (event.metaKey || event.ctrlKey) {
    event.preventDefault()
    bookmarkStore.toggleBookmarkSelection(bookmark.id)
    return
  }
}

function handleCardClick(event: MouseEvent, bookmark: Bookmark) {
  if (event.shiftKey) {
    event.preventDefault()
    event.stopPropagation()
    selectRange(bookmark)
    return
  }

  if (event.metaKey || event.ctrlKey) {
    event.preventDefault()
    event.stopPropagation()
    bookmarkStore.toggleBookmarkSelection(bookmark.id)
  }
}

function getNextBookmarkId(event: SortableEvent, movingIds: string[]): string | null {
  let nextElement = event.item?.nextElementSibling as HTMLElement | null
  let nextId: string | null = null

  while (nextElement) {
    const candidate = nextElement.dataset?.bookmarkId
    if (candidate && !movingIds.includes(candidate)) {
      nextId = candidate
      break
    }
    nextElement = nextElement.nextElementSibling as HTMLElement | null
  }

  return nextId
}

function resolveMovingIds(draggedId: string): string[] {
  const selected = bookmarkStore.selectedBookmarkIdList
  if (selected.length && selected.includes(draggedId)) {
    return [...selected]
  }

  bookmarkStore.setBookmarkSelection([draggedId], draggedId)
  return [draggedId]
}

function handleDragStart(event: SortableEvent) {
  const draggedId = (event.item as HTMLElement | null)?.dataset?.bookmarkId
  if (!draggedId) return

  const movingIds = resolveMovingIds(draggedId)
  draggingIds.value = movingIds
  isDragging.value = true

  const sourceCategoryId = props.activeCategoryId === 'all' ? null : props.activeCategoryId
  bookmarkStore.beginBookmarkDrag(movingIds, sourceCategoryId)
}

async function handleDragEnd(event: SortableEvent) {
  try {
    const movingIds = draggingIds.value.length
      ? [...draggingIds.value]
      : [...bookmarkStore.selectedBookmarkIdList]

    const nextId = getNextBookmarkId(event, movingIds)
    const dragState = bookmarkStore.dragState

    if (movingIds.length && dragState) {
      await bookmarkStore.reorderBookmarks(movingIds, nextId)
    }
  } finally {
    isDragging.value = false
    draggingIds.value = []
    bookmarkStore.endBookmarkDrag()
    draggableItems.value = props.bookmarks.slice()
  }
}

function handleDetail(bookmark: Bookmark) {
  detailBookmark.value = bookmark
  showDetail.value = true
}
</script>

<style scoped>
.bookmark-grid {
  position: relative;
  display: grid;
  gap: var(--card-spacing);
  /* 使用全局变量控制网格列数 */
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  transition: box-shadow 0.2s ease, background-color 0.2s ease;
  /* 固定网格行高，避免拖拽时布局抖动 */
  grid-auto-rows: 140px;
}

.bookmark-grid.compact {
}

.bookmark-grid.drag-active {
  background: linear-gradient(145deg, rgba(32, 128, 240, 0.08), rgba(32, 128, 240, 0.04));
  box-shadow: inset 0 0 0 1px rgba(32, 128, 240, 0.24);
  border-radius: 24px;
}

.bookmark-item {
  position: relative;
  border-radius: 20px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  min-width: 0;
  overflow: hidden;
  /* 固定高度，避免拖拽时布局变化 */
  height: 140px;
}

.bookmark-item.is-selected::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 2px solid rgba(32, 128, 240, 0.65);
  pointer-events: none;
  box-shadow: 0 12px 24px rgba(32, 128, 240, 0.16);
}

.bookmark-item.is-dragging {
  opacity: 0.75;
}

.bookmark-selection-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2080f0, #1a5fd0);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(32, 128, 240, 0.35);
  z-index: 2;
  pointer-events: none;
}

.bookmark-selection-indicator svg {
  width: 16px;
  height: 16px;
}

.bookmark-ghost {
  opacity: 0;
  /* 不改变尺寸，避免布局抖动 */
}

.bookmark-placeholder {
  border: 2px dashed rgba(32, 128, 240, 0.55);
  border-radius: 20px;
  /* 保持原始卡片高度，避免布局跳动 */
  height: 140px;
  background: rgba(32, 128, 240, 0.12);
  animation: dropPulse 0.7s ease-in-out infinite alternate;
}

.bookmark-chosen {
  box-shadow: 0 16px 32px rgba(32, 128, 240, 0.18);
  /* 拖拽时保持原始尺寸 */
  transform: none;
}

.grid-drop-overlay {
  position: absolute;
  pointer-events: none;
  inset: 8px;
  border-radius: 24px;
  border: 1px dashed rgba(32, 128, 240, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: rgba(32, 128, 240, 0.85);
  background: rgba(32, 128, 240, 0.04);
  text-align: center;
}

.bookmark-grid-empty {
  min-height: 140px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(100, 116, 139, 0.9);
}

@keyframes dropPulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 0.9;
  }
}

@media (max-width: 640px) {
  .bookmark-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}
</style>
