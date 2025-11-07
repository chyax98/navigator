import { test, expect } from '@playwright/test'

test.describe('Favicon 缓存功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Favicon 缓存服务基本功能', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const module = await import('/src/services/favicon-cache.ts')
        const { faviconCache } = module

        // 测试获取 GitHub 的 Favicon
        const favicon = await faviconCache.getFavicon('https://github.com')

        return {
          success: true,
          hasResult: !!favicon,
          isDataUrl: favicon?.startsWith('data:') || false,
          isUrl: favicon?.startsWith('http') || false,
          length: favicon?.length || 0,
          preview: favicon?.substring(0, 100)
        }
      } catch (error) {
        return {
          success: false,
          error: String(error)
        }
      }
    })

    console.log('Favicon 缓存测试结果:', result)

    expect(result.success).toBe(true)
    expect(result.hasResult).toBe(true)
    // 接受 Data URL 或普通 URL
    expect(result.isDataUrl || result.isUrl).toBe(true)
    expect(result.length).toBeGreaterThan(50)
  })

  test('Favicon 降级策略 - 无效 URL', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const module = await import('/src/services/favicon-cache.ts')
        const { faviconCache } = module

        // 测试一个不存在的域名
        const favicon = await faviconCache.getFavicon('https://this-domain-definitely-does-not-exist-12345.com')

        return {
          success: true,
          isSvgFallback: favicon.startsWith('data:image/svg+xml'),
          isGoogleFavicon: favicon.includes('google.com/s2/favicons'),
          hasLetter: favicon.includes('<text'),
          length: favicon.length,
          preview: favicon.substring(0, 100)
        }
      } catch (error) {
        return {
          success: false,
          error: String(error)
        }
      }
    })

    console.log('降级策略测试结果:', result)

    expect(result.success).toBe(true)
    // 可能返回 Google Favicon URL 或 SVG 降级图标
    expect(result.isSvgFallback || result.isGoogleFavicon).toBe(true)
  })

  test('useFavicon composable 功能', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        // 导入 Vue 和 composable
        const { ref } = await import('vue')
        const { useFavicon } = await import('/src/composables/useFavicon.ts')

        // 创建一个测试用的响应式 URL
        const testUrl = 'https://example.com'

        // 调用 composable
        const { faviconUrl, loading, error } = useFavicon(testUrl)

        // 等待加载完成
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!loading.value) {
              clearInterval(checkInterval)
              resolve(null)
            }
          }, 100)

          // 超时保护
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve(null)
          }, 10000)
        })

        return {
          success: true,
          hasUrl: !!faviconUrl.value,
          isDataUrl: faviconUrl.value?.startsWith('data:') || false,
          hasError: error.value,
          length: faviconUrl.value?.length || 0
        }
      } catch (err) {
        return {
          success: false,
          error: String(err)
        }
      }
    })

    console.log('useFavicon composable 测试结果:', result)

    expect(result.success).toBe(true)
    expect(result.hasUrl).toBe(true)
    expect(result.hasError).toBe(false)
  })

  test('IndexedDB 存储不再出现克隆错误', async ({ page }) => {
    // 监听控制台错误
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 触发语义搜索初始化（会使用 vector-db）
    await page.evaluate(async () => {
      try {
        const { storageManager } = await import('/src/utils/storage.ts')
        await storageManager.init()

        // 尝试保存配置（测试 JSON.parse(JSON.stringify) 修复）
        await storageManager.saveConfig({
          theme: 'light',
          sidebarCollapsed: false
        })

        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    })

    // 检查是否有克隆错误
    const hasCloneError = consoleErrors.some(err =>
      err.includes('could not be cloned') || err.includes('DataCloneError')
    )

    console.log('控制台错误列表:', consoleErrors)
    expect(hasCloneError).toBe(false)
  })
})
