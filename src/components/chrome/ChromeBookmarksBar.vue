<template>
  <div
    v-if="isChromeAvailable && chromeBookmarks.length > 0"
    class="chrome-bookmarks-bar"
  >
    <div class="bookmarks-bar-header">
      <n-icon
        :size="16"
        color="#4285F4"
      >
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z"
          />
        </svg>
      </n-icon>
      <span class="bar-title">Chrome 书签栏</span>
      <span class="bookmark-count">{{ chromeBookmarks.length }}</span>
    </div>

    <div class="bookmarks-bar-content">
      <a
        v-for="bookmark in chromeBookmarks"
        :key="bookmark.id"
        :href="bookmark.url"
        class="bookmark-item"
        :title="bookmark.title"
        target="_blank"
        rel="noopener noreferrer"
        @click.prevent="handleBookmarkClick(bookmark)"
      >
        <img
          :src="getFaviconUrl(bookmark.url)"
          :alt="bookmark.title"
          class="bookmark-favicon"
          @error="handleImageError"
        >
        <span class="bookmark-title">{{ bookmark.title }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import { isChromeExtension } from '@/services/chrome-bookmarks'
import type { Bookmark } from '@/types/bookmark'

const bookmarkStore = useBookmarkStore()

// Chrome 环境检测
const isChromeAvailable = computed(() => isChromeExtension())

// Chrome 书签（从 bookmarks 中过滤 source='chrome' 的书签）
const chromeBookmarks = computed(() =>
  bookmarkStore.bookmarks.filter(b => b.source === 'chrome')
)

// 获取 Favicon URL
function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.origin}/favicon.ico`
  } catch {
    return ''
  }
}

// 图片加载失败处理
function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

// 点击书签
function handleBookmarkClick(bookmark: Bookmark) {
  // 在新标签页打开
  window.open(bookmark.url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.chrome-bookmarks-bar {
  background: var(--n-color);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--n-border-color);
}

.bookmarks-bar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--n-divider-color);
}

.bar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
}

.bookmark-count {
  font-size: 12px;
  color: var(--n-text-color-3);
  background: var(--n-action-color);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.bookmarks-bar-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bookmark-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--n-action-color);
  border-radius: 8px;
  text-decoration: none;
  color: var(--n-text-color);
  transition: all 0.2s;
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
}

.bookmark-item:hover {
  background: var(--primary-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bookmark-favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  object-fit: contain;
}

.bookmark-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .bookmarks-bar-content {
    gap: 6px;
  }

  .bookmark-item {
    padding: 4px 8px;
    max-width: 150px;
  }

  .bookmark-title {
    font-size: 12px;
  }
}
</style>
