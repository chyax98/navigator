<template>
  <div class="search-box">
    <n-input
      ref="searchInputRef"
      v-model:value="searchQuery"
      placeholder="搜索书签标题、网址、描述..."
      size="large"
      clearable
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput"
      @clear="handleClear"
      @keydown.enter.prevent="handleEnter"
    >
      <template #prefix>
        <n-icon>
          <svg viewBox="0 0 24 24"><path
            fill="currentColor"
            d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
          /></svg>
        </n-icon>
      </template>
    </n-input>

    <div
      v-if="showResults && searchResults.length > 0"
      class="search-results"
      @mousedown.prevent
    >
      <div
        v-for="result in searchResults"
        :key="result.bookmark.id"
        class="search-result-item"
        @click="handleResultClick(result.bookmark)"
      >
        <img
          :src="result.bookmark.favicon"
          class="result-favicon"
          alt=""
        >
        <div class="result-content">
          <div class="result-title">
            {{ result.bookmark.title }}
          </div>
          <div class="result-url">
            {{ result.bookmark.url }}
          </div>
        </div>
        <div class="result-score">
          {{ Math.round(result.score) }} 分
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NInput, NIcon, useMessage } from 'naive-ui'
import { useDebounceFn } from '@vueuse/core'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Bookmark } from '@/types/bookmark'

const bookmarkStore = useBookmarkStore()
const message = useMessage()

const searchQuery = ref('')
const showResults = ref(false)
const isFocused = ref(false)
const searchInputRef = ref()

const searchResults = computed(() => {
  return bookmarkStore.searchResults.slice(0, 8) // 只显示前8个结果
})

const executeSearch = async (withFeedback = false) => {
  const query = searchQuery.value.trim()
  if (!query) {
    showResults.value = false
    bookmarkStore.clearSearch()
    return
  }

  await bookmarkStore.search(query)
  const hasResults = searchResults.value.length > 0
  showResults.value = hasResults

  if (!hasResults && withFeedback) {
    message.warning(`未找到与「${query}」相关的书签`)
  }
}

const debouncedSearch = useDebounceFn((withFeedback: boolean) => {
  void executeSearch(withFeedback)
}, 300)

function cancelDebouncedSearch() {
  const candidate = debouncedSearch as any
  if (candidate && typeof candidate.cancel === 'function') {
    candidate.cancel()
  }
}

function handleInput() {
  debouncedSearch(false)
}

async function handleEnter() {
  cancelDebouncedSearch()
  await executeSearch(true)
}

function handleClear() {
  searchQuery.value = ''
  showResults.value = false
  bookmarkStore.clearSearch()
  cancelDebouncedSearch()
}

function handleResultClick(bookmark: Bookmark) {
  window.open(bookmark.url, '_blank')
  showResults.value = false
}

function handleFocus() {
  isFocused.value = true
  if (searchQuery.value.trim()) {
    showResults.value = searchResults.value.length > 0
  }
}

function handleBlur() {
  window.setTimeout(() => {
    isFocused.value = false
    showResults.value = false
  }, 120)
}

function handleFocusShortcut() {
  searchInputRef.value?.focus()
}

onMounted(() => {
  document.addEventListener('click', outsideHandler)
  document.addEventListener('focus-search-input', handleFocusShortcut)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', outsideHandler)
  document.removeEventListener('focus-search-input', handleFocusShortcut)
})

function outsideHandler(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.search-box')) {
    showResults.value = false
    isFocused.value = false
  }
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
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
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
  color: var(--n-primary-color);
  flex-shrink: 0;
}
</style>
