<template>
  <div>
    <app-layout />
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      @close="closeContextMenu"
    />
    <BookmarkFormModal
      v-model:show="showBookmarkModal"
      :initial-data="initialBookmarkData"
      :bookmark="bookmarkToEdit"
      @success="handleBookmarkSuccess"
    />
    <CategoryFormModal
      v-model:show="showCategoryModal"
      :mode="categoryModalMode"
      :category="categoryToEdit"
      :parent-id="categoryParentId"
      @success="handleCategorySuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppLayout from './layout/AppLayout.vue'
import ContextMenu from './common/ContextMenu.vue'
import BookmarkFormModal from './bookmark/BookmarkFormModal.vue'
import CategoryFormModal from './category/CategoryFormModal.vue'
import type { Category, Bookmark } from '@/types/bookmark'


// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 书签表单状态
const showBookmarkModal = ref(false)
const initialBookmarkData = ref<{ url?: string } | null>(null)
const bookmarkToEdit = ref<Bookmark | null>(null)

// 分类表单状态
const showCategoryModal = ref(false)
const categoryModalMode = ref<'add' | 'edit'>('add')
const categoryToEdit = ref<Category | null>(null)
const categoryParentId = ref<string | undefined>(undefined)

// 设置全局事件监听
onMounted(() => {
  // 右键菜单
  document.addEventListener('contextmenu', handleContextMenu)
  document.addEventListener('click', handleClick)

  // 快捷键
  document.addEventListener('keydown', handleKeydown)

  // 自定义事件 - 书签
  document.addEventListener('add-bookmark', handleAddBookmark)
  document.addEventListener('add-bookmark-from-clipboard', handleAddBookmarkFromClipboard)
  document.addEventListener('edit-bookmark', handleEditBookmark)

  // 自定义事件 - 分类
  document.addEventListener('add-category', handleAddCategory)
  document.addEventListener('add-child-category', handleAddChildCategory)
  document.addEventListener('edit-category', handleEditCategory)
})

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('contextmenu', handleContextMenu)
  document.removeEventListener('click', handleClick)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('add-bookmark', handleAddBookmark)
  document.removeEventListener('add-bookmark-from-clipboard', handleAddBookmarkFromClipboard)
  document.removeEventListener('edit-bookmark', handleEditBookmark)
  document.removeEventListener('add-category', handleAddCategory)
  document.removeEventListener('add-child-category', handleAddChildCategory)
  document.removeEventListener('edit-category', handleEditCategory)
})

// 右键菜单处理
function handleContextMenu(e: MouseEvent) {
  // 防止在输入框、链接等元素上显示
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'A') {
    return
  }

  e.preventDefault()
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

function handleClick() {
  contextMenuVisible.value = false
}

function closeContextMenu() {
  contextMenuVisible.value = false
}

// 快捷键处理
function handleKeydown(e: KeyboardEvent) {
  // Ctrl+D 添加书签
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault()
    handleAddBookmark()
  }
}

// 添加书签处理
function handleAddBookmark() {
  initialBookmarkData.value = null
  showBookmarkModal.value = true
}

function handleAddBookmarkFromClipboard(e: Event) {
  const { url } = (e as CustomEvent).detail
  initialBookmarkData.value = { url }
  showBookmarkModal.value = true
}

// 编辑书签处理
function handleEditBookmark(e: Event) {
  const { bookmark } = (e as CustomEvent).detail
  bookmarkToEdit.value = bookmark
  initialBookmarkData.value = null
  showBookmarkModal.value = true
}

// 书签添加/编辑成功回调
function handleBookmarkSuccess() {
  initialBookmarkData.value = null
  bookmarkToEdit.value = null
}

// 分类管理处理
function handleAddCategory() {
  categoryModalMode.value = 'add'
  categoryToEdit.value = null
  categoryParentId.value = undefined
  showCategoryModal.value = true
}

function handleAddChildCategory(e: Event) {
  const { parentId } = (e as CustomEvent).detail
  categoryModalMode.value = 'add'
  categoryToEdit.value = null
  categoryParentId.value = parentId
  showCategoryModal.value = true
}

function handleEditCategory(e: Event) {
  const { category } = (e as CustomEvent).detail
  categoryModalMode.value = 'edit'
  categoryToEdit.value = category
  categoryParentId.value = undefined
  showCategoryModal.value = true
}

// 分类操作成功回调
function handleCategorySuccess() {
  // message 已在 CategoryFormModal 中显示
}
</script>
