<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="AI 智能标签生成"
    size="huge"
    :bordered="false"
    :segmented="false"
    :loading="generating"
  >
    <div class="ai-tagging-modal">
      <!-- 书签信息展示 -->
      <div class="bookmark-info">
        <n-card
          title="书签信息"
          size="small"
          embedded
        >
          <div class="bookmark-preview">
            <div class="title">
              {{ bookmark?.title }}
            </div>
            <div class="url">
              {{ bookmark?.url }}
            </div>
            <div
              v-if="bookmark?.description"
              class="description"
            >
              {{ bookmark.description }}
            </div>
            <div
              v-if="bookmark?.tags?.length"
              class="current-tags"
            >
              <n-text depth="3">
                当前标签：
              </n-text>
              <n-space>
                <n-tag
                  v-for="tag in bookmark.tags"
                  :key="tag"
                  type="info"
                  size="small"
                >
                  {{ tag }}
                </n-tag>
              </n-space>
            </div>
          </div>
          <n-input
            v-model:value="quickTag"
            placeholder="快速添加自定义标签，Enter 保存"
            size="small"
            @keyup.enter="handleQuickTag"
          />
        </n-card>
      </div>

      <!-- AI 建议标签 -->
      <div class="suggestions-section">
        <n-card
          title="AI 建议标签"
          size="small"
          embedded
        >
          <template #header-extra>
            <n-button
              size="small"
              :loading="generating"
              @click="generateTags"
            >
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 512 512">
                    <path
                      fill="currentColor"
                      d="M269.1 162.8L268.5 161.6L256 134.4L243.5 161.6L242.9 162.8C238.6 170.2 231.7 175.4 223.7 177.4L198.4 182.4L211.2 202.8C214.4 207.7 215.8 213.6 215.1 219.5C214.4 225.4 211.6 230.7 207.2 234.5L186.6 252.3L208.4 270.1C212.8 273.9 215.6 279.2 216.3 285.1C217 291 215.6 296.9 212.4 301.8L199.6 322.2L224.9 327.2C232.9 329.2 239.8 334.4 244.1 341.8L244.7 343L256 370.2L267.3 343L267.9 341.8C272.2 334.4 279.1 329.2 287.1 327.2L312.4 322.2L299.6 301.8C296.4 296.9 295 291 295.7 285.1C296.4 279.2 299.2 273.9 303.6 270.1L325.4 252.3L304.8 234.5C300.4 230.7 297.6 225.4 296.9 219.5C296.2 213.6 297.6 207.7 300.8 202.8L313.6 182.4L288.3 177.4C280.3 175.4 273.4 170.2 269.1 162.8Z"
                    />
                    <path
                      fill="currentColor"
                      d="M95.5 95.5L94.5 94.1L80 64L65.5 94.1L64.5 95.5C62.1 100.8 57.2 104.5 51.7 105.6L21.2 111.8L32.4 133.2C34.8 137.2 35.8 142 35.3 146.7C34.8 151.4 32.9 155.6 29.9 158.6L14.6 172.7L29.9 186.8C32.9 189.8 34.8 194 35.3 198.7C35.8 203.4 34.8 208.2 32.4 212.2L21.2 233.6L51.7 239.8C57.2 240.9 62.1 244.6 64.5 249.9L65.5 251.3L80 281.4L94.5 251.3L95.5 249.9C97.9 244.6 102.8 240.9 108.3 239.8L138.8 233.6L127.6 212.2C125.2 208.2 124.2 203.4 124.7 198.7C125.2 194 127.1 189.8 130.1 186.8L145.4 172.7L130.1 158.6C127.1 155.6 125.2 151.4 124.7 146.7C124.2 142 125.2 137.2 127.6 133.2L138.8 111.8L108.3 105.6C102.8 104.5 97.9 100.8 95.5 95.5Z"
                    />
                    <path
                      fill="currentColor"
                      d="M416.5 95.5L415.5 94.1L401 64L386.5 94.1L385.5 95.5C383.1 100.8 378.2 104.5 372.7 105.6L342.2 111.8L353.4 133.2C355.8 137.2 356.8 142 356.3 146.7C355.8 151.4 353.9 155.6 350.9 158.6L335.6 172.7L350.9 186.8C353.9 189.8 355.8 194 356.3 198.7C356.8 203.4 355.8 208.2 353.4 212.2L342.2 233.6L372.7 239.8C378.2 240.9 383.1 244.6 385.5 249.9L386.5 251.3L401 281.4L415.5 251.3L416.5 249.9C418.9 244.6 423.8 240.9 429.3 239.8L459.8 233.6L448.6 212.2C446.2 208.2 445.2 203.4 445.7 198.7C446.2 194 448.1 189.8 451.1 186.8L466.4 172.7L451.1 158.6C448.1 155.6 446.2 151.4 445.7 146.7C445.2 142 446.2 137.2 448.6 133.2L459.8 111.8L429.3 105.6C423.8 104.5 418.9 100.8 416.5 95.5Z"
                    />
                    <path
                      fill="currentColor"
                      d="M95.5 416.5L94.5 415.1L80 385L65.5 415.1L64.5 416.5C62.1 421.8 57.2 425.5 51.7 426.6L21.2 432.8L32.4 454.2C34.8 458.2 35.8 463 35.3 467.7C34.8 472.4 32.9 476.6 29.9 479.6L14.6 493.7L29.9 507.8C32.9 510.8 34.8 515 35.3 519.7C35.8 524.4 34.8 529.2 32.4 533.2L21.2 554.6L51.7 560.8C57.2 561.9 62.1 565.6 64.5 570.9L65.5 572.3L80 602.4L94.5 572.3L95.5 570.9C97.9 565.6 102.8 561.9 108.3 560.8L138.8 554.6L127.6 533.2C125.2 529.2 124.2 524.4 124.7 519.7C125.2 515 127.1 510.8 130.1 507.8L145.4 493.7L130.1 479.6C127.1 476.6 125.2 472.4 124.7 467.7C124.2 463 125.2 458.2 127.6 454.2L138.8 432.8L108.3 426.6C102.8 425.5 97.9 421.8 95.5 416.5Z"
                    />
                  </svg>
                </n-icon>
              </template>
              生成建议
            </n-button>
          </template>

          <div
            v-if="tagAnalysis.suggestedTags.length === 0 && !generating"
            class="no-suggestions"
          >
            <n-empty description="暂无AI标签建议，点击上方按钮生成" />
          </div>

          <div
            v-else-if="tagAnalysis.suggestedTags.length > 0"
            class="tag-suggestions"
          >
            <div class="suggestion-list">
              <div
                v-for="suggestion in tagAnalysis.suggestedTags"
                :key="suggestion.tag"
                class="suggestion-item"
                :class="{ selected: selectedTags.includes(suggestion.tag) }"
                @click="toggleTagSelection(suggestion.tag)"
              >
                <div class="tag-info">
                  <n-tag
                    :type="selectedTags.includes(suggestion.tag) ? 'success' : 'default'"
                    size="small"
                  >
                    {{ suggestion.tag }}
                  </n-tag>
                  <n-text
                    depth="3"
                    class="confidence"
                  >
                    置信度: {{ Math.round(suggestion.confidence * 100) }}%
                  </n-text>
                </div>
                <div class="reason">
                  <n-text
                    depth="2"
                    size="small"
                  >
                    {{ suggestion.reason }}
                  </n-text>
                </div>
              </div>
            </div>
          </div>

          <!-- 冲突提示 -->
          <div
            v-if="tagAnalysis.conflicts.length > 0"
            class="conflicts-notice"
          >
            <n-alert
              type="warning"
              :show-icon="false"
            >
              <template #header>
                发现冲突标签
              </template>
              以下标签与现有标签重复：
              <n-space>
                <n-tag
                  v-for="conflict in tagAnalysis.conflicts"
                  :key="conflict"
                  type="warning"
                  size="small"
                >
                  {{ conflict }}
                </n-tag>
              </n-space>
            </n-alert>
          </div>
        </n-card>
      </div>

      <!-- 推荐信息 -->
      <div
        v-if="tagAnalysis.recommendations.length > 0"
        class="recommendations"
      >
        <n-card
          title="AI 建议"
          size="small"
          embedded
        >
          <n-space vertical>
            <div
              v-for="recommendation in tagAnalysis.recommendations"
              :key="recommendation"
              class="recommendation-item"
            >
              <n-text size="small">
                {{ recommendation }}
              </n-text>
            </div>
          </n-space>
        </n-card>
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button
          secondary
          :loading="generating"
          @click="generateTags"
        >
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 512 512">
                <path
                  fill="currentColor"
                  d="M259.92 262.91L216.4 149.77a9 9 0 0 0-16.8 0l-43.52 113.14a9 9 0 0 1-5.17 5.17L37.77 311.6a9 9 0 0 0 0 16.8l113.14 43.52a9 9 0 0 1 5.17 5.17l43.52 113.14a9 9 0 0 0 16.8 0l43.52-113.14a9 9 0 0 1 5.17-5.17l113.14-43.52a9 9 0 0 0 0-16.8l-113.14-43.52a9 9 0 0 1-5.17-5.17z"
                />
                <path
                  fill="currentColor"
                  d="M108 68L88 16 76 68 24 88 76 108 88 160 108 108 160 88 108 68zm316 312l-20-52-20 52-52 20 20 20 20 52 20-20 52-20-20-52-20-20z"
                />
              </svg>
            </n-icon>
          </template>
          重新生成
        </n-button>
        <n-button @click="handleCancel">
          取消
        </n-button>
        <n-button
          type="primary"
          :disabled="selectedTags.length === 0"
          @click="handleConfirm"
        >
          添加 {{ selectedTags.length }} 个标签
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Bookmark } from '@/types/bookmark'
import { aiTaggingService, type TagAnalysisResult } from '@/utils/ai-tagging'

