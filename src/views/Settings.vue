<template>
  <n-modal
    :show="show"
    preset="card"
    class="settings-modal"
    :style="{ width: '900px' }"
    :segmented="false"
    :bordered="false"
    mask-closable
    :auto-focus="false"
    @update:show="handleShowChange"
  >
    <template #header>
      应用设置
    </template>
    <div class="settings-view">
      <n-tabs
        v-model:value="activeTab"
        type="line"
        animated
      >
        <n-tab-pane
          name="general"
          tab="常规设置"
        >
          <n-form
            label-placement="left"
            label-width="120"
            class="settings-form"
          >
            <n-form-item label="主题">
              <n-select
                v-model:value="configStore.config.theme"
                :options="themeOptions"
                @update:value="handleThemeChange"
              />
            </n-form-item>

            <n-form-item label="显示网站图标">
              <n-switch
                v-model:value="configStore.config.showFavicon"
                @update:value="handleConfigUpdate"
              />
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <n-tab-pane
          name="ai"
          tab="AI 功能"
        >
          <n-form
            label-placement="left"
            label-width="140"
          >
            <n-form-item label="启用语义搜索">
              <n-switch
                v-model:value="configStore.config.enableSemanticSearch"
                @update:value="handleSemanticSearchToggle"
              />
              <template #help>
                启用后将使用AI进行语义搜索，提升搜索准确性
              </template>
            </n-form-item>

            <template v-if="configStore.config.enableSemanticSearch">
              <n-form-item label="AI API 提供商">
                <n-radio-group
                  v-model:value="configStore.config.aiApiProvider"
                  @update:value="handleApiProviderChange"
                >
                  <n-radio value="siliconflow">
                    硅基流动（推荐）
                  </n-radio>
                  <n-radio value="openai">
                    OpenAI
                  </n-radio>
                </n-radio-group>
                <template #help>
                  硅基流动提供高性价比的AI服务，支持中文优化模型。OpenAI提供全球标准服务。
                </template>
              </n-form-item>

              <!-- OpenAI 配置 -->
              <template v-if="configStore.config.aiApiProvider === 'openai'">
                <n-form-item label="OpenAI API 密钥">
                  <n-input
                    v-model:value="configStore.config.openaiApiKey"
                    type="password"
                    placeholder="sk-..."
                    @update:value="handleApiKeyChange"
                  />
                  <template #help>
                    从 OpenAI 获取 API 密钥
                  </template>
                </n-form-item>
              </template>

              <!-- 硅基流动API配置 -->
              <template v-else>
                <n-form-item label="API Base URL">
                  <n-input
                    v-model:value="configStore.config.siliconflowApiBaseUrl"
                    placeholder="https://api.siliconflow.cn/v1"
                    @update:value="handleSiliconflowBaseUrlChange"
                  />
                  <template #help>
                    硅基流动 API 服务地址，留空使用默认值
                  </template>
                </n-form-item>

                <n-form-item label="API 密钥">
                  <n-input
                    v-model:value="configStore.config.siliconflowApiKey"
                    type="password"
                    placeholder="sk-..."
                    @update:value="handleApiKeyChange"
                  />
                  <template #help>
                    硅基流动 API 密钥，<a
                      href="https://cloud.siliconflow.cn"
                      target="_blank"
                      style="color: var(--n-text-color-primary); text-decoration: underline;"
                    >免费注册</a>获取
                  </template>
                </n-form-item>
              </template>

              <!-- 模型配置 -->
              <n-form-item label="Embedding 模型">
                <n-input
                  v-model:value="configStore.config.embeddingModel"
                  :placeholder="configStore.config.aiApiProvider === 'siliconflow' ? 'BAAI/bge-m3' : 'text-embedding-3-small'"
                  @update:value="handleEmbeddingModelChange"
                />
                <template #help>
                  用于生成向量嵌入的模型。硅基流动推荐：BAAI/bge-m3（多语言）
                </template>
              </n-form-item>

              <n-form-item label="聊天模型">
                <n-input
                  v-model:value="configStore.config.chatModel"
                  :placeholder="configStore.config.aiApiProvider === 'siliconflow' ? 'Qwen/Qwen3-8B' : 'gpt-4o-mini'"
                  @update:value="handleChatModelChange"
                />
                <template #help>
                  用于AI标签生成的聊天模型。硅基流动 2025 最新免费模型：Qwen/Qwen3-8B
                </template>
              </n-form-item>

              <!-- 搜索权重配置 -->
              <n-form-item label="语义搜索权重">
                <n-slider
                  v-model:value="configStore.config.semanticWeight"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  @update:value="handleConfigUpdate"
                />
                <template #help>
                  语义搜索结果的权重，关键词搜索权重 = 1 - 语义权重
                </template>
              </n-form-item>

              <!-- 连接测试 -->
              <n-form-item label="API 连接状态">
                <n-space>
                  <n-tag
                    :type="semanticSearchStatus.isConnected ? 'success' : 'error'"
                    size="small"
                  >
                    {{ semanticSearchStatus.isConnected ? '已连接' : '未连接' }}
                  </n-tag>
                  <n-button
                    size="small"
                    :loading="testingConnection"
                    @click="testApiConnection"
                  >
                    测试连接
                  </n-button>
                </n-space>
                <template #help>
                  {{ semanticSearchStatus.lastError || '验证AI API连接状态' }}
                </template>
              </n-form-item>

              <!-- 使用建议 -->
              <n-card
                title="使用建议"
                size="small"
                embedded
              >
                <n-space
                  vertical
                  size="small"
                >
                  <div>
                    <strong>🚀 推荐选择：</strong>硅基流动提供优秀的中文语义理解能力，成本更低
                  </div>
                  <div>
                    <strong>💰 成本控制：</strong>按使用量收费，免费额度充足，适合个人使用
                  </div>
                  <div>
                    <strong>⚡ 性能优化：</strong>向量数据缓存在本地，重复搜索不消耗API额度
                  </div>
                  <div>
                    <strong>🔧 技术支持：</strong>支持任何OpenAI兼容的API服务，可随时切换
                  </div>
                  <div>
                    <strong>🛡️ 数据安全：</strong>所有向量计算在本地进行，API仅用于生成embedding
                  </div>
                </n-space>
              </n-card>
            </template>

            <!-- 网页元数据提取 -->
            <n-divider title-placement="left">
              网页元数据提取
            </n-divider>

            <n-form-item label="LinkPreview API Key">
              <n-input
                v-model:value="configStore.config.linkPreviewApiKey"
                type="password"
                placeholder="your-linkpreview-api-key"
                @update:value="handleLinkPreviewApiKeyChange"
              />
              <template #help>
                用于自动获取网页标题和描述。<a
                  href="https://my.linkpreview.net"
                  target="_blank"
                  style="color: var(--n-text-color-primary); text-decoration: underline;"
                >免费注册</a>可获得60次/小时额度，留空将使用降级方案
              </template>
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <n-tab-pane
          name="data"
          tab="数据管理"
        >
          <n-space
            vertical
            size="large"
          >
            <n-card
              title="本地备份"
              size="small"
            >
              <n-space
                vertical
                size="large"
              >
                <div style="color: var(--n-text-color-2); font-size: 13px;">
                  导出所有书签、分类和配置到 JSON 文件，可用于恢复数据或迁移到其他设备
                </div>

                <n-space>
                  <n-button
                    type="primary"
                    @click="handleExport"
                  >
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24"><path
                          fill="currentColor"
                          d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M12,19L16,15H13.5V12H10.5V15H8L12,19Z"
                        /></svg>
                      </n-icon>
                    </template>
                    导出完整备份
                  </n-button>

                  <n-button @click="handleImport">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24"><path
                          fill="currentColor"
                          d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"
                        /></svg>
                      </n-icon>
                    </template>
                    导入备份
                  </n-button>
                </n-space>
              </n-space>
            </n-card>

            <n-card
              title="数据统计"
              size="small"
            >
              <n-space vertical>
                <div>书签总数: {{ bookmarkStore.bookmarkCount }}</div>
                <div>分类数量: {{ bookmarkStore.categoryCount }}</div>
              </n-space>
            </n-card>

            <n-card
              v-if="isChromeExtension()"
              title="Chrome 书签同步"
              size="small"
            >
              <n-space
                vertical
                size="large"
              >
                <div style="color: var(--n-text-color-2); font-size: 13px;">
                  将 Chrome 书签栏的书签增量同步到 Navigator，仅同步新增、更新和删除的书签
                </div>

                <n-space
                  vertical
                  size="small"
                >
                  <div
                    v-if="configStore.config.lastChromeSyncTime"
                    style="font-size: 13px; color: var(--n-text-color-3);"
                  >
                    上次同步时间: {{ formatSyncTime(configStore.config.lastChromeSyncTime) }}
                  </div>
                  <div
                    v-else
                    style="font-size: 13px; color: var(--n-text-color-3);"
                  >
                    尚未同步
                  </div>
                </n-space>

                <n-space>
                  <n-button
                    type="primary"
                    :loading="syncingChrome"
                    @click="handleSyncFromChrome"
                  >
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24"><path
                          fill="currentColor"
                          d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z"
                        /></svg>
                      </n-icon>
                    </template>
                    {{ syncingChrome ? '同步中...' : '立即同步' }}
                  </n-button>
                </n-space>

                <div
                  v-if="syncResult"
                  class="sync-result"
                >
                  <n-alert
                    :type="syncResult.type"
                    closable
                    @close="syncResult = null"
                  >
                    {{ syncResult.message }}
                  </n-alert>
                </div>
              </n-space>
            </n-card>

            <n-card
              title="危险操作"
              size="small"
            >
              <n-space vertical>
                <n-button
                  type="error"
                  @click="handleClearData"
                >
                  <template #icon>
                    <n-icon>
                      <svg viewBox="0 0 24 24"><path
                        fill="currentColor"
                        d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"
                      /></svg>
                    </n-icon>
                  </template>
                  清空所有数据
                </n-button>
              </n-space>
            </n-card>
          </n-space>
        </n-tab-pane>

        <n-tab-pane
          name="about"
          tab="关于"
        >
          <n-space
            vertical
            size="large"
          >
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
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NCard, NTabs, NTabPane, NForm, NFormItem, NSelect, NRadioGroup, NRadio, NSwitch, NSpace, NButton, NIcon, NTag, NSlider, NInput, NDivider, NAlert, useMessage, useDialog } from 'naive-ui'
import { useConfigStore } from '@/stores/config'
import { useBookmarkStore } from '@/stores/bookmark'
import { storageManager } from '@/utils/storage'
import { downloadFile } from '@/utils/export'
import { embeddingService } from '@/utils/embedding'
import { isChromeExtension } from '@/services/chrome-bookmarks'

