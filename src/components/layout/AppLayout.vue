<template>
  <n-layout class="app-layout" has-sider>
    <!-- 侧边栏 -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <the-sidebar :collapsed="collapsed" />
    </n-layout-sider>

    <!-- 主内容区 -->
    <n-layout>
      <!-- 顶部导航 -->
      <n-layout-header bordered class="app-header">
        <the-header />
      </n-layout-header>

      <!-- 内容区域 -->
      <n-layout-content class="app-content" :native-scrollbar="false">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent } from 'naive-ui'
import TheHeader from './TheHeader.vue'
import TheSidebar from './TheSidebar.vue'

const collapsed = ref(false)
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.app-content {
  padding: 24px;
  height: calc(100vh - 64px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
