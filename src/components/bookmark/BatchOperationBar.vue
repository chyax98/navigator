<template>
  <div
    v-if="bookmarkStore.batchMode"
    class="batch-toolbar"
  >
    <n-space
      align="center"
      :wrap="false"
    >
      <n-button
        size="small"
        @click="bookmarkStore.toggleBatchMode"
      >
        退出批量模式
      </n-button>

      <n-divider vertical />

      <span class="selected-info">
        已选择 <strong>{{ bookmarkStore.selectedBookmarkCount }}</strong> 个书签
      </span>

      <n-button
        size="small"
        @click="bookmarkStore.selectAll"
      >
        全选
      </n-button>

      <n-button
        size="small"
        :disabled="bookmarkStore.selectedBookmarkCount === 0"
        @click="bookmarkStore.clearBookmarkSelection"
      >
        取消
      </n-button>

      <n-divider vertical />

      <!-- 批量移动 -->
      <n-dropdown
        :options="categoryOptions"
        :disabled="bookmarkStore.selectedBookmarkCount === 0"
        @select="handleBatchMove"
      >
        <n-button size="small">
          移动到...
        </n-button>
      </n-dropdown>

      <!-- 批量添加标签 -->
      <n-button
        size="small"
        :disabled="bookmarkStore.selectedBookmarkCount === 0"
        @click="showBatchTagDialog = true"
      >
        添加标签
      </n-button>

      <!-- 批量删除 -->
      <n-popconfirm
        positive-text="删除"
        negative-text="取消"
        :disabled="bookmarkStore.selectedBookmarkCount === 0"
        @positive-click="handleBatchDelete"
      >
        <template #trigger>
          <n-button
            size="small"
            type="error"
            :disabled="bookmarkStore.selectedBookmarkCount === 0"
          >
            删除
          </n-button>
        </template>
        确定要删除这 {{ bookmarkStore.selectedBookmarkCount }} 个书签吗？
      </n-popconfirm>
    </n-space>

    <!-- 批量添加标签对话框 -->
    <n-modal
      v-model:show="showBatchTagDialog"
      preset="dialog"
      title="批量添加标签"
      positive-text="确定"
      negative-text="取消"
      @positive-click="handleBatchAddTags"
    >
      <n-space
        vertical
        style="margin-top: 16px;"
      >
        <tag-input
          v-model:tags="batchTags"
          placeholder="输入标签 (回车确认)"
        />
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NSpace, NDivider, NDropdown, NPopconfirm, NModal, useMessage } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import TagInput from '@/components/tag/TagInput.vue'

const bookmarkStore = useBookmarkStore()
const message = useMessage()

const showBatchTagDialog = ref(false)
const batchTags = ref<string[]>([])

// 分类选项
const categoryOptions = computed(() => {
  return bookmarkStore.categories.map(cat => ({
    label: cat.name,
    key: cat.id
  }))
})

async function handleBatchMove(categoryId: string) {
  try {
    await bookmarkStore.batchMove(categoryId)
    const categoryName = bookmarkStore.categories.find(c => c.id === categoryId)?.name || '未分类'
    message.success(`已将 ${bookmarkStore.selectedBookmarkCount} 个书签移动到「${categoryName}」`)
  } catch (error) {
    message.error('批量移动失败：' + (error as Error).message)
  }
}

async function handleBatchAddTags() {
  if (batchTags.value.length === 0) {
    message.warning('请至少添加一个标签')
    return false
  }

  try {
    const count = bookmarkStore.selectedBookmarkCount
    await bookmarkStore.batchAddTags(batchTags.value)
    message.success(`已为 ${count} 个书签添加标签`)
    batchTags.value = []
    showBatchTagDialog.value = false
  } catch (error) {
    message.error('批量添加标签失败：' + (error as Error).message)
    return false
  }
}

async function handleBatchDelete() {
  try {
    const count = bookmarkStore.selectedBookmarkCount
    await bookmarkStore.batchDelete()
    message.success(`已删除 ${count} 个书签`)
  } catch (error) {
    message.error('批量删除失败：' + (error as Error).message)
  }
}
</script>

<style scoped>
.batch-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 12px 16px;
  background: var(--n-color);
  border-bottom: 1px solid var(--n-border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.selected-info {
  font-size: 14px;
  color: var(--n-text-color-2);
  user-select: none;
}

.selected-info strong {
  color: var(--n-primary-color);
  font-weight: 600;
}
</style>
