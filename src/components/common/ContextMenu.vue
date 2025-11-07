<template>
  <div
    v-show="visible"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click="handleClick"
  >
    <div
      class="menu-item"
      @click="handleAddBookmark"
    >
      <n-icon class="menu-icon">
        <svg viewBox="0 0 24 24"><path
          fill="currentColor"
          d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"
        /></svg>
      </n-icon>
      <span>添加书签</span>
      <span class="shortcut">Ctrl+D</span>
    </div>

    <div
      v-if="clipboardUrl"
      class="menu-item"
      @click="handleAddFromClipboard"
    >
      <n-icon class="menu-icon">
        <svg viewBox="0 0 24 24"><path
          fill="currentColor"
          d="M19,20H5V4H7V7H17V4H19M12,10A1,1 0 0,1 13,11A1,1 0 0,1 12,12A1,1 0 0,1 11,11A1,1 0 0,1 12,10Z"
        /></svg>
      </n-icon>
      <span>从剪贴板添加</span>
    </div>

    <div class="menu-divider" />

    <div
      class="menu-item"
      @click="handleAddCategory"
    >
      <n-icon class="menu-icon">
        <svg viewBox="0 0 24 24"><path
          fill="currentColor"
          d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
        /></svg>
      </n-icon>
      <span>添加分类</span>
    </div>

    <div
      class="menu-item"
      @click="handleImport"
    >
      <n-icon class="menu-icon">
        <svg viewBox="0 0 24 24"><path
          fill="currentColor"
          d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"
        /></svg>
      </n-icon>
      <span>导入书签</span>
    </div>

    <div class="menu-divider" />

    <div
      class="menu-item"
      @click="handleRefresh"
    >
      <n-icon class="menu-icon">
        <svg viewBox="0 0 24 24"><path
          fill="currentColor"
          d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"
        /></svg>
      </n-icon>
      <span>刷新页面</span>
      <span class="shortcut">F5</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NIcon } from 'naive-ui'
import { useRouter } from 'vue-router'

interface Props {
  visible: boolean
  x: number
  y: number
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

// 检查剪贴板是否有URL
const clipboardUrl = ref('')

async function checkClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    const urlRegex = /^https?:\/\/.+/
    clipboardUrl.value = urlRegex.test(text) ? text : ''
  } catch (error) {
    // 剪贴板访问失败或用户拒绝
    clipboardUrl.value = ''
  }
}

// 点击其他地方关闭菜单
function handleClick() {
  emit('close')
}

// 快捷键事件处理
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// 组件挂载时的初始化
onMounted(() => {
  checkClipboard()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 菜单项处理函数
function handleAddBookmark() {
  emit('close')
  // 触发添加书签事件
  const event = new CustomEvent('add-bookmark')
  document.dispatchEvent(event)
}

function handleAddFromClipboard() {
  if (clipboardUrl.value) {
    emit('close')
    const event = new CustomEvent('add-bookmark-from-clipboard', {
      detail: { url: clipboardUrl.value }
    })
    document.dispatchEvent(event)
  }
}

function handleAddCategory() {
  emit('close')
  // 触发添加分类事件
  const event = new CustomEvent('add-category')
  document.dispatchEvent(event)
}

function handleImport() {
  emit('close')
  router.push('/import')
}

function handleRefresh() {
  emit('close')
  window.location.reload()
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(32, 128, 240, 0.08);
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
  z-index: 1000;
  min-width: 220px;
  padding: 8px 0;
  backdrop-filter: blur(16px);
}

[data-theme='dark'] .context-menu {
  background: rgba(24, 24, 28, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: var(--font-size);
  transition: background-color 0.2s;
}

.menu-item:hover {
  background: rgba(32, 128, 240, 0.12);
}

.menu-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.menu-item span {
  flex: 1;
}

.shortcut {
  font-size: 11px;
  opacity: 0.6;
  margin-left: 12px;
}

.menu-divider {
  height: 1px;
  background: rgba(32, 128, 240, 0.12);
  margin: 6px 14px;
}
</style>
