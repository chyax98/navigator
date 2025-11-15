<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="modalTitle"
    style="width: 640px"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
    >
      <n-form-item
        label="网址"
        path="url"
      >
        <n-space
          vertical
          style="width: 100%"
        >
          <n-input-group>
            <n-input
              v-model:value="formData.url"
              placeholder="https://example.com"
              style="flex: 1"
            />
            <n-button
              type="primary"
              :loading="fetchingMetadata"
              :disabled="!formData.url || fetchingMetadata"
              @click="handleAIFetch"
            >
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24"><path
                    fill="currentColor"
                    d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"
                  /></svg>
                </n-icon>
              </template>
              AI获取
            </n-button>
          </n-input-group>

          <!-- 重复提示 -->
          <n-alert
            v-if="duplicateBookmark"
            type="warning"
            title="检测到重复书签"
            closable
            @close="duplicateBookmark = null"
          >
            已存在相同的书签：<strong>{{ duplicateBookmark.title }}</strong>
            <br>
            <span style="font-size: 12px; opacity: 0.8;">
              分类：{{ bookmarkStore.categories.find(c => c.id === duplicateBookmark.categoryId)?.name }}
            </span>
          </n-alert>
        </n-space>
      </n-form-item>

      <n-form-item
        label="标题"
        path="title"
      >
        <n-input
          v-model:value="formData.title"
          placeholder="请输入书签标题"
        />
      </n-form-item>

      <n-form-item
        label="描述"
        path="description"
      >
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="可选的描述信息"
          :rows="3"
        />
      </n-form-item>

      <n-form-item
        label="分类"
        path="categoryId"
      >
        <n-space
          vertical
          style="width: 100%"
        >
          <n-select
            v-model:value="formData.categoryId"
            :options="categoryOptions"
            placeholder="选择分类"
          />
          <n-button
            text
            type="primary"
            :loading="suggestingCategory"
            :disabled="!formData.url || suggestingCategory"
            @click="handleAISuggestCategory"
          >
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24"><path
                  fill="currentColor"
                  d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"
                /></svg>
              </n-icon>
            </template>
            🤖 AI推荐分类
          </n-button>
        </n-space>
      </n-form-item>

      <n-form-item
        label="标签"
        path="tags"
      >
        <tag-input
          v-model:tags="formData.tags"
          placeholder="添加标签 (回车确认)"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="showModal = false">
          取消
        </n-button>
        <n-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          保存
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NInputGroup, NSelect, NButton, NSpace, NIcon, NAlert, useMessage } from 'naive-ui'
import TagInput from '@/components/tag/TagInput.vue'
import { useBookmarkStore } from '@/stores/bookmark'
import { useConfigStore } from '@/stores/config'
import { useDebounceFn } from '@vueuse/core'
import { fetchPageMetadata, extractDomainAsTitle } from '@/services/metadata'
import { suggestCategory } from '@/services/ai/enhancement'
import type { Bookmark } from '@/types/bookmark'

interface Props {
  show: boolean
  initialData?: { url?: string } | null
  bookmark?: Bookmark | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  success: []
}>()

const bookmarkStore = useBookmarkStore()
const configStore = useConfigStore()
const message = useMessage()

// AI 功能状态
const fetchingMetadata = ref(false)
const suggestingCategory = ref(false)

// 重复检测状态
const duplicateBookmark = ref<any>(null)
const checkingDuplicate = ref(false)

const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const modalTitle = computed(() => props.bookmark ? '编辑书签' : '添加书签')
const isEditMode = computed(() => !!props.bookmark)

const formRef = ref()
const defaultCategoryId = computed(() => {
  const current = bookmarkStore.selectedCategoryId
  if (current && current !== 'all') {
    return current
  }
  return bookmarkStore.categories[0]?.id || 'default'
})

function createInitialForm() {
  return {
    title: '',
    url: '',
    description: '',
    categoryId: defaultCategoryId.value,
    tags: [] as string[],
    sort: bookmarkStore.bookmarks.length
  }
}

