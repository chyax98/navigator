<template>
  <div class="google-search-box">
    <n-input
      v-model:value="searchQuery"
      size="large"
      style="height: 52px;"
      placeholder="搜索 Google 或输入网址"
      clearable
      @keyup.enter="handleSearch"
      @keyup.esc="searchQuery = ''"
    >
      <template #prefix>
        <n-icon :component="SearchOutline" />
      </template>
    </n-input>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NIcon } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

const searchQuery = ref('')

/**
 * 检测字符串是否为 URL
 */
function isURL(str: string): boolean {
  // 检查是否以协议开头
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return true
  }

  // 检查是否包含域名格式（包含点号）
  const domainPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*$/
  return domainPattern.test(str)
}

/**
 * 处理搜索
 */
function handleSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  if (isURL(query)) {
    // 如果是 URL，添加协议后直接跳转
    const url = query.startsWith('http') ? query : `https://${query}`
    window.open(url, '_blank')
  } else {
    // Google 搜索
    const encodedQuery = encodeURIComponent(query)
    window.open(`https://www.google.com/search?q=${encodedQuery}`, '_blank')
  }

  // 清空搜索框
  searchQuery.value = ''
}
</script>

<style scoped>
.google-search-box {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 0;
}

.google-search-box :deep(.n-input) {
  border-radius: 24px;
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
  border: 1px solid var(--n-border-color);
  transition: box-shadow 0.2s ease;
}

.google-search-box :deep(.n-input:hover) {
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.4);
}

.google-search-box :deep(.n-input:focus-within) {
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.5);
}

.google-search-box :deep(.n-input__input-el) {
  font-size: 17px;
  padding-left: 0 !important;
}

.google-search-box :deep(.n-input__prefix) {
  margin-left: 20px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  height: 100%;
}

.google-search-box :deep(.n-input__suffix) {
  margin-right: 20px;
  display: flex;
  align-items: center;
  height: 100%;
}

.google-search-box :deep(.n-input-wrapper) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  display: flex;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .google-search-box {
    max-width: 800px;
  }
}

@media (max-width: 900px) {
  .google-search-box {
    max-width: 600px;
  }

  .google-search-box :deep(.n-input) {
    height: 48px;
  }

  .google-search-box :deep(.n-input__input-el) {
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .google-search-box {
    max-width: 100%;
    padding: 16px;
  }

  .google-search-box :deep(.n-input) {
    height: 44px;
  }

  .google-search-box :deep(.n-input__input-el) {
    font-size: 15px;
  }

  .google-search-box :deep(.n-input__prefix) {
    margin-left: 12px;
  }

  .google-search-box :deep(.n-input__suffix) {
    margin-right: 12px;
  }
}
</style>
