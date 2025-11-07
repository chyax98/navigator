/**
 * Favicon 加载 Composable
 * 自动从缓存加载，失败时降级处理
 */

import { ref, watch, onMounted } from 'vue'
import { faviconCache } from '@/services/favicon-cache'

export function useFavicon(url: string, initialFavicon?: string) {
  const faviconUrl = ref(initialFavicon || '')
  const loading = ref(false)
  const error = ref(false)

  async function loadFavicon() {
    if (!url) return

    try {
      loading.value = true
      error.value = false

      // 总是从缓存获取（缓存服务内部会处理 fetch + 转换）
      const cached = await faviconCache.getFavicon(url)
      faviconUrl.value = cached
    } catch (err) {
      console.warn('Failed to load favicon:', err)
      error.value = true
      // 使用默认图标
      faviconUrl.value = getDefaultFavicon(url)
    } finally {
      loading.value = false
    }
  }

  function getDefaultFavicon(websiteUrl: string): string {
    try {
      const hostname = new URL(websiteUrl).hostname
      const letter = hostname[0].toUpperCase()

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" fill="#e0e0e0" rx="4"/>
          <text x="16" y="22" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#666">${letter}</text>
        </svg>
      `
      return `data:image/svg+xml;base64,${btoa(svg)}`
    } catch {
      return ''
    }
  }

  function handleError() {
    error.value = true
    faviconUrl.value = getDefaultFavicon(url)
  }

  onMounted(() => {
    loadFavicon()
  })

  watch(() => url, () => {
    loadFavicon()
  })

  return {
    faviconUrl,
    loading,
    error,
    handleError,
    reload: loadFavicon
  }
}
