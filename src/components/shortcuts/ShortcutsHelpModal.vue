<template>
  <n-modal
    v-model:show="show"
    preset="card"
    title="⌨️ 快捷键帮助"
    style="width: 600px; max-width: 90vw"
  >
    <n-tabs
      type="line"
      animated
    >
      <n-tab-pane
        v-for="category in categories"
        :key="category"
        :name="category"
        :tab="category"
      >
        <n-list
          bordered
          style="background: transparent"
        >
          <n-list-item
            v-for="shortcut in getShortcutsByCategory(category)"
            :key="shortcut.key"
          >
            <template #prefix>
              <n-tag
                :bordered="false"
                type="info"
                size="small"
                class="shortcut-key"
              >
                {{ formatShortcut(shortcut.key) }}
              </n-tag>
            </template>
            <span class="shortcut-description">{{ shortcut.description }}</span>
          </n-list-item>
        </n-list>
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <div class="shortcuts-footer">
        <span class="footer-tip">💡 按 <n-tag
          size="small"
          :bordered="false"
        >?</n-tag> 随时查看快捷键</span>
        <n-button
          size="small"
          @click="show = false"
        >
          关闭
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NModal, NTabs, NTabPane, NList, NListItem, NTag, NButton } from 'naive-ui'
import { getCategories, formatShortcut, getShortcutsByCategory } from '@/config/shortcuts'

const show = ref(false)

const categories = computed(() => getCategories())

// 监听显示事件
function handleShowShortcuts() {
  show.value = true
}

onMounted(() => {
  document.addEventListener('show-shortcuts-help', handleShowShortcuts)
})

onUnmounted(() => {
  document.removeEventListener('show-shortcuts-help', handleShowShortcuts)
})
</script>

<style scoped>
.shortcut-key {
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-weight: 600;
  padding: 4px 8px;
  min-width: 80px;
  text-align: center;
}

.shortcut-description {
  font-size: 14px;
  color: var(--n-text-color);
}

.shortcuts-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
}

.footer-tip {
  font-size: 13px;
  color: var(--n-text-color-2);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
