<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="title"
    style="width: 500px"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="auto"
    >
      <n-form-item
        label="分类名称"
        path="name"
      >
        <n-input
          v-model:value="formData.name"
          placeholder="请输入分类名称"
        />
      </n-form-item>

      <n-form-item
        label="父分类"
        path="parentId"
      >
        <n-select
          v-model:value="formData.parentId"
          :options="parentCategoryOptions"
          placeholder="选择父分类（可选）"
          clearable
        />
      </n-form-item>

      <n-form-item
        label="私密分类"
        path="isPrivate"
      >
        <n-switch v-model:value="formData.isPrivate" />
        <span style="margin-left: 12px; font-size: 12px; color: var(--text-color-3)">
          私密分类中的书签不会出现在搜索结果中
        </span>
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space
        justify="end"
      >
        <n-button @click="showModal = false">
          取消
        </n-button>
        <n-button
          type="primary"
          @click="handleSubmit"
        >
          {{ mode === 'add' ? '添加' : '保存' }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NSelect, NSwitch, NButton, NSpace, useMessage } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import type { Category } from '@/types/bookmark'

interface Props {
  show: boolean
  mode: 'add' | 'edit'
  category?: Category | null
  parentId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  success: []
}>()

const bookmarkStore = useBookmarkStore()
const message = useMessage()

const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const title = computed(() => {
  if (props.mode === 'edit') {
    return '编辑分类'
  }
  return props.parentId ? '添加子分类' : '添加分类'
})

// 父分类选项
const parentCategoryOptions = computed(() => {
  const options: Array<{ label: string; value: string }> = [
    { label: '根分类', value: '' }
  ]

  function addCategoriesToList(categories: Category[], level = 0) {
    categories.forEach(category => {
      // 编辑模式下，排除当前分类（不能将自己设为父分类）
      if (props.mode === 'edit' && props.category && category.id === props.category.id) {
        return
      }

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

  addCategoriesToList(bookmarkStore.categoryTree)
  return options
})

const formRef = ref()
const formData = ref({
  name: '',
  parentId: undefined as string | undefined,
  isPrivate: false
})

const rules = {
  name: {
    required: true,
    message: '请输入分类名称',
    trigger: 'blur'
  }
}

// 监听 modal 打开，填充数据
watch(() => props.show, (show) => {
  if (show) {
    if (props.mode === 'edit' && props.category) {
      // 编辑模式，填充现有数据
      formData.value = {
        name: props.category.name,
        parentId: props.category.parentId,
        isPrivate: props.category.isPrivate
      }
    } else {
      // 添加模式，重置表单或使用传入的 parentId
      resetForm()
      if (props.parentId) {
        formData.value.parentId = props.parentId
      }
    }
  }
})

async function handleSubmit() {
  try {
    await formRef.value?.validate()

    if (props.mode === 'edit' && props.category) {
      // 编辑分类
      await bookmarkStore.updateCategory(props.category.id, {
        name: formData.value.name,
        parentId: formData.value.parentId || undefined,
        isPrivate: formData.value.isPrivate
      })
      message.success('分类更新成功')
    } else {
      // 添加分类
      await bookmarkStore.addCategory({
        name: formData.value.name,
        isPrivate: formData.value.isPrivate,
        parentId: formData.value.parentId || undefined
      })
      message.success(formData.value.parentId ? '子分类添加成功' : '分类添加成功')
    }

    emit('success')
    showModal.value = false
    resetForm()
  } catch (error) {
    // 验证失败
  }
}

function resetForm() {
  formData.value = {
    name: '',
    parentId: undefined,
    isPrivate: false
  }
}
</script>