interface Props {
  show: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const configStore = useConfigStore()
const bookmarkStore = useBookmarkStore()
const message = useMessage()
const dialog = useDialog()

const activeTab = ref<'general' | 'theme' | 'ai' | 'data' | 'about'>('general')

// AI 功能相关状态
const testingConnection = ref(false)
const semanticSearchStatus = ref({
  isConnected: configStore.config.apiConnectionStatus === 'connected',
  lastError: configStore.config.apiConnectionMessage || ''
})

function handleShowChange(value: boolean) {
  emit('update:show', value)
}

watch(
  () => [
    configStore.config.apiConnectionStatus,
    configStore.config.apiConnectionMessage
  ],
  ([status, message]) => {
    semanticSearchStatus.value = {
      isConnected: status === 'connected',
      lastError: message || ''
    }
  }
)

const themeOptions = [
  { label: '自动', value: 'auto' },
  { label: '明亮', value: 'light' },
  { label: '暗黑', value: 'dark' }
]


let rebuildTimer: number | null = null

function scheduleSearchRebuild(delay = 500) {
  if (rebuildTimer) {
    window.clearTimeout(rebuildTimer)
  }
  rebuildTimer = window.setTimeout(() => {
    bookmarkStore.updateSearchConfig().catch(error => {
      console.error('搜索引擎重建失败:', error)
    })
  }, delay)
}

async function handleThemeChange(value: string) {
  await configStore.setTheme(value as any)
}


async function handleConfigUpdate() {
  await configStore.updateConfig(configStore.config)
  message.success('设置已保存')
}

function handleImport() {
  // 关闭设置弹窗
  emit('update:show', false)
  // 触发导入事件，由父组件处理
  document.dispatchEvent(new CustomEvent('navigator-import'))
}

async function handleExport() {
  try {
    // 使用 storageManager.exportData() 导出完整备份（包含书签、分类和配置）
    const jsonData = await storageManager.exportData()
    const filename = `navigator-backup-${new Date().toISOString().split('T')[0]}.json`
    downloadFile(jsonData, filename, 'application/json')
    message.success('完整备份已导出（包含书签、分类和配置）')
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
        await configStore.resetConfig()
        message.success('数据已清空')
      } catch (error) {
        message.error('清空失败')
        console.error(error)
      }
    }
  })
}

