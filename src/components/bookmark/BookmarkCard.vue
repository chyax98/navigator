<template>
  <div class="bookmark-card" @click="handleClick">
    <div class="card-content">
      <!-- 网站图标 -->
      <div class="card-favicon">
        <img :src="bookmark.favicon" :alt="bookmark.title" @error="handleImageError" />
      </div>

      <!-- 内容 -->
      <div class="card-body">
        <h3 class="card-title">{{ bookmark.title }}</h3>
        <p v-if="bookmark.description" class="card-description">{{ bookmark.description }}</p>
        <div v-if="bookmark.tags.length > 0" class="card-tags">
          <n-tag
            v-for="tag in bookmark.tags.slice(0, 3)"
            :key="tag"
            size="small"
            :bordered="false"
            @click.stop="handleTagClick(tag)"
          >
            {{ tag }}
          </n-tag>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="card-actions" @click.stop>
      <n-button text @click="handleEdit">
        <template #icon>
          <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg></n-icon>
        </template>
      </n-button>
      <n-button text @click="handleDelete">
        <template #icon>
          <n-icon><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg></n-icon>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NTag } from 'naive-ui'
import type { Bookmark } from '@/types/bookmark'

interface Props {
  bookmark: Bookmark
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [bookmark: Bookmark]
  delete: [bookmark: Bookmark]
  tagClick: [tag: string]
}>()

function handleClick() {
  window.open(props.bookmark.url, '_blank')
}

function handleEdit() {
  emit('edit', props.bookmark)
}

function handleDelete() {
  emit('delete', props.bookmark)
}

function handleTagClick(tag: string) {
  emit('tagClick', tag)
}

function handleImageError(e: Event) {
  const target = e.target as HTMLImageElement
  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23999" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"/%3E%3C/svg%3E'
}
</script>

<style scoped>
.bookmark-card {
  position: relative;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.bookmark-card:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.bookmark-card:hover .card-actions {
  opacity: 1;
}

.card-content {
  display: flex;
  gap: 12px;
}

.card-favicon {
  flex-shrink: 0;
}

.card-favicon img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--n-text-color);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-description {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  background: var(--n-color);
  border-radius: 8px;
  padding: 4px;
}
</style>