interface Props {
  show: boolean
  bookmark: Bookmark | null
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm', tags: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const generating = ref(false)
const tagAnalysis = ref<TagAnalysisResult>({
  suggestedTags: [],
  existingTags: [],
  conflicts: [],
  recommendations: []
})
const selectedTags = ref<string[]>([])
const quickTag = ref('')

// 监听书签变化，重置状态
watch(() => props.bookmark, (newBookmark) => {
  if (newBookmark) {
    tagAnalysis.value = {
      suggestedTags: [],
      existingTags: newBookmark.tags,
      conflicts: [],
      recommendations: []
    }
    selectedTags.value = []
    quickTag.value = ''
  }
}, { immediate: true })

watch(showModal, async (visible) => {
  if (!visible || generating.value) return
  if (!props.bookmark) return

  // 自动生成第一次建议，避免用户误以为无响应
  if (tagAnalysis.value.suggestedTags.length === 0) {
    await generateTags()
  }
})

/**
 * 生成AI标签建议
 */
async function generateTags() {
  if (!props.bookmark) return

  generating.value = true
  try {
    const result = await aiTaggingService.generateTagsForBookmark(props.bookmark, {
      maxTags: 8,
      minConfidence: 0.4,
      includeCategories: true,
      language: 'zh-CN'
    })

    tagAnalysis.value = result
    // 默认选中高置信度的标签
    selectedTags.value = result.suggestedTags
      .filter(tag => tag.confidence > 0.7 && !result.conflicts.includes(tag.tag))
      .map(tag => tag.tag)
  } catch (error) {
    console.error('生成标签失败:', error)
    tagAnalysis.value.recommendations = ['标签生成失败，请检查网络连接或API配置']
  } finally {
    generating.value = false
  }
}

/**
 * 切换标签选择状态
 */
function toggleTagSelection(tag: string) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

function handleQuickTag() {
  const tag = quickTag.value.trim()
  if (!tag) return
  if (!selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag)
  }
  quickTag.value = ''
}

