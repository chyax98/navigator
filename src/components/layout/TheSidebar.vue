<template>
  <div class="sidebar-container">
    <!-- Logo -->
    <Logo v-if="!isCollapsed" />

    <CategoryTree :is-collapsed="isCollapsed" />
  </div>
</template>

<script setup lang="ts">
import Logo from '@/components/common/Logo.vue'
import CategoryTree from './CategoryTree.vue'

interface Props {
  isCollapsed?: boolean
}

defineProps<Props>()
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px 12px;
}

.sidebar-container::-webkit-scrollbar {
  width: 4px;
}

.sidebar-container::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-container::-webkit-scrollbar-thumb {
  background: var(--n-border-color);
  border-radius: 2px;
}
</style>
