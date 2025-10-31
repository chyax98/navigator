<template>
  <div class="home-view">
    <!-- 空状态 -->
    <n-empty
      v-if="bookmarkStore.bookmarkCount === 0"
      description="还没有书签，快来添加第一个吧！"
      size="large"
    >
      <template #icon>
        <n-icon size="64">
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19H5V5H12V3H5M17.78,4C17.61,4 17.43,4.07 17.3,4.2L16.08,5.41L18.58,7.91L19.8,6.7C20.06,6.44 20.06,6 19.8,5.75L18.25,4.2C18.12,4.07 17.95,4 17.78,4M15.37,6.12L8,13.5V16H10.5L17.87,8.62L15.37,6.12Z"/>
          </svg>
        </n-icon>
      </template>
    </n-empty>

    <!-- 书签网格 -->
    <div v-else class="bookmark-grid">
      <bookmark-card
        v-for="bookmark in filteredBookmarks"
        :key="bookmark.id"
        :bookmark="bookmark"
        @edit="handleEdit"
        @delete="handleDelete"
        @tag-click="handleTagClick"
      />
    </div>

    <!-- 编辑书签对话框 -->
    <n-modal v-model:show="showEditModal" preset="card" title="编辑书签" style="width: 600px">
      <n-form v-if="editingBookmark" ref="formRef" :model="editingBookmark">
        <n-form-item label="标题">
          <n-input v-model:value="editingBookmark.title" />
        </n-form-item>
        <n-form-item label="网址">
          <n-input v-model:value="editingBookmark.url" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="editingBookmark.description" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="标签">
          <n-dynamic-tags v-model:value="editingBookmark.tags" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="handleUpdate">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NEmpty, NIcon, NModal, NForm, NFormItem, NInput, NDynamicTags, NButton, NSpace, useMessage, useDialog } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import BookmarkCard from '@/components/bookmark/BookmarkCard.vue'
import type { Bookmark } from '@/types/bookmark'

const bookmarkStore = useBookmarkStore()
const message = useMessage()
const dialog = useDialog()

const showEditModal = ref(false)
const editingBookmark = ref<Bookmark | null>(null)

const filteredBookmarks = computed(() => {
  return bookmarkStore.filteredBookmarks
})

function handleEdit(bookmark: Bookmark) {
  editingBookmark.value = { ...bookmark }
  showEditModal.value = true
}

async function handleUpdate() {
  if (!editingBookmark.value) return

  try {
    await bookmarkStore.updateBookmark(editingBookmark.value.id, editingBookmark.value)
    message.success('书签更新成功')
    showEditModal.value = false
  } catch (error) {
    message.error('更新失败')
    console.error(error)
  }
}

function handleDelete(bookmark: Bookmark) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除「${bookmark.title}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await bookmarkStore.deleteBookmark(bookmark.id)
        message.success('书签已删除')
      } catch (error) {
        message.error('删除失败')
        console.error(error)
      }
    }
  })
}

function handleTagClick(tag: string) {
  // 根据标签搜索
  bookmarkStore.search(tag)
}
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 4px;
}

@media (max-width: 768px) {
  .bookmark-grid {
    grid-template-columns: 1fr;
  }
}
</style>