/**
 * 确认添加标签
 */
function handleConfirm() {
  emit('confirm', selectedTags.value)
  handleCancel()
}

/**
 * 取消操作
 */
function handleCancel() {
  selectedTags.value = []
  quickTag.value = ''
  showModal.value = false
}
</script>

<style scoped>
.ai-tagging-modal {
  max-height: 70vh;
  overflow-y: auto;
}

.bookmark-info {
  margin-bottom: 16px;
}

.bookmark-preview .title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.bookmark-preview .url {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  word-break: break-all;
}

.bookmark-preview .description {
  color: #888;
  font-size: 14px;
  margin-bottom: 12px;
}

.current-tags {
  margin-top: 8px;
}

.suggestions-section {
  margin-bottom: 16px;
}

.no-suggestions {
  text-align: center;
  padding: 20px;
}

.tag-suggestions {
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-item:hover {
  border-color: var(--n-primary-color-hover);
  background-color: var(--n-action-color);
}

.suggestion-item.selected {
  border-color: var(--n-primary-color);
  background-color: var(--n-action-color);
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.confidence {
  font-size: 12px;
}

.reason {
  margin-left: 20px;
}

.conflicts-notice {
  margin-top: 16px;
}

.recommendations {
  margin-top: 16px;
}

.recommendation-item {
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border-left: 3px solid #18a058;
}
</style>
