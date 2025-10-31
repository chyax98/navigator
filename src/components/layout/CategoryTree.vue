<template>
  <div class="category-tree">
    <div class="category-item all-item" @click="selectCategory('all')">
      <n-icon class="category-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M4,6H20V18H4V6M6,8V16H18V8H6Z"/></svg>
      </n-icon>
      <span class="category-name">全部书签</span>
      <span class="category-count">{{ bookmarkStore.bookmarkCount }}</span>
    </div>

    <div
      v-for="category in categoryTree"
      :key="category.id"
      class="category-tree-node"
    >
      <CategoryNode
        :category="category"
        :selected="selectedCategoryId === category.id"
        :level="0"
        @select="selectCategory"
        @toggle="toggleCategory"
      />
    </div>

    <div class="add-category">
      <n-button text @click="showAddCategoryModal = true">
        <template #icon>
          <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></n-icon>
        </template>
        添加分类
      </n-button>
    </div>

    <!-- 添加分类弹窗 -->
    <n-modal v-model:show="showAddCategoryModal" preset="dialog" title="添加分类">
      <n-form :model="newCategory" label-placement="left" label-width="80">
        <n-form-item label="分类名称">
          <n-input v-model:value="newCategory.name" placeholder="输入分类名称" />
        </n-form-item>
        <n-form-item label="父分类">
          <n-select
            v-model:value="newCategory.parentId"
            :options="parentCategoryOptions"
            placeholder="选择父分类（可选）"
            clearable
          />
        </n-form-item>
        <n-form-item label="图标">
          <n-input v-model:value="newCategory.icon" placeholder="输入图标名称" />
        </n-form-item>
        <n-form-item label="颜���">
          <n-color-picker v-model:value="newCategory.color" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showAddCategoryModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddCategory">添加</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NIcon, NButton, NModal, NForm, NFormItem, NInput, NSelect, NColorPicker, NSpace } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Category } from '@/types/bookmark'
import CategoryNode from './CategoryNode.vue'

const bookmarkStore = useBookmarkStore()
const selectedCategoryId = computed(() => bookmarkStore.selectedCategoryId)
const categoryTree = computed(() => bookmarkStore.categoryTree)

const showAddCategoryModal = ref(false)
const newCategory = ref({
  name: '',
  parentId: '',
  icon: '',
  color: '#18a058'
})

// 父分类选项
const parentCategoryOptions = computed(() => {
  const options = [
    { label: '根分类', value: '' }
  ]

  function addCategoriesToList(categories: Category[], level = 0) {
    categories.forEach(category => {
      const indent = '　'.repeat(level)
      options.push({
        label: `${indent}${category.name}`,
        value: category.id
      })
      if (category.children) {
        addCategoriesToList(category.children, level + 1)
      }
    })
  }

  addCategoriesToList(categoryTree.value)
  return options
})

function selectCategory(categoryId: string) {
  bookmarkStore.selectCategory(categoryId)
}

function toggleCategory(categoryId: string) {
  // 可以在这里实现展开/折叠逻辑
  console.log('Toggle category:', categoryId)
}

async function handleAddCategory() {
  if (!newCategory.value.name.trim()) return

  await bookmarkStore.addCategory({
    name: newCategory.value.name,
    parentId: newCategory.value.parentId || undefined,
    icon: newCategory.value.icon || undefined,
    color: newCategory.value.color,
    sort: Date.now(), // 使用时间戳作为排序值
    isPrivate: false
  })

  // 重置表单
  newCategory.value = {
    name: '',
    parentId: '',
    icon: '',
    color: '#18a058'
  }
  showAddCategoryModal.value = false
}
</script>

<style scoped>
.category-tree {
  padding: 8px 0;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: all 0.2s;
  margin: 2px 8px;
}

.category-item:hover {
  background: var(--n-action-color);
}

.category-item.selected {
  background: var(--primary-color);
  color: white;
}

.all-item {
  font-weight: 500;
}

.category-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: var(--font-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 12px;
  opacity: 0.7;
  background: var(--n-color);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.add-category {
  padding: 8px 16px;
  margin-top: 8px;
}

.add-category .n-button {
  width: 100%;
  justify-content: flex-start;
}
</style>