// AI 功能相关方法
async function handleSemanticSearchToggle(enabled: boolean) {
  await configStore.updateSemanticSearchConfig({ enableSemanticSearch: enabled })
  if (enabled) {
    message.info('语义搜索已启用，请配置API信息')
  } else {
    message.info('语义搜索已禁用')
  }
  // 重新初始化搜索引擎
  await bookmarkStore.updateSearchConfig()
}

async function handleApiProviderChange(provider: 'openai' | 'siliconflow') {
  const updates: {
    aiApiProvider: 'openai' | 'siliconflow'
    siliconflowApiBaseUrl?: string
    siliconflowApiKey?: string
    openaiApiKey?: string
  } = { aiApiProvider: provider }
  if (provider === 'openai') {
    updates.siliconflowApiBaseUrl = ''
    updates.siliconflowApiKey = ''
  } else {
    updates.openaiApiKey = ''
  }

  await configStore.updateSemanticSearchConfig(updates)
  message.success(`已切换到${provider === 'openai' ? 'OpenAI' : '硅基流动'}`)
  await bookmarkStore.updateSearchConfig()
}

async function handleApiKeyChange(apiKey: string) {
  const provider = configStore.config.aiApiProvider || 'openai'
  if (provider === 'openai') {
    await configStore.updateSemanticSearchConfig({ openaiApiKey: apiKey })
  } else {
    await configStore.updateSemanticSearchConfig({ siliconflowApiKey: apiKey })
  }
  scheduleSearchRebuild()
  message.success('API配置已更新')
}

