<template>
  <div class="search-box">
    <n-input
      v-model:value="searchQuery"
      placeholder="搜索书签..."
      size="large"
      clearable
      @input="handleSearch"
      @clear="handleClear"
    >
      <template #prefix>
        <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg></n-icon>
      </template>
    </n-input>

    <!-- 搜索结果下拉 -->
    <div v-if="showResults && searchResults.length > 0" class="search-results">
      <div
        v-for="result in searchResults"
        :key="result.bookmark.id"
        class="search-result-item"
        @click="handleResultClick(result.bookmark)"
      >
        <img :src="result.bookmark.favicon" class="result-favicon" alt="" />
        <div class="result-content">
          <div class="result-title">{{ result.bookmark.title }}</div>
          <div class="result-url">{{ result.bookmark.url }}</div>
        </div>
        <div class="result-score">
          {{ Math.round((1 - result.score) * 100) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NIcon } from 'naive-ui'
import { useDebounceFn } from '@vueuse/core'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Bookmark } from '@/types/bookmark'

const bookmarkStore = useBookmarkStore()

const searchQuery = ref('')
const showResults = ref(false)

const searchResults = computed(() => {
  return bookmarkStore.searchResults.slice(0, 8) // 只显示前8个结果
})

const handleSearch = useDebounceFn(async () => {
  if (searchQuery.value.trim()) {
    await bookmarkStore.search(searchQuery.value)
    showResults.value = true
  } else {
    showResults.value = false
  }
}, 300)

function handleClear() {
  searchQuery.value = ''
  showResults.value = false
  bookmarkStore.clearSearch()
}

function handleResultClick(bookmark: Bookmark) {
  window.open(bookmark.url, '_blank')
  showResults.value = false
  searchQuery.value = ''
}

// 点击外部关闭结果
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.search-box')) {
      showResults.value = false
    }
  })
}
</script>

<style scoped>
.search-box {
  position: relative;
  width: 100%;
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: var(--n-action-color);
}

.result-favicon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 4px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-url {
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.result-score {
  font-size: 12px;
  color: var(--n-text-color-3);
  flex-shrink: 0;
}
</style>
