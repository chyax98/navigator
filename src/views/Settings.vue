<template>
  <div class="settings-view">
    <n-card title="设置">
      <n-tabs type="line">
        <n-tab-pane name="general" tab="常规设置">
          <n-form label-placement="left" label-width="120">
            <n-form-item label="主题">
              <n-select
                v-model:value="configStore.config.theme"
                :options="themeOptions"
                @update:value="handleThemeChange"
              />
            </n-form-item>

            <n-form-item label="语言">
              <n-select
                v-model:value="configStore.config.language"
                :options="languageOptions"
                @update:value="handleLanguageChange"
              />
            </n-form-item>

            <n-form-item label="默认视图">
              <n-radio-group
                v-model:value="configStore.config.defaultView"
                @update:value="handleViewChange"
              >
                <n-radio value="grid">网格</n-radio>
                <n-radio value="list">列表</n-radio>
              </n-radio-group>
            </n-form-item>

            <n-form-item label="显示网站图标">
              <n-switch
                v-model:value="configStore.config.showFavicon"
                @update:value="handleConfigUpdate"
              />
            </n-form-item>

            <n-form-item label="启用动画">
              <n-switch
                v-model:value="configStore.config.enableAnimations"
                @update:value="handleConfigUpdate"
              />
            </n-form-item>

            <n-form-item label="启用拖拽排序">
              <n-switch
                v-model:value="configStore.config.enableDragSort"
                @update:value="handleConfigUpdate"
              />
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <n-tab-pane name="theme" tab="主题自定义">
          <ThemeCustomizer />
        </n-tab-pane>

        <n-tab-pane name="data" tab="数据管理">
          <n-space vertical size="large">
            <n-card title="导入导出" size="small">
              <n-space vertical>
                <n-button @click="handleImport">
                  <template #icon>
                    <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/></svg></n-icon>
                  </template>
                  导入书签
                </n-button>

                <n-button @click="handleExport">
                  <template #icon>
                    <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M12,19L16,15H13.5V12H10.5V15H8L12,19Z"/></svg></n-icon>
                  </template>
                  导出书签
                </n-button>
              </n-space>
            </n-card>

            <n-card title="数据统计" size="small">
              <n-space vertical>
                <div>书签总数: {{ bookmarkStore.bookmarkCount }}</div>
                <div>分类数量: {{ bookmarkStore.categoryCount }}</div>
              </n-space>
            </n-card>

            <n-card title="危险操作" size="small">
              <n-space vertical>
                <n-button type="error" @click="handleClearData">
                  <template #icon>
                    <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg></n-icon>
                  </template>
                  清空所有数据
                </n-button>
              </n-space>
            </n-card>
          </n-space>
        </n-tab-pane>

        <n-tab-pane name="about" tab="关于">
          <n-space vertical size="large">
            <div>
              <h2>Navigator</h2>
              <p>版本: 0.1.0</p>
              <p>轻量级个人导航站</p>
            </div>

            <div>
              <h3>技术栈</h3>
              <n-space>
                <n-tag>Vue3</n-tag>
                <n-tag>TypeScript</n-tag>
                <n-tag>Naive UI</n-tag>
                <n-tag>Fuse.js</n-tag>
              </n-space>
            </div>
          </n-space>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NCard, NTabs, NTabPane, NForm, NFormItem, NSelect, NRadioGroup, NRadio, NSwitch, NSpace, NButton, NIcon, NTag, useMessage, useDialog } from 'naive-ui'
import { useConfigStore } from '@/stores/config'
import { useBookmarkStore } from '@/stores/bookmark'
import { storageManager } from '@/utils/storage'
import { exportToJSON, downloadFile } from '@/utils/export'
import ThemeCustomizer from '@/components/settings/ThemeCustomizer.vue'

const router = useRouter()
const configStore = useConfigStore()
const bookmarkStore = useBookmarkStore()
const message = useMessage()
const dialog = useDialog()

const themeOptions = [
  { label: '自动', value: 'auto' },
  { label: '明亮', value: 'light' },
  { label: '暗黑', value: 'dark' }
]

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

function handleThemeChange(value: string) {
  configStore.setTheme(value as any)
}

function handleLanguageChange(value: string) {
  configStore.setLanguage(value)
}

function handleViewChange() {
  handleConfigUpdate()
}

function handleConfigUpdate() {
  configStore.updateConfig(configStore.config)
  message.success('设置已保存')
}

function handleImport() {
  router.push('/import')
}

async function handleExport() {
  try {
    const data = await bookmarkStore.exportBookmarks()
    const json = exportToJSON(data.bookmarks, data.categories)
    const filename = `bookmarks_${new Date().toISOString().split('T')[0]}.json`
    downloadFile(json, filename, 'application/json')
    message.success('导出成功')
  } catch (error) {
    message.error('导出失败')
    console.error(error)
  }
}

function handleClearData() {
  dialog.warning({
    title: '确认清空',
    content: '此操作将清空所有书签和设置，且无法恢复，确定继续吗？',
    positiveText: '确定清空',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await storageManager.clearAll()
        bookmarkStore.bookmarks = []
        bookmarkStore.categories = []
        configStore.resetConfig()
        message.success('数据已清空')
      } catch (error) {
        message.error('清空失败')
        console.error(error)
      }
    }
  })
}
</script>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
}
</style>
