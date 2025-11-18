<template>
  <n-card
    size="small"
    title="布局设置"
    :bordered="true"
    class="layout-settings-panel"
  >
    <n-space
      vertical
      :size="16"
    >
      <!-- 列数设置 -->
      <div class="setting-item">
        <div class="setting-label">
          <span>网格列数</span>
          <span class="setting-value">{{ columns }}</span>
        </div>
        <n-slider
          v-model:value="columns"
          :min="GRID_COLUMN_CONSTRAINTS.MIN"
          :max="GRID_COLUMN_CONSTRAINTS.MAX"
          :step="1"
          :marks="{
            1: '1',
            2: '2',
            3: '3',
            4: '4',
            5: '5',
            6: '6'
          }"
          @update:value="handleColumnsChange"
        />
      </div>

      <!-- 说明文案 -->
      <n-alert
        type="info"
        :show-icon="false"
        style="font-size: 12px;"
      >
        此设置对所有视图生效
      </n-alert>

      <!-- 重置按钮 -->
      <n-space justify="end">
        <n-button
          size="small"
          @click="handleReset"
        >
          重置为默认
        </n-button>
      </n-space>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NCard, NSpace, NSlider, NButton, NAlert, useMessage } from 'naive-ui'
import { useConfigStore } from '@/stores/config'
import { GRID_COLUMN_CONSTRAINTS } from '@/types/config'

const configStore = useConfigStore()
const message = useMessage()

/**
 * 列数（本地状态）
 */
const columns = ref<number>(GRID_COLUMN_CONSTRAINTS.DEFAULT)

/**
 * 监听 store 中的列数变化，同步到本地状态
 */
watch(
  () => configStore.config.gridColumns,
  (newColumns) => {
    columns.value = newColumns
  },
  { immediate: true }
)

/**
 * 处理列数变更
 *
 * @param value - 新的列数
 */
function handleColumnsChange(value: number) {
  try {
    configStore.updateConfig({
      gridColumns: value
    })
  } catch (error) {
    console.error('Failed to update columns:', error)
    message.error('更新列数失败')
    // 恢复到 store 中的值
    columns.value = configStore.config.gridColumns
  }
}

/**
 * 重置为默认配置
 */
function handleReset() {
  try {
    configStore.updateConfig({
      gridColumns: GRID_COLUMN_CONSTRAINTS.DEFAULT
    })
    message.success('已重置为默认设置')
  } catch (error) {
    console.error('Failed to reset config:', error)
    message.error('重置失败')
  }
}
</script>

<style scoped>
.layout-settings-panel {
  min-width: 280px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.setting-value {
  font-weight: 600;
  color: var(--n-color-primary);
}
</style>
