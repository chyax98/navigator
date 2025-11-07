/**
 * 网页元数据提取服务
 * 支持从 URL 提取标题、描述等信息
 */

export interface PageMetadata {
  title: string
  description: string
  image?: string
  url: string
}

// LinkPreview API 配置
// 免费额度：60次/小时
// 注册地址：https://my.linkpreview.net
const LINKPREVIEW_API = 'https://api.linkpreview.net'

// 从环境变量读取默认 API Key
const DEFAULT_API_KEY = import.meta.env.VITE_LINKPREVIEW_API_KEY || ''

/**
 * 使用 LinkPreview API 提取网页元数据
 *
 * @param url 目标网址
 * @param apiKey LinkPreview API Key（优先使用用户配置，否则使用环境变量默认值）
 * @returns 元数据对象，失败返回 null
 */
export async function fetchPageMetadata(
  url: string,
  apiKey?: string
): Promise<PageMetadata | null> {
  // 优先使用传入的 apiKey，否则使用环境变量的默认值
  const finalApiKey = apiKey?.trim() || DEFAULT_API_KEY

  // 如果没有配置 API Key，使用回退方案
  if (!finalApiKey) {
    console.warn('LinkPreview API Key 未配置，使用回退方案')
    return null
  }

  try {
    const response = await fetch(LINKPREVIEW_API, {
      method: 'POST',
      headers: {
        'X-Linkpreview-Api-Key': finalApiKey,
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify({ q: url })
    })

    if (response.status !== 200) {
      console.error('LinkPreview API 错误:', response.status)
      return null
    }

    const data = await response.json()

    // 检查是否有错误响应
    if (data.error) {
      console.error('LinkPreview API 返回错误:', data.error, data.description)
      return null
    }

    return {
      title: data.title || '',
      description: data.description || '',
      image: data.image,
      url: data.url || url
    }
  } catch (error) {
    console.error('获取元数据失败:', error)
    return null
  }
}

/**
 * 回退方案：从 URL 提取域名作为标题
 *
 * @param url 目标网址
 * @returns 域名（去除 www.）
 */
export function extractDomainAsTitle(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * 尝试从 HTML 中提取标题（当前实现，受 CORS 限制）
 *
 * @param url 目标网址
 * @returns 标题或 null
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return null
    }

    const html = await res.text()
    const title = extractTitleFromHtml(html)
    return title || null
  } catch {
    return null
  }
}

/**
 * 从 HTML 中提取标题
 */
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
