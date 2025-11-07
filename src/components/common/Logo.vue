<template>
  <div class="logo-container">
    <div class="logo-icon">
      <svg
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 渐变定义 -->
        <defs>
          <linearGradient
            id="compassGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              :stop-color="isDark ? '#2080f0' : '#18a058'"
              stop-opacity="0.15"
            />
            <stop
              offset="100%"
              :stop-color="isDark ? '#2080f0' : '#18a058'"
              stop-opacity="0.05"
            />
          </linearGradient>
          <linearGradient
            id="needleGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              :stop-color="isDark ? '#2080f0' : '#18a058'"
            />
            <stop
              offset="100%"
              :stop-color="isDark ? '#36a3f7' : '#36ad6a'"
            />
          </linearGradient>
        </defs>

        <!-- 外圈背景 -->
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="url(#compassGradient)"
        />
        <circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          :stroke="isDark ? '#2080f0' : '#18a058'"
          stroke-width="1.5"
          opacity="0.2"
        />

        <!-- 刻度线 -->
        <g
          v-for="i in 8"
          :key="i"
          :transform="`rotate(${45 * (i - 1)} 40 40)`"
        >
          <line
            x1="40"
            y1="8"
            x2="40"
            y2="14"
            :stroke="isDark ? '#2080f0' : '#18a058'"
            stroke-width="1.5"
            opacity="0.4"
          />
        </g>

        <!-- 指南针指针 -->
        <g transform="translate(40, 40)">
          <!-- 北指针 -->
          <path
            d="M 0 -24 L 5 0 L 0 24 L -5 0 Z"
            fill="url(#needleGradient)"
          />
          <!-- 南指针 -->
          <path
            d="M 0 24 L 3 0 L 0 -24 L -3 0 Z"
            :fill="isDark ? '#666' : '#999'"
            opacity="0.5"
          />

          <!-- 中心圆点 -->
          <circle
            cx="0"
            cy="0"
            r="4"
            :fill="isDark ? '#2080f0' : '#18a058'"
          />
          <circle
            cx="0"
            cy="0"
            r="2"
            fill="white"
          />
        </g>

        <!-- 方向标记 N -->
        <text
          x="40"
          y="18"
          text-anchor="middle"
          :fill="isDark ? '#2080f0' : '#18a058'"
          font-size="12"
          font-weight="700"
          font-family="Arial, sans-serif"
          opacity="0.8"
        >
          N
        </text>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

const isDark = computed(() => {
  const theme = configStore.config.theme
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
})
</script>

<style scoped>
.logo-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.logo-icon:hover {
  transform: rotate(15deg) scale(1.05);
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}
</style>

