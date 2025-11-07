/**
 * Markdown 工具函数
 */

/**
 * 提取 Markdown 纯文本（移除格式标记）
 * 用于搜索功能时将 Markdown 笔记转换为可搜索的纯文本
 *
 * @param markdown - Markdown 格式文本
 * @returns 纯文本（移除所有 Markdown 标记）
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return ''

  return markdown
    .replace(/#+\s/g, '')                 // 移除标题标记 (# ## ###)
    .replace(/\*\*(.+?)\*\*/g, '$1')      // 移除粗体 (**text**)
    .replace(/\*(.+?)\*/g, '$1')          // 移除斜体 (*text*)
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')   // 移除链接 [text](url)
    .replace(/`(.+?)`/g, '$1')            // 移除代码标记 (`code`)
    .replace(/~~(.+?)~~/g, '$1')          // 移除删除线 (~~text~~)
    .replace(/>\s/g, '')                  // 移除引用标记 (>)
    .replace(/[-*+]\s/g, '')              // 移除列表标记 (- * +)
    .trim()
}
