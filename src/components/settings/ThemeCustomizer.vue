<template>
  <n-card title="主题自定义">
    <n-space vertical size="large">
      <!-- 颜色配置 -->
      <n-form-item label="主题色">
        <n-color-picker
          v-model:value="themeConfig.primaryColor"
          :swatches="colorPresets"
          @update:value="handleThemeUpdate"
        />
      </n-form-item>

      <n-form-item label="强调色">
        <n-color-picker
          v-model:value="themeConfig.accentColor"
          :swatches="colorPresets"
          @update:value="handleThemeUpdate"
        />
      </n-form-item>

      <!-- 圆角配置 -->
      <n-form-item label="圆角大小">
        <n-radio-group v-model:value="themeConfig.borderRadius" @update:value="handleThemeUpdate">
          <n-radio value="small">小</n-radio>
          <n-radio value="medium">中</n-radio>
          <n-radio value="large">大</n-radio>
        </n-radio-group>
      </n-form-item>

      <!-- 字体大小 -->
      <n-form-item label="字体大小">
        <n-slider
          v-model:value="fontSizeValue"
          :min="12"
          :max="18"
          :step="2"
          :marks="{ 12: '小', 14: '中', 16: '大', 18: '超大' }"
          @update:value="handleFontSizeChange"
        />
      </n-form-item>

      <!-- 卡片阴影 -->
      <n-form-item label="卡片阴影">
        <n-switch v-model:value="themeConfig.cardShadow" @update:value="handleThemeUpdate" />
      </n-form-item>

      <!-- 网格列数 -->
      <n-form-item label="每行显示">
        <n-slider
          v-model:value="themeConfig.gridColumns"
          :min="2"
          :max="6"
          :step="1"
          :marks="{ 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' }"
          @update:value="handleThemeUpdate"
        />
      </n-form-item>

      <!-- 卡片间距 -->
      <n-form-item label="卡片间距">
        <n-slider
          v-model:value="themeConfig.cardSpacing"
          :min="8"
          :max="32"
          :step="4"
          :marks="{ 8: '紧凑', 16: '适中', 24: '宽松', 32: '超宽松' }"
          @update:value="handleThemeUpdate"
        />
      </n-form-item>

      <!-- 预设主题 -->
      <n-form-item label="预设主题">
        <n-space>
          <n-button @click="applyPreset('default')">默认</n-button>
          <n-button @click="applyPreset('ocean')">海洋</n-button>
          <n-button @click="applyPreset('forest')">森林</n-button>
          <n-button @click="applyPreset('sunset')">日落</n-button>
          <n-button @click="applyPreset('dark')">暗夜</n-button>
        </n-space>
      </n-form-item>

      <!-- 重置按钮 -->
      <n-button block type="warning" @click="resetTheme">
        恢复默认主题
      </n-button>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { ThemeConfig } from '@/types/config'

const configStore = useConfigStore()
const themeConfig = computed(() => configStore.config.themeConfig)

const colorPresets = [
  '#18a058', // 默认绿色
  '#2080f0', // 蓝色
  '#f0a020', // 橙色
  '#d03050', // 红色
  '#722ed1', // 紫色
  '#eb2f96', // 粉色
  '#13c2c2', // 青色
  '#52c41a', // 草绿
]

const themePresets: Record<string, Partial<ThemeConfig>> = {
  default: {
    primaryColor: '#18a058',
    accentColor: '#2080f0',
    borderRadius: 'medium',
    fontSize: 'medium',
    cardShadow: true,
    gridColumns: 4,
    cardSpacing: 16
  },
  ocean: {
    primaryColor: '#2080f0',
    accentColor: '#40a9ff',
    borderRadius: 'large',
    fontSize: 'medium',
    cardShadow: true,
    gridColumns: 3,
    cardSpacing: 20
  },
  forest: {
    primaryColor: '#18a058',
    accentColor: '#52c41a',
    borderRadius: 'small',
    fontSize: 'medium',
    cardShadow: false,
    gridColumns: 4,
    cardSpacing: 12
  },
  sunset: {
    primaryColor: '#f0a020',
    accentColor: '#ff7a45',
    borderRadius: 'medium',
    fontSize: 'large',
    cardShadow: true,
    gridColumns: 3,
    cardSpacing: 24
  },
  dark: {
    primaryColor: '#722ed1',
    accentColor: '#eb2f96',
    borderRadius: 'medium',
    fontSize: 'medium',
    cardShadow: true,
    gridColumns: 4,
    cardSpacing: 16
  }
}

const fontSizeValue = computed({
  get: () => {
    const sizes = { small: 12, medium: 14, large: 16 }
    return sizes[themeConfig.value.fontSize]
  },
  set: (val) => {
    const sizes: Record<number, 'small' | 'medium' | 'large'> = { 12: 'small', 14: 'medium', 16: 'large', 18: 'large' }
    themeConfig.value.fontSize = sizes[val]
  }
})

function handleThemeUpdate() {
  configStore.updateConfig({ themeConfig: { ...themeConfig.value } })
  applyThemeToDOM()
}

function handleFontSizeChange(value: number) {
  fontSizeValue.value = value
  handleThemeUpdate()
}

function applyPreset(preset: string) {
  const presetConfig = themePresets[preset]
  if (presetConfig) {
    Object.assign(themeConfig.value, presetConfig)
    handleThemeUpdate()
  }
}

function resetTheme() {
  // 重置为默认值
  Object.assign(themeConfig.value, themePresets.default)
  handleThemeUpdate()
}

function applyThemeToDOM() {
  const root = document.documentElement

  // 应用CSS变量
  root.style.setProperty('--primary-color', themeConfig.value.primaryColor)
  root.style.setProperty('--accent-color', themeConfig.value.accentColor)

  // 应用圆角
  const radiusMap = { small: '6px', medium: '12px', large: '16px' }
  root.style.setProperty('--border-radius', radiusMap[themeConfig.value.borderRadius])

  // 应用字体大小
  const fontMap = { small: '13px', medium: '14px', large: '16px' }
  root.style.setProperty('--font-size', fontMap[themeConfig.value.fontSize])

  // 应用网格列数
  root.style.setProperty('--grid-columns', themeConfig.value.gridColumns.toString())

  // 应用卡片间距
  root.style.setProperty('--card-spacing', `${themeConfig.value.cardSpacing}px`)

  // 应用卡片阴影
  root.style.setProperty('--card-shadow-opacity', themeConfig.value.cardShadow ? '1' : '0')
}
</script>

<style scoped>
/* 主题自定义组件样式 */
.n-card {
  background: var(--n-color);
  border-radius: var(--border-radius);
}

.n-form-item {
  margin-bottom: 16px;
}

.n-slider {
  margin: 8px 0;
}

.n-button {
  border-radius: var(--border-radius);
}
</style>