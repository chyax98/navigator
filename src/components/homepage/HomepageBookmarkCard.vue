<template>
  <div
    class="homepage-bookmark-card"
    :class="{ dragging: dragging }"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <div class="card-content">
      <!-- Favicon -->
      <div class="bookmark-icon">
        <img
          v-if="faviconUrl"
          :src="faviconUrl"
          :alt="bookmark?.title"
          class="favicon"
          @error="handleFaviconError"
        >
        <n-icon
          v-else
          :size="24"
          :component="BookmarkOutline"
          class="fallback-icon"
        />
      </div>

      <!-- 标题、URL 和描述 -->
      <div class="bookmark-info">
        <div class="bookmark-title">
          {{ bookmark?.title || '未命名书签' }}
        </div>
        <div class="bookmark-url">
          {{ displayUrl }}
        </div>
        <div
          v-if="bookmark?.description"
          class="bookmark-description"
          :title="bookmark.description"
        >
          {{ bookmark.description }}
        </div>
        <div
          v-else
          class="bookmark-description no-description"
        >
          暂无描述
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { BookmarkOutline } from '@vicons/ionicons5'
import type { HomepageItem } from '@/types/homepage'
import type { Bookmark } from '@/types/bookmark'
import { useFavicon } from '@/composables/useFavicon'

/**
 * 组件 Props
 */
interface Props {
  /** 主页书签项 */
  item: HomepageItem
  /** 关联的书签对象 */
  bookmark: Bookmark | undefined
  /** 是否正在拖拽 */
  dragging?: boolean
  /** 网格列数（用于计算卡片尺寸） */
  columns: number
}

const props = withDefaults(defineProps<Props>(), {
  dragging: false,
  columns: 6
})

/**
 * 组件 Emits
 */
interface Emits {
  /** 卡片被点击 */
  (e: 'click', bookmark: Bookmark): void
  /** 右键菜单 */
  (e: 'contextmenu', event: MouseEvent): void
}

const emit = defineEmits<Emits>()

/**
 * Favicon 缓存加载
 */
const { faviconUrl, handleError: handleFaviconError } = useFavicon(
  props.bookmark?.url || '',
  props.bookmark?.favicon
)

/**
 * 显示的 URL（截断过长的 URL）
 */
const displayUrl = computed(() => {
  if (!props.bookmark?.url) return ''

  try {
    const url = new URL(props.bookmark.url)
    const hostname = url.hostname.replace(/^www\./, '')
    return hostname
  } catch {
    return props.bookmark.url.substring(0, 30) + '...'
  }
})

/**
 * 处理卡片点击
 */
function handleClick() {
  if (props.bookmark) {
    emit('click', props.bookmark)
  }
}

/**
 * 处理右键菜单
 */
function handleContextMenu(event: MouseEvent) {
  emit('contextmenu', event)
}

/**
 * 处理 Favicon 加载失败
 */
// handleFaviconError 已移至 useFavicon composable
</script>

<style scoped>
.homepage-bookmark-card {
  position: relative;
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-base);
  user-select: none;
  height: 140px; /* 增加高度以容纳描述 */
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}

.homepage-bookmark-card:hover {
  border-color: var(--n-primary-color);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.homepage-bookmark-card:active {
  transform: translateY(0);
}

.homepage-bookmark-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  height: 100%;
}

.bookmark-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-2);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.favicon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.fallback-icon {
  color: var(--n-text-color-3);
}

.bookmark-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.bookmark-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--n-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-url {
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-description {
  font-size: 11px;
  color: var(--n-text-color-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-description.no-description {
  color: var(--n-text-color-3);
  font-style: italic;
}

/* 移动端优化 */
@media (max-width: 800px) {
  .homepage-bookmark-card {
    height: 100px;
    padding: 12px;
  }

  .bookmark-icon {
    width: 40px;
    height: 40px;
  }

  .favicon {
    width: 24px;
    height: 24px;
  }

  .bookmark-title {
    font-size: 13px;
  }

  .bookmark-url {
    font-size: 11px;
  }
}
</style>
