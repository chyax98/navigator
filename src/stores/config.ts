/**
 * 配置状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppConfig, SessionData } from '@/types/config'
import { defaultConfig } from '@/types/config'
import { getStorage } from '@/utils/storage-factory'
import { embeddingService } from '@/utils/embedding'
import { aiServiceManager } from '@/services/ai/ai-service-manager'

// 使用工厂函数获取环境适配的存储实现
const storageManager = getStorage()

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<AppConfig>({ ...defaultConfig })
  const session = ref<SessionData>({
    authenticated: false,
    lastActivity: new Date(),
    sessionId: ''
  })

  // Actions
  async function loadConfig() {
    const saved = await storageManager.getConfig()
    if (saved) {
      config.value = { ...defaultConfig, ...saved }
    }

    // 异步同步AI客户端配置
    await syncAiClients()
  }

  async function updateConfig(updates: Partial<AppConfig>): Promise<void> {
    config.value = { ...config.value, ...updates }
    await storageManager.saveConfig(config.value)
  }

  async function setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    config.value.theme = theme
    await storageManager.saveConfig(config.value)
    applyTheme(theme)
  }

  async function setLanguage(language: string): Promise<void> {
    config.value.language = language
    await storageManager.saveConfig(config.value)
  }

  async function togglePasswordProtection(enabled: boolean): Promise<void> {
    config.value.passwordEnabled = enabled
    await storageManager.saveConfig(config.value)
  }

  function authenticate(success: boolean) {
    session.value.authenticated = success
    session.value.lastActivity = new Date()
    session.value.sessionId = success ? generateSessionId() : ''
  }

  function logout() {
    session.value.authenticated = false
    session.value.sessionId = ''
  }

  function isAuthenticated(): boolean {
    if (!config.value.passwordEnabled) return true
    return session.value.authenticated
  }

  async function resetConfig(): Promise<void> {
    config.value = { ...defaultConfig }
    await storageManager.saveConfig(config.value)
    await syncAiClients()
  }

  // AI API配置方法
  async function updateSemanticSearchConfig(updates: {
    enableSemanticSearch?: boolean
    semanticWeight?: number
    keywordWeight?: number
    siliconflowApiBaseUrl?: string
    siliconflowApiKey?: string
    embeddingModel?: string
    chatModel?: string
  }): Promise<void> {
    config.value = {
      ...config.value,
      ...updates
    }
    await storageManager.saveConfig(config.value)
    await syncAiClients()
  }

  function isSemanticSearchEnabled(): boolean {
    return config.value.enableSemanticSearch || false
  }

  function getSemanticSearchConfig() {
    const apiKey = config.value.siliconflowApiKey?.trim() ||
      import.meta.env.VITE_SILICONFLOW_API_KEY?.trim()

    return {
      enableSemanticSearch: config.value.enableSemanticSearch || false,
      semanticWeight: config.value.semanticWeight || 0.6,
      keywordWeight: config.value.keywordWeight || 0.4,
      hasApiKey: !!apiKey
    }
  }

  // 排序配置方法
  function setHomepageSortType(sortType: import('@/types/sort').BookmarkSortType) {
    config.value.homepageSortType = sortType
    void storageManager.saveConfig(config.value)
  }

  function setCategorySortType(sortType: import('@/types/sort').BookmarkSortType) {
    config.value.categorySortType = sortType
    void storageManager.saveConfig(config.value)
  }

  // Helper functions
  async function syncAiClients(): Promise<void> {
    try {
      const provider = 'siliconflow' as const

      const apiKey = config.value.siliconflowApiKey?.trim() ||
        import.meta.env.VITE_SILICONFLOW_API_KEY?.trim() ||
        ''

      const baseURL = config.value.siliconflowApiBaseUrl?.trim() ||
        import.meta.env.VITE_SILICONFLOW_BASE_URL?.trim() ||
        undefined

      const embeddingModel = config.value.embeddingModel || 'BAAI/bge-m3'
      const chatModel = config.value.chatModel || 'Qwen/Qwen2.5-7B-Instruct'

      aiServiceManager.updateConfig({
        provider,
        apiKey,
        baseURL,
        embeddingModel,
        chatModel
      })

      embeddingService.resetCache()
      aiServiceManager.resetClient()
    } catch (error) {
      console.error('同步AI客户端配置失败:', error)
    }
  }

  function applyTheme(theme: 'light' | 'dark' | 'auto') {
    const root = document.documentElement

    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }

  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  return {
    // State
    config,
    session,

    // Actions
    loadConfig,
    updateConfig,
    setTheme,
    setLanguage,
    togglePasswordProtection,
    authenticate,
    logout,
    isAuthenticated,
    resetConfig,

    // 语义搜索相关
    updateSemanticSearchConfig,
    isSemanticSearchEnabled,
    getSemanticSearchConfig,
    syncAiClients,

    // 排序相关
    setHomepageSortType,
    setCategorySortType
  }
})
