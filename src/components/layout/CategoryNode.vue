<template>
  <div class="category-node">
    <div
      class="category-item"
      :class="{ selected, 'has-children': hasChildren }"
      :style="{ paddingLeft: `${level * 20 + 16}px` }"
      @click="handleSelect"
    >
      <!-- 展开/折叠按钮 -->
      <n-icon
        v-if="hasChildren"
        class="expand-icon"
        @click.stop="handleToggle"
      >
        <svg viewBox="0 0 24 24">
          <path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
        </svg>
      </n-icon>
      <div v-else class="expand-spacer"></div>

      <!-- 分类图标 -->
      <div class="category-icon-wrapper" v-if="category.color">
        <div class="category-icon" :style="{ backgroundColor: category.color }">
          <n-icon v-if="category.icon" size="14">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
          </n-icon>
        </div>
      </div>

      <!-- 分类名称 -->
      <span class="category-name">{{ category.name }}</span>

      <!-- 书签数量 -->
      <span class="category-count">{{ bookmarkCount }}</span>

      <!-- 操作按钮 -->
      <div class="category-actions" @click.stop>
        <n-dropdown trigger="hover" :options="actionOptions" @select="handleAction">
          <n-button text size="small">
            <n-icon size="14">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/></svg>
            </n-icon>
          </n-button>
        </n-dropdown>
      </div>
    </div>

    <!-- 子分类 -->
    <div v-if="hasChildren && (category.isExpanded !== false)" class="children">
      <CategoryNode
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        :selected="selectedCategoryId === child.id"
        :level="level + 1"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NButton, NDropdown, useMessage, useDialog } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Category } from '@/types/bookmark'

interface Props {
  category: Category
  selected: boolean
  level: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [categoryId: string]
  toggle: [categoryId: string]
}>()

const bookmarkStore = useBookmarkStore()
const message = useMessage()
const dialog = useDialog()

const hasChildren = computed(() => props.category.children && props.category.children.length > 0)
const bookmarkCount = computed(() => bookmarkStore.getCategoryBookmarks(props.category.id).length)

const actionOptions = [
  {
    label: '添加子分类',
    key: 'add-child',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z' })
    ])
  },
  {
    label: '编辑分类',
    key: 'edit',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z' })
    ])
  },
  {
    label: '删除分类',
    key: 'delete',
    icon: () => h('svg', { viewBox: '0 0 24 24' }, [
      h('path', { fill: 'currentColor', d: 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z' })
    ])
  }
]

function handleSelect() {
  emit('select', props.category.id)
}

function handleToggle() {
  props.category.isExpanded = !props.category.isExpanded
  emit('toggle', props.category.id)
}

function handleAction(key: string) {
  switch (key) {
    case 'add-child':
      // TODO: 实现添加子分类
      message.info('添加子分类功能开发中...')
      break
    case 'edit':
      // TODO: 实现编辑分类
      message.info('编辑分类功能开发中...')
      break
    case 'delete':
      handleDelete()
      break
  }
}

function handleDelete() {
  const childBookmarks = bookmarkStore.getCategoryBookmarks(props.category.id)
  const hasBookmarks = childBookmarks.length > 0

  dialog.warning({
    title: '确认删除',
    content: hasBookmarks
      ? `分类"${props.category.name}"包含 ${childBookmarks.length} 个书签���删除分类书签将被移到"未分类"。确定继续吗？`
      : `确定删除分类"${props.category.name}"吗？`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await bookmarkStore.deleteCategory(props.category.id)
        message.success('分类已删除')
      } catch (error) {
        message.error('删除失败')
        console.error(error)
      }
    }
  })
}
</script>

<style scoped>
.category-node {
  user-select: none;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: all 0.2s;
  margin: 1px 8px;
  position: relative;
}

.category-item:hover {
  background: var(--n-action-color);
}

.category-item:hover .category-actions {
  opacity: 1;
}

.category-item.selected {
  background: var(--primary-color);
  color: white;
}

.expand-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  transition: transform 0.2s;
  cursor: pointer;
}

.expand-spacer {
  width: 20px;
}

.category-icon-wrapper {
  margin-right: 8px;
}

.category-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.category-name {
  flex: 1;
  font-size: var(--font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 11px;
  opacity: 0.7;
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
  margin-right: 8px;
}

.selected .category-count {
  background: rgba(255, 255, 255, 0.2);
}

.category-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.children {
  position: relative;
}

.children::before {
  content: '';
  position: absolute;
  left: 28px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--n-border-color);
  opacity: 0.3;
}
</style>