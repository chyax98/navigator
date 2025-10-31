<template>
  <n-modal v-model:show="showModal" preset="card" title="添加书签" style="width: 600px">
    <n-form ref="formRef" :model="formData" :rules="rules">
      <n-form-item label="标题" path="title">
        <n-input v-model:value="formData.title" placeholder="请输入书签标题" />
      </n-form-item>

      <n-form-item label="网址" path="url">
        <n-input v-model:value="formData.url" placeholder="https://example.com" />
      </n-form-item>

      <n-form-item label="描述" path="description">
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="可选的描述信息"
          :rows="3"
        />
      </n-form-item>

      <n-form-item label="分类" path="categoryId">
        <n-select
          v-model:value="formData.categoryId"
          :options="categoryOptions"
          placeholder="选择分类"
        />
      </n-form-item>

      <n-form-item label="标签" path="tags">
        <n-dynamic-tags v-model:value="formData.tags" />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" @click="handleSubmit">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NSelect, NDynamicTags, NButton, NSpace, useMessage } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const bookmarkStore = useBookmarkStore()
const message = useMessage()

const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const formRef = ref()
const formData = ref({
  title: '',
  url: '',
  description: '',
  categoryId: 'default',
  tags: [] as string[]
})

const rules = {
  title: {
    required: true,
    message: '请输入书签标题',
    trigger: 'blur'
  },
  url: {
    required: true,
    validator: (rule: any, value: string) => {
      if (!value) return new Error('请输入网址')
      try {
        new URL(value)
        return true
      } catch {
        return new Error('请输入有效的网址')
      }
    },
    trigger: 'blur'
  }
}

const categoryOptions = computed(() => {
  return bookmarkStore.categories.map(cat => ({
    label: cat.name,
    value: cat.id
  }))
})

async function handleSubmit() {
  try {
    await formRef.value?.validate()

    await bookmarkStore.addBookmark({
      ...formData.value,
      isPrivate: false
    })

    message.success('书签添加成功')
    showModal.value = false

    // 重置表单
    formData.value = {
      title: '',
      url: '',
      description: '',
      categoryId: 'default',
      tags: []
    }
  } catch (error) {
    console.error('Validation failed:', error)
  }
}

// 监听URL变化，自动获取网站信息
watch(() => formData.value.url, async (newUrl) => {
  if (newUrl && !formData.value.title) {
    try {
      const url = new URL(newUrl)
      formData.value.title = url.hostname
    } catch {
      // 忽略无效URL
    }
  }
})
</script>
