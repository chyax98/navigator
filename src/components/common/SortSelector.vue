<template>
  <n-dropdown
    trigger="click"
    :options="sortOptions"
    @select="handleSelect"
  >
    <n-button
      quaternary
      size="small"
      :style="{ fontSize: '13px' }"
    >
      <template #icon>
        <span style="font-size: 16px;">{{ currentSortIcon }}</span>
      </template>
      <span style="display: flex; align-items: center; gap: 4px;">
        {{ currentSortLabel }}
        <n-icon size="14">
          <svg viewBox="0 0 24 24"><path
            fill="currentColor"
            d="M7,10L12,15L17,10H7Z"
          /></svg>
        </n-icon>
      </span>
    </n-button>
  </n-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NDropdown, NIcon } from 'naive-ui'
import type { BookmarkSortType } from '@/types/sort'
import { SORT_OPTIONS } from '@/types/sort'
import { useConfigStore } from '@/stores/config'

interface Props {
  viewType: 'homepage' | 'category'
}

const props = defineProps<Props>()

const configStore = useConfigStore()

// 当前排序类型
const currentSortType = computed<BookmarkSortType>(() => {
  return props.viewType === 'homepage'
    ? (configStore.config.homepageSortType || 'default')
    : (configStore.config.categorySortType || 'default')
})

// 当前排序选项
const currentSortOption = computed(() => {
  return SORT_OPTIONS.find(opt => opt.value === currentSortType.value) || SORT_OPTIONS[0]
})

// 当前排序图标
const currentSortIcon = computed(() => currentSortOption.value.icon)

// 当前排序标签
const currentSortLabel = computed(() => currentSortOption.value.label)

// 下拉菜单选项
const sortOptions = computed(() => {
  return SORT_OPTIONS.map(opt => ({
    key: opt.value,
    label: opt.label,
    icon: () => opt.icon,
    props: {
      style: {
        fontSize: '13px'
      }
    }
  }))
})

// 处理排序选择
async function handleSelect(key: string) {
  const sortType = key as BookmarkSortType

  if (props.viewType === 'homepage') {
    configStore.setHomepageSortType(sortType)
  } else {
    configStore.setCategorySortType(sortType)
  }
}
</script>
