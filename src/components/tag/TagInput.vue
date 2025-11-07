<template>
  <div class="tag-input">
    <n-dynamic-tags
      v-model:value="modelValue"
      :max="10"
      :render-tag="renderTag"
      @update:value="handleUpdate"
    >
      <template #input="{ submit, deactivate }">
        <n-auto-complete
          v-model:value="inputValue"
          :options="filteredOptions"
          :placeholder="placeholder"
          :loading="loading"
          size="small"
          @select="handleSelect(submit)"
          @blur="deactivate"
          @keydown.enter="handleEnter(submit)"
        />
      </template>
    </n-dynamic-tags>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { NDynamicTags, NAutoComplete, NTag } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'

interface Props {
  tags: string[]
  placeholder?: string
  loading?: boolean
}

interface Emits {
  (e: 'update:tags', value: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '添加标签 (回车确认)',
  loading: false
})

const emit = defineEmits<Emits>()

const bookmarkStore = useBookmarkStore()

const modelValue = computed({
  get: () => props.tags,
  set: (value) => emit('update:tags', value)
})

const inputValue = ref('')

// 标签建议（基于现有标签）
const filteredOptions = computed(() => {
  if (!inputValue.value) return []

  const query = inputValue.value.toLowerCase()
  return bookmarkStore.allTags
    .filter(tag => tag.name.toLowerCase().includes(query))
    .filter(tag => !props.tags.includes(tag.name))
    .slice(0, 5)
    .map(tag => ({
      label: `${tag.name} (${tag.count})`,
      value: tag.name
    }))
})

function handleUpdate(tags: string[]) {
  emit('update:tags', tags)
}

function handleSelect(submit: (value: string) => void) {
  return () => {
    if (inputValue.value) {
      submit(inputValue.value)
      inputValue.value = ''
    }
  }
}

function handleEnter(submit: (value: string) => void) {
  if (inputValue.value.trim()) {
    submit(inputValue.value.trim())
    inputValue.value = ''
  }
}

// 自定义标签渲染（显示小图标）
function renderTag(tag: string, index: number) {
  return h(
    NTag,
    {
      type: 'info',
      closable: true,
      onClose: () => {
        const newTags = [...props.tags]
        newTags.splice(index, 1)
        emit('update:tags', newTags)
      }
    },
    { default: () => `🏷️ ${tag}` }
  )
}
</script>

<style scoped>
.tag-input {
  width: 100%;
}

.tag-input :deep(.n-dynamic-tags) {
  width: 100%;
}

.tag-input :deep(.n-dynamic-tags-input) {
  min-width: 120px;
}
</style>
