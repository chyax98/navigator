/**
 * 书签导出工具
 * 支持导出为 JSON、HTML、Markdown 等格式
 */

import type { Bookmark, Category } from '@/types/bookmark'

/**
 * 导出为 JSON 格式
 */
export function exportToJSON(bookmarks: Bookmark[], categories: Category[]): string {
  const data = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    bookmarks,
    categories
  }

  return JSON.stringify(data, null, 2)
}

/**
 * 导出为 HTML 格式（浏览器书签格式）
 */
export function exportToHTML(bookmarks: Bookmark[], categories: Category[]): string {
  const categoryMap = new Map<string, Category>()
  categories.forEach(cat => categoryMap.set(cat.id, cat))

  const buildCategoryTree = (parentId?: string, level = 0): string => {
    const indent = '    '.repeat(level)
    let html = ''

    // 获取当前层级的分类
    const currentCategories = categories.filter(cat => cat.parentId === parentId)

    currentCategories.forEach(category => {
      html += `${indent}<DT><H3>${escapeHTML(category.name)}</H3>\n`
      html += `${indent}<DL><p>\n`

      // 添加该分类下的书签
      const categoryBookmarks = bookmarks.filter(b => b.categoryId === category.id)
      categoryBookmarks.forEach(bookmark => {
        html += `${indent}    <DT><A HREF="${escapeHTML(bookmark.url)}" ADD_DATE="${Math.floor(bookmark.createdAt.getTime() / 1000)}">${escapeHTML(bookmark.title)}</A>\n`
      })

      // 递归添加子分类
      html += buildCategoryTree(category.id, level + 1)

      html += `${indent}</DL><p>\n`
    })

    return html
  }

  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${buildCategoryTree()}
</DL><p>
`

  return html
}

/**
 * 导出为 Markdown 格式
 */
export function exportToMarkdown(bookmarks: Bookmark[], categories: Category[]): string {
  const categoryMap = new Map<string, Category>()
  categories.forEach(cat => categoryMap.set(cat.id, cat))

  let markdown = '# Bookmarks\n\n'
  markdown += `> Exported on ${new Date().toLocaleString()}\n\n`

  const buildCategoryTree = (parentId?: string, level = 1): string => {
    let md = ''
    const heading = '#'.repeat(level + 1)

    // 获取当前层级的分类
    const currentCategories = categories.filter(cat => cat.parentId === parentId)

    currentCategories.forEach(category => {
      md += `${heading} ${category.name}\n\n`

      // 添加该分类下的书签
      const categoryBookmarks = bookmarks.filter(b => b.categoryId === category.id)
      categoryBookmarks.forEach(bookmark => {
        md += `- [${bookmark.title}](${bookmark.url})`
        if (bookmark.description) {
          md += ` - ${bookmark.description}`
        }
        if (bookmark.tags.length > 0) {
          md += ` \`${bookmark.tags.join('` `')}\``
        }
        md += '\n'
      })

      md += '\n'

      // 递归添加子分类
      md += buildCategoryTree(category.id, level + 1)
    })

    return md
  }

  markdown += buildCategoryTree()

  return markdown
}

/**
 * 导出为 CSV 格式
 */
export function exportToCSV(bookmarks: Bookmark[]): string {
  const headers = ['Title', 'URL', 'Description', 'Category', 'Tags', 'Created']
  let csv = headers.join(',') + '\n'

  bookmarks.forEach(bookmark => {
    const row = [
      escapeCSV(bookmark.title),
      escapeCSV(bookmark.url),
      escapeCSV(bookmark.description || ''),
      escapeCSV(bookmark.categoryId),
      escapeCSV(bookmark.tags.join(';')),
      bookmark.createdAt.toISOString()
    ]
    csv += row.join(',') + '\n'
  })

  return csv
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * 工具函数：转义 HTML
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 工具函数：转义 CSV
 */
function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