const formData = ref(createInitialForm())
const submitting = ref(false)
const fetchTitleController = ref<AbortController | null>(null)

const rules = {
  title: {
    required: true,
    message: '请输入书签标题',
    trigger: 'blur'
  },
  url: {
    required: true,
    validator: (_rule: any, value: string) => {
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

/**
 * AI 一键获取：仅获取元数据（标题和描述）
 */
async function handleAIFetch() {
  if (!formData.value.url) {
    message.warning('请先输入网址')
    return
  }

  fetchingMetadata.value = true

  try {
    // 1. 尝试使用 LinkPreview API 获取元数据
    const linkPreviewApiKey = configStore.config.linkPreviewApiKey
    let metadata = await fetchPageMetadata(formData.value.url, linkPreviewApiKey)

    // 2. 如果 LinkPreview 失败，尝试直接 fetch（可能受 CORS 限制）
    if (!metadata) {
      const title = await fetchPageTitle(formData.value.url)
      if (title) {
        formData.value.title = title
        message.info('已获取标题（部分功能受限，建议配置 LinkPreview API Key）')
      } else {
        // 最后的回退方案：使用域名
        formData.value.title = extractDomainAsTitle(formData.value.url)
        message.warning('无法获取网页信息，已使用域名作为标题')
      }
    } else {
      // 成功获取元数据
      formData.value.title = metadata.title
      formData.value.description = metadata.description
      message.success('✨ 已自动获取标题和描述')
    }
  } catch (error) {
    console.error('获取元数据失败:', error)
    message.error('获取失败：' + (error as Error).message)
  } finally {
    fetchingMetadata.value = false
  }
}

/**
 * 仅 AI 推荐分类
 */
async function handleAISuggestCategory() {
  if (!formData.value.url) {
    message.warning('请先输入网址')
    return
  }

  suggestingCategory.value = true

  try {
    const categories = bookmarkStore.categories.map(c => ({
      id: c.id,
      name: c.name
    }))

    const title = formData.value.title || extractDomainAsTitle(formData.value.url)

    const suggestion = await suggestCategory(
      formData.value.url,
      title,
      formData.value.description,
      categories
    )

    // 严格验证返回的分类 ID
    if (suggestion.categoryId && suggestion.categoryId.trim() !== '') {
      // 二次验证：确保分类 ID 在选项列表中
      const categoryExists = categoryOptions.value.some(
        option => option.value === suggestion.categoryId
      )

      if (categoryExists) {
        formData.value.categoryId = suggestion.categoryId
        message.success(`🤖 ${suggestion.reason}`)
      } else {
        console.error('[AI推荐分类] 分类ID不在选项列表中:', suggestion.categoryId)
        message.error(`推荐的分类「${suggestion.categoryName}」不存在`)
      }
    } else {
      console.warn('[AI推荐分类] 未返回有效的分类ID:', suggestion)
      message.warning('AI 未能推荐合适的分类')
    }
  } catch (error) {
    console.error('[AI推荐分类] 失败:', error)
    message.error('推荐失败：' + (error as Error).message)
  } finally {
    suggestingCategory.value = false
  }
}

async function handleSubmit() {
  // 防止重复提交
  if (submitting.value) {
    return
  }

  try {
    submitting.value = true
    await formRef.value?.validate()

    if (isEditMode.value && props.bookmark) {
      // 编辑模式：更新书签
      await bookmarkStore.updateBookmark(props.bookmark.id, {
        title: formData.value.title,
        url: formData.value.url,
        description: formData.value.description,
        categoryId: formData.value.categoryId,
        tags: formData.value.tags
      })

      message.success(`书签已更新`)
      emit('success')
      showModal.value = false

      // 重置表单
      resetForm()
    } else {
      // 添加模式：创建新书签
      const created = await bookmarkStore.addBookmark({
        ...formData.value,
        isPrivate: false
      })

      const categoryName = bookmarkStore.categories.find(cat => cat.id === created.categoryId)?.name || '未分类'
      message.success(`书签已添加到「${categoryName}」`)
      emit('success')
      showModal.value = false

      // 重置表单
      resetForm()
    }
  } catch (error) {
    console.error('Validation failed:', error)
  } finally {
    submitting.value = false
  }
}

// 重置表单
function resetForm() {
  formData.value = createInitialForm()
}

// 监听 modal 打开，填充初始数据
watch(() => props.show, (show) => {
  if (show) {
    if (isEditMode.value && props.bookmark) {
      // 编辑模式：填充现有书签数据
      formData.value = {
        title: props.bookmark.title || '',
        url: props.bookmark.url || '',
        description: props.bookmark.description || '',
        categoryId: props.bookmark.categoryId || defaultCategoryId.value,
        tags: props.bookmark.tags ? [...props.bookmark.tags] : [],
        sort: props.bookmark.sort || bookmarkStore.bookmarks.length
      }
    } else if (props.initialData) {
      // 添加模式：使用初始数据
      formData.value.categoryId = defaultCategoryId.value
      if (props.initialData.url) {
        formData.value.url = props.initialData.url
        // 尝试从 URL 提取标题
        try {
          const url = new URL(props.initialData.url)
          formData.value.title = url.hostname.replace(/^www\./, '')
          // 异步抓取网页标题（若可用）
          void debouncedFetchTitle()
        } catch {
          // 忽略无效URL
        }
      }
    } else {
      // 添加模式：使用默认值
      formData.value = createInitialForm()
    }
  } else {
    // modal 关闭时重置表单
    resetForm()
  }
})

// 解析 HTML 中的标题
function extractTitleFromHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const titleEl = doc.querySelector('title')
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const twTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
    const candidate = (titleEl?.textContent || ogTitle || twTitle || '').trim()
    return candidate
  } catch {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    return (match?.[1] || '').trim()
  }
}

function hostnamePlaceholder(urlStr: string): string {
  try {
    const url = new URL(urlStr)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

async function fetchPageTitle(urlStr: string): Promise<string | null> {
  // 允许失败与跨域受限，返回 null 作为兜底
  try {
    if (fetchTitleController.value) {
      fetchTitleController.value.abort()
    }
    const controller = new AbortController()
    fetchTitleController.value = controller
    const res = await fetch(urlStr, { method: 'GET', mode: 'cors', signal: controller.signal })
    // 某些站点无 CORS 或 opaque 响应，将无法读取内容
    if (!res.ok || res.headers.get('content-type')?.includes('application/json')) {
      return null
    }
    const html = await res.text()
    const title = extractTitleFromHtml(html)
    return title || null
  } catch {
    return null
  }
}

const debouncedFetchTitle = useDebounceFn(async () => {
  const url = formData.value.url
  if (!url) return
  const placeholder = hostnamePlaceholder(url)
  // 当标题为空或仍为占位（域名）时，尝试抓取网页标题
  if (!formData.value.title || formData.value.title === placeholder) {
    const fetched = await fetchPageTitle(url)
    if (fetched) {
      formData.value.title = fetched
    } else if (!formData.value.title) {
      formData.value.title = placeholder
    }
  }
}, 600)

// 监听URL变化：先设置域名占位，再尝试抓取网页标题，同时检测重复
watch(() => formData.value.url, async (newUrl) => {
  if (!newUrl) {
    duplicateBookmark.value = null
    return
  }

  const placeholder = hostnamePlaceholder(newUrl)
  if (!formData.value.title) {
    formData.value.title = placeholder
  }
  void debouncedFetchTitle()

  // 重复检测
  try {
    checkingDuplicate.value = true
    const result = bookmarkStore.checkDuplicate(newUrl)
    duplicateBookmark.value = result.isDuplicate ? result.existing : null
  } finally {
    checkingDuplicate.value = false
  }
})

watch(defaultCategoryId, (next) => {
  if (!props.show) return
  formData.value.categoryId = formData.value.categoryId || next
})
</script>
