<template>
  <div class="home-view">
    <!-- Google 搜索框 -->
    <GoogleSearchBox />

    <!-- 批量操作工具栏 -->
    <BatchOperationBar />

    <!-- 主页视图 -->
    <HomepageGrid v-if="bookmarkStore.viewMode === 'homepage'" />

    <!-- 文件夹视图 -->
    <CategoryBookmarkGrid v-else-if="bookmarkStore.viewMode === 'category'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHomepageStore } from '@/stores/homepage'
import { useBookmarkStore } from '@/stores/bookmark'
import GoogleSearchBox from '@/components/common/GoogleSearchBox.vue'
import HomepageGrid from '@/components/homepage/HomepageGrid.vue'
import CategoryBookmarkGrid from '@/components/category/CategoryBookmarkGrid.vue'
import BatchOperationBar from '@/components/bookmark/BatchOperationBar.vue'

const homepageStore = useHomepageStore()
const bookmarkStore = useBookmarkStore()

onMounted(async () => {
  // 加载主页布局
  await homepageStore.loadLayout()
})
</script>

<style scoped>
.home-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
