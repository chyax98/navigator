/**
 * 调试工具 - 在页面上显示调试信息
 */

export class DebugPanel {
  private static panel: HTMLDivElement | null = null
  private static logs: string[] = []

  static init() {
    if (this.panel) return

    this.panel = document.createElement('div')
    this.panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 400px;
      max-height: 300px;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 5px;
      z-index: 999999;
      overflow-y: auto;
      border: 1px solid #0f0;
    `

    const title = document.createElement('div')
    title.textContent = '🐛 Debug Panel'
    title.style.cssText = 'color: #0ff; font-weight: bold; margin-bottom: 5px;'
    this.panel.appendChild(title)

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      color: #f00;
      font-size: 20px;
      cursor: pointer;
    `
    closeBtn.onclick = () => this.hide()
    this.panel.appendChild(closeBtn)

    document.body.appendChild(this.panel)
  }

  static log(...args: any[]) {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')

    this.logs.push(message)
    console.log(...args) // 同时输出到 Console

    if (!this.panel) this.init()

    const line = document.createElement('div')
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
    line.style.marginBottom = '3px'
    this.panel!.appendChild(line)

    // 限制最多显示 50 行
    if (this.logs.length > 50) {
      this.logs.shift()
      this.panel!.children[2]?.remove() // 删除最旧的日志
    }

    // 自动滚动到底部
    this.panel!.scrollTop = this.panel!.scrollHeight
  }

  static hide() {
    if (this.panel) {
      this.panel.style.display = 'none'
    }
  }

  static show() {
    if (!this.panel) this.init()
    this.panel!.style.display = 'block'
  }

  static clear() {
    this.logs = []
    if (this.panel) {
      // 保留标题和关闭按钮
      while (this.panel.children.length > 2) {
        this.panel.children[2].remove()
      }
    }
  }
}

// 全局快捷键：Ctrl+Shift+D 显示/隐藏调试面板
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      if (!DebugPanel['panel']) {
        DebugPanel.show()
      } else {
        const isVisible = DebugPanel['panel'].style.display !== 'none'
        isVisible ? DebugPanel.hide() : DebugPanel.show()
      }
    }
  })
}