async function handleSiliconflowBaseUrlChange(baseUrl: string) {
  await configStore.updateSemanticSearchConfig({ siliconflowApiBaseUrl: baseUrl })
  message.success('API Base URL 已保存')
}

async function handleEmbeddingModelChange(model: string) {
  await configStore.updateSemanticSearchConfig({ embeddingModel: model })
  scheduleSearchRebuild(800)
  message.success('Embedding 模型已保存')
}

async function handleChatModelChange(model: string) {
  await configStore.updateSemanticSearchConfig({ chatModel: model })
  message.success('聊天模型已保存')
}

async function testApiConnection() {
  const provider = configStore.config.aiApiProvider || 'openai'
  const hasApiKey = provider === 'openai'
    ? configStore.config.openaiApiKey?.trim()
    : configStore.config.siliconflowApiKey?.trim()

  if (!hasApiKey) {
    semanticSearchStatus.value = {
      isConnected: false,
      lastError: '请先输入API密钥'
    }
    return
  }

  testingConnection.value = true
  try {
    await configStore.syncAiClients()
    const status = await embeddingService.getUsageStats()
    semanticSearchStatus.value = {
      isConnected: status.isConnected,
      lastError: status.isConnected ? '' : '连接失败，请检查API配置'
    }
    configStore.updateConfig({
      apiConnectionStatus: status.isConnected ? 'connected' : 'disconnected',
      apiConnectionMessage: semanticSearchStatus.value.lastError,
      apiLastTestedAt: new Date().toISOString()
    })

    if (status.isConnected) {
      message.success('API连接成功')
      // 重新初始化搜索引擎
      await bookmarkStore.updateSearchConfig()
    } else {
      message.error('API连接失败')
    }
  } catch (error) {
    semanticSearchStatus.value = {
      isConnected: false,
      lastError: '连接测试失败'
    }
    configStore.updateConfig({
      apiConnectionStatus: 'disconnected',
      apiConnectionMessage: '连接测试失败',
      apiLastTestedAt: new Date().toISOString()
    })
    message.error('连接测试失败')
  } finally {
    testingConnection.value = false
  }
}

async function handleLinkPreviewApiKeyChange(apiKey: string) {
  configStore.updateConfig({ linkPreviewApiKey: apiKey })
  message.success('LinkPreview API Key 已保存')
}

// Chrome 同步相关
const syncingChrome = ref(false)
const syncResult = ref<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null)

async function handleSyncFromChrome() {
  syncingChrome.value = true
  syncResult.value = null

  try {
    const result = await bookmarkStore.syncFromChrome()
    const totalChanges = result.added + result.updated + result.deleted

    if (totalChanges === 0) {
      syncResult.value = {
        type: 'success',
        message: '同步完成，没有变化'
      }
    } else {
      syncResult.value = {
        type: 'success',
        message: `同步成功！新增 ${result.added} 个，更新 ${result.updated} 个，删除 ${result.deleted} 个`
      }
    }
    message.success('Chrome 书签同步完成')
  } catch (error) {
    console.error('Chrome sync failed:', error)
    syncResult.value = {
      type: 'error',
      message: `同步失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
    message.error('Chrome 书签同步失败')
  } finally {
    syncingChrome.value = false
  }
}


function formatSyncTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '无效时间'
  }
}
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-modal :deep(.n-card__content) {
  padding-top: 0;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
