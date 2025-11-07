<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="bookmark-notes">
    <n-card title="📝 笔记">
      <template #header-extra>
        <n-button-group size="small">
          <n-button
            :type="mode === 'edit' ? 'primary' : 'default'"
            @click="mode = 'edit'"
          >
            编辑
          </n-button>
          <n-button
            :type="mode === 'preview' ? 'primary' : 'default'"
            @click="mode = 'preview'"
          >
            预览
          </n-button>
        </n-button-group>
      </template>

      <!-- 编辑模式 -->
      <n-input
        v-if="mode === 'edit'"
        v-model:value="localNotes"
        type="textarea"
        :rows="10"
        placeholder="支持 Markdown 格式...

## 标题
- 列表项
**粗体** *斜体*
[链接](url)
`代码`
"
        @blur="saveNotes"
      />

      <!-- 预览模式 -->
      <div
        v-else
        class="notes-preview markdown-body"
        v-html="renderedNotes"
      />

      <template #footer>
        <n-space justify="space-between">
          <span class="notes-info">
            最后编辑: {{ formatDate(bookmark.updatedAt) }}
          </span>
          <n-popconfirm
            positive-text="确定"
            negative-text="取消"
            @positive-click="clearNotes"
          >
            <template #trigger>
              <n-button
                text
                type="error"
              >
                清空笔记
              </n-button>
            </template>
            确定要清空笔记吗？
          </n-popconfirm>
        </n-space>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NCard, NInput, NButton, NButtonGroup, NSpace, NPopconfirm, useMessage } from 'naive-ui'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import dayjs from 'dayjs'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Bookmark } from '@/types/bookmark'

interface Props {
  bookmark: Bookmark
}

const props = defineProps<Props>()

const bookmarkStore = useBookmarkStore()
const message = useMessage()

const mode = ref<'edit' | 'preview'>('preview')
const localNotes = ref(props.bookmark.notes || '')

// 监听 bookmark 变化，更新本地笔记
watch(() => props.bookmark.notes, (newNotes) => {
  localNotes.value = newNotes || ''
})

// Markdown 渲染（带 XSS 防护）
const renderedNotes = computed(() => {
  if (!localNotes.value) {
    return '<p class="empty">暂无笔记</p>'
  }

  const rawHtml = marked(localNotes.value, {
    breaks: true,  // 支持换行
    gfm: true      // GitHub Flavored Markdown
  })

  // XSS 防护
  return DOMPurify.sanitize(rawHtml as string)
})

// 格式化日期
function formatDate(date: Date | undefined): string {
  if (!date) return '未知'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 保存笔记
async function saveNotes() {
  try {
    await bookmarkStore.updateBookmark(props.bookmark.id, {
      notes: localNotes.value,
      updatedAt: new Date()
    })
    message.success('笔记已保存')
  } catch (error) {
    console.error('保存笔记失败:', error)
    message.error('保存笔记失败')
  }
}

// 清空笔记
async function clearNotes() {
  localNotes.value = ''
  await saveNotes()
}
</script>

<style scoped>
.bookmark-notes {
  width: 100%;
}

.notes-preview {
  min-height: 100px;
  padding: 16px;
  background: var(--n-color-embedded);
  border-radius: 4px;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.notes-preview :deep(.empty) {
  color: var(--n-text-color-3);
  font-style: italic;
  text-align: center;
}

.notes-info {
  font-size: 12px;
  color: var(--n-text-color-3);
}

/* Markdown 样式 */
.markdown-body {
  font-family: inherit;
  line-height: 1.6;
  color: var(--n-text-color);
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body :deep(h2) {
  font-size: 20px;
  border-bottom: 1px solid var(--n-border-color);
  padding-bottom: 4px;
}

.markdown-body :deep(h3) {
  font-size: 18px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(p) {
  margin: 8px 0;
}

.markdown-body :deep(code) {
  background: var(--n-color-embedded-popover);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background: var(--n-color-embedded-popover);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  margin: 12px 0;
  padding-left: 16px;
  border-left: 4px solid var(--n-primary-color);
  color: var(--n-text-color-2);
}

.markdown-body :deep(a) {
  color: var(--n-primary-color);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--n-border-color);
  margin: 16px 0;
}
</style>
