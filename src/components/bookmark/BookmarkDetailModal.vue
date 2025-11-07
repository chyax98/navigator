<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="bookmark.title"
    style="width: 800px; max-width: 90vw"
    :segmented="{
      content: true,
      footer: 'soft'
    }"
  >
    <n-space
      vertical
      :size="16"
    >
      <!-- 书签基本信息 -->
      <n-descriptions
        bordered
        :column="2"
      >
        <n-descriptions-item label="标题">
          {{ bookmark.title }}
        </n-descriptions-item>
        <n-descriptions-item label="分类">
          {{ getCategoryName(bookmark.categoryId) }}
        </n-descriptions-item>
        <n-descriptions-item
          label="网址"
          :span="2"
        >
          <n-ellipsis style="max-width: 600px">
            <a
              :href="bookmark.url"
              target="_blank"
              style="color: var(--n-primary-color)"
            >
              {{ bookmark.url }}
            </a>
          </n-ellipsis>
        </n-descriptions-item>
        <n-descriptions-item
          v-if="bookmark.description"
          label="描述"
          :span="2"
        >
          {{ bookmark.description }}
        </n-descriptions-item>
        <n-descriptions-item
          v-if="bookmark.tags && bookmark.tags.length > 0"
          label="标签"
          :span="2"
        >
          <n-space>
            <n-tag
              v-for="tag in bookmark.tags"
              :key="tag"
              size="small"
            >
              {{ tag }}
            </n-tag>
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item label="创建时间">
          {{ formatDate(bookmark.createdAt) }}
        </n-descriptions-item>
        <n-descriptions-item label="更新时间">
          {{ formatDate(bookmark.updatedAt) }}
        </n-descriptions-item>
      </n-descriptions>

      <!-- 笔记组件 -->
      <bookmark-notes :bookmark="bookmark" />
    </n-space>

    <template #footer>
      <n-space justify="space-between">
        <n-button
          secondary
          @click="handleEdit"
        >
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24"><path
                fill="currentColor"
                d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"
              /></svg>
            </n-icon>
          </template>
          编辑
        </n-button>
        <n-space>
          <n-button
            secondary
            @click="handleOpen"
          >
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24"><path
                  fill="currentColor"
                  d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"
                /></svg>
              </n-icon>
            </template>
            打开链接
          </n-button>
          <n-button @click="close">
            关闭
          </n-button>
        </n-space>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NModal,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NEllipsis,
  NButton,
  NIcon
} from 'naive-ui'
import dayjs from 'dayjs'
import { useBookmarkStore } from '@/stores/bookmark'
import BookmarkNotes from './BookmarkNotes.vue'
import type { Bookmark } from '@/types/bookmark'

interface Props {
  show: boolean
  bookmark: Bookmark
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'edit', bookmark: Bookmark): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const bookmarkStore = useBookmarkStore()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// 获取分类名称
function getCategoryName(categoryId: string): string {
  const category = bookmarkStore.findCategoryById(categoryId)
  return category?.name || '未分类'
}

// 格式化日期
function formatDate(date: Date | undefined): string {
  if (!date) return '未知'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 打开链接
function handleOpen() {
  window.open(props.bookmark.url, '_blank')
}

// 编辑书签
function handleEdit() {
  emit('edit', props.bookmark)
  close()
}

// 关闭模态框
function close() {
  showModal.value = false
}
</script>
