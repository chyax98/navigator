/**
 * 配置状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppConfig, SessionData } from '@/types/config'
import { defaultConfig } from '@/types/config'
import { storageManager } from '@/utils/storage'

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<AppConfig>({ ...defaultConfig })
  const session = ref<SessionData>({
    authenticated: false,
    lastActivity: new Date(),
    sessionId: ''
  })

  // Actions
  function loadConfig() {
    const saved = storageManager.getConfig()
    if (saved) {
      config.value = { ...defaultConfig, ...saved }
      // 确保主题配置存在
      if (!config.value.themeConfig) {
        config.value.themeConfig = { ...defaultConfig.themeConfig }
      }
    }
    // 应用主题设置到DOM
    applyCustomTheme()
  }

  function updateConfig(updates: Partial<AppConfig>) {
    config.value = { ...config.value, ...updates }
    storageManager.saveConfig(config.value)
    // 如果更新了主题配置，应用到DOM
    if (updates.themeConfig) {
      applyCustomTheme()
    }
  }

  function setTheme(theme: 'light' | 'dark' | 'auto') {
    config.value.theme = theme
    storageManager.saveConfig(config.value)
    applyTheme(theme)
  }

  function setLanguage(language: string) {
    config.value.language = language
    storageManager.saveConfig(config.value)
  }

  function togglePasswordProtection(enabled: boolean) {
    config.value.passwordEnabled = enabled
    storageManager.saveConfig(config.value)
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

  function resetConfig() {
    config.value = { ...defaultConfig }
    storageManager.saveConfig(config.value)
  }

  // Helper functions
  function applyTheme(theme: 'light' | 'dark' | 'auto') {
    const root = document.documentElement

    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }

  function applyCustomTheme() {
    const root = document.documentElement
    const theme = config.value.themeConfig

    if (!theme) return

    // 应用CSS变量
    root.style.setProperty('--primary-color', theme.primaryColor)
    root.style.setProperty('--accent-color', theme.accentColor)

    // 应用圆角
    const radiusMap = { small: '6px', medium: '12px', large: '16px' }
    root.style.setProperty('--border-radius', radiusMap[theme.borderRadius])

    // 应用字体大小
    const fontMap = { small: '13px', medium: '14px', large: '16px' }
    root.style.setProperty('--font-size', fontMap[theme.fontSize])

    // 应用网格列数
    root.style.setProperty('--grid-columns', theme.gridColumns.toString())

    // 应用卡片间距
    root.style.setProperty('--card-spacing', `${theme.cardSpacing}px`)

    // 应用卡片阴影
    root.style.setProperty('--card-shadow-opacity', theme.cardShadow ? '1' : '0')
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
    resetConfig
  }
})
