<template>
  <div class="sidebar-container">
    <!-- 折叠状态显示简单菜单 -->
    <div v-if="collapsed" class="collapsed-sidebar">
      <n-menu
        :value="selectedKey"
        :collapsed="true"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="collapsedMenuOptions"
        @update:value="handleMenuSelect"
      />
    </div>

    <!-- 展开状态显示完整分类树 -->
    <div v-else class="expanded-sidebar">
      <CategoryTree />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NMenu } from 'naive-ui'
import { useBookmarkStore } from '@/stores/bookmark'
import type { MenuOption } from 'naive-ui'
import CategoryTree from './CategoryTree.vue'

interface Props {
  collapsed?: boolean
}

defineProps<Props>()

const bookmarkStore = useBookmarkStore()

const selectedKey = ref('all')

// 折叠状态的菜单选项（只显示顶级分类）
const collapsedMenuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      label: '全部',
      key: 'all',
      icon: () => h('svg', { viewBox: '0 0 24 24' }, [
        h('path', { fill: 'currentColor', d: 'M4,6H20V18H4V6M6,8V16H18V8H6Z' })
      ])
    },
    {
      type: 'divider',
      key: 'd1'
    }
  ]

  // 只添加顶级分类
  bookmarkStore.categoryTree.forEach(category => {
    options.push({
      label: category.name,
      key: category.id,
      icon: () => {
        if (category.color) {
          return h('div', {
            style: {
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              backgroundColor: category.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }, [
            h('svg', { viewBox: '0 0 24 24', style: { width: '10px', height: '10px' } }, [
              h('path', { fill: 'white', d: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z' })
            ])
          ])
        }
        return h('svg', { viewBox: '0 0 24 24' }, [
          h('path', { fill: 'currentColor', d: 'M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z' })
        ])
      }
    })
  })

  return options
})

function handleMenuSelect(key: string) {
  selectedKey.value = key
  bookmarkStore.selectCategory(key)
}
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.collapsed-sidebar {
  height: 100%;
}

.expanded-sidebar {
  height: 100%;
  overflow-y: auto;
  flex: 1;
}

.expanded-sidebar::-webkit-scrollbar {
  width: 4px;
}

.expanded-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.expanded-sidebar::-webkit-scrollbar-thumb {
  background: var(--n-border-color);
  border-radius: 2px;
}
</style>
