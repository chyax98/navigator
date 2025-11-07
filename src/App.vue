<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-loading-bar-provider>
          <AppContent />
        </n-loading-bar-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, NLoadingBarProvider, darkTheme, zhCN, dateZhCN } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import AppContent from './components/AppContent.vue'
import { useConfigStore } from './stores/config'
import { useBookmarkStore } from './stores/bookmark'

const configStore = useConfigStore()
const bookmarkStore = useBookmarkStore()

// 低调商务风格主题配置
const themeOverrides: GlobalThemeOverrides = {
  common: {
    // 主色调：低调的蓝灰色（类似 Chrome）
    primaryColor: '#5F6368',
    primaryColorHover: '#4D5156',
    primaryColorPressed: '#3C4043',
    primaryColorSuppl: '#80868B',

    // 信息色：柔和的蓝色
    infoColor: '#1A73E8',
    infoColorHover: '#1765CC',
    infoColorPressed: '#1557B0',
    infoColorSuppl: '#4285F4',

    // 成功色：低调的深绿
    successColor: '#137333',
    successColorHover: '#0D652D',
    successColorPressed: '#0A5325',
    successColorSuppl: '#188038',

    // 警告色：适度的橙色
    warningColor: '#EA8600',
    warningColorHover: '#C77700',
    warningColorPressed: '#A86400',
    warningColorSuppl: '#F9AB00',

    // 错误色：柔和的红色
    errorColor: '#C5221F',
    errorColorHover: '#A5191D',
    errorColorPressed: '#8C141A',
    errorColorSuppl: '#D93025',

    // 边框和背景色
    borderRadius: '8px'
  },
  Button: {
    // 按钮圆角更圆润
    borderRadiusMedium: '8px',
    borderRadiusSmall: '6px',
    borderRadiusLarge: '10px'
  },
  Card: {
    borderRadius: '12px'
  },
  Input: {
    borderRadius: '8px'
  },
  Select: {
    borderRadius: '8px'
  }
}

// 主题配置
const theme = computed(() => {
  if (configStore.config.theme === 'dark') {
    return darkTheme
  }
  return null
})

// 初始化应用
onMounted(async () => {
  // 加载配置
  await configStore.loadConfig()

  // 应用主题
  const themeValue = configStore.config.theme
  if (themeValue === 'auto') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', themeValue)
  }

  // 加载书签数据
  await bookmarkStore.loadBookmarks()
})
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
