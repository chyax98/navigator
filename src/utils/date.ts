/**
 * 日期时间格式化工具
 */

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 启用相对时间插件和中文
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 格式化相对时间（人性化显示）
 * @param date - 日期对象
 * @returns 相对时间字符串（如："刚刚"、"3 分钟前"、"2 天前"）
 */
export function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return ''

  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diff = now - targetDate.getTime()

  // 1 分钟内
  if (diff < 60000) return '刚刚'

  // 1 小时内
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} 分钟前`
  }

  // 24 小时内
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} 小时前`
  }

  // 7 天内
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days} 天前`
  }

  // 超过 7 天显示具体日期
  return dayjs(targetDate).format('YYYY-MM-DD')
}

/**
 * 格式化完整日期时间
 * @param date - 日期对象
 * @param format - 格式字符串（默认：YYYY-MM-DD HH:mm:ss）
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: Date | string | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!date) return ''
  return dayjs(date).format(format)
}

/**
 * 格式化日期（不含时间）
 * @param date - 日期对象
 * @returns 格式化后的日期字符串（YYYY-MM-DD）
 */
export function formatDate(date: Date | string | undefined): string {
  return formatDateTime(date, 'YYYY-MM-DD')
}

/**
 * 使用 dayjs 的相对时间（如："3 天前"、"2 个月前"）
 * @param date - 日期对象
 * @returns dayjs 计算的相对时间
 */
export function fromNow(date: Date | string | undefined): string {
  if (!date) return ''
  return dayjs(date).fromNow()
}
