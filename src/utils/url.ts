/**
 * URL 工具函数
 */

/**
 * 标准化 URL 用于重复检测
 *
 * 规范化规则：
 * 1. 统一协议为 https
 * 2. 移除 www 前缀
 * 3. 移除尾部斜杠
 * 4. 移除默认端口（80, 443）
 * 5. 转换为小写
 * 6. 移除 URL fragment (#hash)
 * 7. 标准化查询参数顺序
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    // 统一协议为 https
    parsed.protocol = 'https:'

    // 移除 www 前缀
    parsed.hostname = parsed.hostname.replace(/^www\./, '')

    // 移除尾部斜杠
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'

    // 移除默认端口
    if (parsed.port === '80' || parsed.port === '443') {
      parsed.port = ''
    }

    // 移除 fragment
    parsed.hash = ''

    // 标准化查询参数（按字母序排序）
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search)
      const sortedParams = new URLSearchParams(
        Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      )
      parsed.search = sortedParams.toString()
    }

    return parsed.toString().toLowerCase()
  } catch {
    // 如果 URL 无效，返回小写的原始字符串
    return url.toLowerCase()
  }
}

/**
 * 检查两个 URL 是否重复
 */
export function isDuplicateUrl(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2)
}

/**
 * 从 URL 提取域名
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * 判断 URL 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
