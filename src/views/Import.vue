<template>
  <div class="import-view">
    <n-card title="导入书签">
      <n-space vertical size="large">
        <!-- 上传区域 -->
        <n-upload
          :custom-request="handleUpload"
          :show-file-list="false"
          accept=".json,.html,.htm"
        >
          <n-upload-dragger>
            <div class="upload-content">
              <n-icon size="48" :depth="3">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>
                </svg>
              </n-icon>
              <div class="upload-text">
                <div class="upload-title">点击或拖拽文件到此处上传</div>
                <div class="upload-hint">支持 Chrome 书签（JSON）、HTML 书签文件</div>
              </div>
            </div>
          </n-upload-dragger>
        </n-upload>

        <!-- 说明 -->
        <n-alert type="info" title="如何导出 Chrome 书签">
          <ol>
            <li>打开 Chrome 浏览器</li>
            <li>点击右上角菜单 ⋮ → 书签 → 书签管理器</li>
            <li>点击右上角 ⋮ → 导出书签</li>
            <li>保存为 HTML 文件后，在此处上传</li>
          </ol>
        </n-alert>

        <!-- 预览 -->
        <div v-if="preview.bookmarks.length > 0" class="preview-section">
          <n-card title="预览导入数据" size="small">
            <n-space vertical>
              <div>将导入 {{ preview.bookmarks.length }} 个书签</div>
              <div>将导入 {{ preview.categories.length }} 个分类</div>

              <n-space>
                <n-button type="primary" @click="handleConfirmImport">
                  确认导入
                </n-button>
                <n-button @click="handleCancelImport">
                  取消
                </n-button>
              </n-space>
            </n-space>
          </n-card>

          <!-- 书签列表预览 -->
          <n-card title="书签列表" size="small">
            <n-list>
              <n-list-item v-for="bookmark in preview.bookmarks.slice(0, 10)" :key="bookmark.id">
                <div class="preview-item">
                  <img :src="bookmark.favicon" class="preview-favicon" alt="" />
                  <div class="preview-content">
                    <div class="preview-title">{{ bookmark.title }}</div>
                    <div class="preview-url">{{ bookmark.url }}</div>
                  </div>
                </div>
              </n-list-item>
            </n-list>
            <div v-if="preview.bookmarks.length > 10" class="preview-more">
              还有 {{ preview.bookmarks.length - 10 }} 个书签未显示
            </div>
          </n-card>
        </div>

        <!-- 导入历史 -->
        <n-card v-if="importHistory.length > 0" title="导入历史" size="small">
          <n-list>
            <n-list-item v-for="(item, index) in importHistory" :key="index">
              <div>{{ item.date }}: 导入了 {{ item.count }} 个书签</div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NSpace, NUpload, NUploadDragger, NIcon, NAlert, NButton, NList, NListItem, useMessage } from 'naive-ui'
import type { UploadCustomRequestOptions } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import { parseBookmarkFile } from '@/utils/import'
import type { Bookmark, Category } from '@/types/bookmark'

const router = useRouter()
const bookmarkStore = useBookmarkStore()
const message = useMessage()

const preview = ref<{
  bookmarks: Bookmark[]
  categories: Category[]
}>({
  bookmarks: [],
  categories: []
})

const importHistory = ref<Array<{ date: string; count: number }>>([])

async function handleUpload({ file }: UploadCustomRequestOptions) {
  try {
    message.loading('正在解析文件...')

    const result = await parseBookmarkFile(file.file as File)
    preview.value = result

    message.success('文件解析成功，请预览后确认导入')
  } catch (error: any) {
    message.error(error.message || '文件解析失败')
    console.error(error)
  }
}

async function handleConfirmImport() {
  try {
    await bookmarkStore.importBookmarks(preview.value)

    // 记录导入历史
    importHistory.value.unshift({
      date: new Date().toLocaleString(),
      count: preview.value.bookmarks.length
    })

    message.success(`成功导入 ${preview.value.bookmarks.length} 个书签`)

    // 清空预览
    preview.value = {
      bookmarks: [],
      categories: []
    }

    // 返回首页
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (error) {
    message.error('导入失败')
    console.error(error)
  }
}

function handleCancelImport() {
  preview.value = {
    bookmarks: [],
    categories: []
  }
}
</script>

<style scoped>
.import-view {
  max-width: 800px;
  margin: 0 auto;
}

.upload-content {
  text-align: center;
  padding: 40px 0;
}

.upload-text {
  margin-top: 16px;
}

.upload-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: var(--n-text-color-3);
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-favicon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.preview-content {
  flex: 1;
  min-width: 0;
}

.preview-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-url {
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.preview-more {
  padding: 12px;
  text-align: center;
  color: var(--n-text-color-3);
  font-size: 14px;
}
</style>
