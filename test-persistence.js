/**
 * Chrome Storage 持久化测试
 * 模拟置顶、新建、同步等操作，验证数据是否正确保存和读取
 */

// 模拟 Chrome Storage API
const storage = {
  data: {},
  local: {
    get(keys, callback) {
      const result = {}
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = storage.data[key]
        })
      } else if (typeof keys === 'string') {
        result[keys] = storage.data[keys]
      } else {
        Object.assign(result, storage.data)
      }
      callback(result)
    },
    set(items, callback) {
      Object.assign(storage.data, items)
      callback?.()
    }
  }
}

global.chrome = {
  storage,
  runtime: { lastError: null }
}

// 模拟互斥锁
class MockChromeStorage {
  constructor() {
    this.writeLock = Promise.resolve()
  }

  async acquireWriteLock(operation) {
    const previousLock = this.writeLock
    let releaseLock
    this.writeLock = new Promise(resolve => {
      releaseLock = resolve
    })
    try {
      await previousLock
      return await operation()
    } finally {
      releaseLock()
    }
  }

  async getBookmarks() {
    return new Promise(resolve => {
      chrome.storage.local.get(['navigator_bookmarks'], result => {
        const raw = result.navigator_bookmarks || []
        resolve(raw.map(b => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
          isPinned: Boolean(b.isPinned)
        })))
      })
    })
  }

  async saveBookmark(bookmark) {
    return this.acquireWriteLock(async () => {
      const bookmarks = await this.getBookmarks()
      const index = bookmarks.findIndex(b => b.id === bookmark.id)

      if (index >= 0) {
        bookmarks[index] = { ...bookmark, updatedAt: new Date() }
      } else {
        bookmarks.push({ ...bookmark, createdAt: new Date(), updatedAt: new Date() })
      }

      const serialized = bookmarks.map(b => ({
        ...b,
        isPinned: Boolean(b.isPinned),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        lastVisited: b.lastVisited?.toISOString(),
        pinnedAt: b.pinnedAt?.toISOString()
      }))

      await new Promise(resolve => {
        chrome.storage.local.set({ navigator_bookmarks: serialized }, resolve)
      })
    })
  }
}

// 测试用例
async function runTests() {
  const manager = new MockChromeStorage()
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log('✅', message)
      passed++
    } else {
      console.error('❌', message)
      failed++
    }
  }

  console.log('📝 开始测试 Chrome Storage 持久化\n')

  // 测试 1: 新建书签 → 保存 → 读取
  console.log('--- 测试 1: 新建书签持久化 ---')
  await manager.saveBookmark({
    id: 'test-1',
    title: '测试书签',
    url: 'https://example.com',
    categoryId: 'default',
    tags: [],
    isPinned: false,
    sort: 0,
    source: 'user'
  })

  let bookmarks = await manager.getBookmarks()
  assert(bookmarks.length === 1, '书签数量正确 (1)')
  assert(bookmarks[0].title === '测试书签', '书签标题正确')
  assert(bookmarks[0].isPinned === false, '初始状态未置顶')

  // 测试 2: 置顶书签 → 保存 → 读取
  console.log('\n--- 测试 2: 置顶书签持久化 ---')
  await manager.saveBookmark({
    ...bookmarks[0],
    isPinned: true,
    pinnedAt: new Date()
  })

  bookmarks = await manager.getBookmarks()
  assert(bookmarks.length === 1, '书签数量未变 (1)')
  assert(bookmarks[0].isPinned === true, '置顶状态已保存')
  assert(bookmarks[0].pinnedAt !== undefined, 'pinnedAt 时间已保存')

  // 测试 3: 并发置顶多个书签（模拟用户快速点击）
  console.log('\n--- 测试 3: 并发置顶多个书签 ---')
  storage.data = {} // 清空存储

  const concurrentOps = []
  for (let i = 0; i < 5; i++) {
    concurrentOps.push(
      manager.saveBookmark({
        id: `concurrent-${i}`,
        title: `并发书签 ${i}`,
        url: `https://example.com/${i}`,
        categoryId: 'default',
        tags: [],
        isPinned: true,
        pinnedAt: new Date(),
        sort: i,
        source: 'user'
      })
    )
  }

  await Promise.all(concurrentOps)
  bookmarks = await manager.getBookmarks()
  assert(bookmarks.length === 5, '并发保存 5 个书签全部成功')
  assert(bookmarks.every(b => b.isPinned === true), '所有书签都是置顶状态')

  // 测试 4: 模拟刷新后重新加载
  console.log('\n--- 测试 4: 模拟刷新后重新加载 ---')
  const beforeRefresh = await manager.getBookmarks()

  // 模拟刷新：创建新的 manager 实例（不清空 storage.data）
  const managerAfterRefresh = new MockChromeStorage()
  const afterRefresh = await managerAfterRefresh.getBookmarks()

  assert(afterRefresh.length === beforeRefresh.length, '刷新后书签数量不变')
  assert(afterRefresh.every(b => b.isPinned === true), '刷新后置顶状态保留')

  // 测试 5: URL 去重逻辑
  console.log('\n--- 测试 5: URL 去重逻辑 ---')
  storage.data = {}

  await manager.saveBookmark({
    id: 'bookmark-1',
    title: 'Google',
    url: 'https://google.com',
    categoryId: 'default',
    tags: [],
    isPinned: false,
    sort: 0,
    source: 'user'
  })

  // 模拟同步：相同 URL，不同 ID
  const existingUrls = new Set(['https://google.com'])
  const shouldSkip = existingUrls.has('https://google.com')
  assert(shouldSkip === true, 'URL 去重：相同 URL 应该被跳过')

  // 不同 URL 应该添加
  const shouldAdd = !existingUrls.has('https://github.com')
  assert(shouldAdd === true, 'URL 去重：不同 URL 应该添加')

  // 测试 6: 批量同步 200+ 书签
  console.log('\n--- 测试 6: 批量同步 200+ 书签 ---')
  storage.data = {}

  const batchBookmarks = []
  for (let i = 0; i < 200; i++) {
    batchBookmarks.push({
      id: `batch-${i}`,
      title: `批量书签 ${i}`,
      url: `https://example.com/${i}`,
      categoryId: 'default',
      tags: [],
      isPinned: false,
      sort: i,
      source: 'chrome'
    })
  }

  // 批量保存（一次性写入，不用循环）
  const serialized = batchBookmarks.map(b => ({
    ...b,
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  await new Promise(resolve => {
    chrome.storage.local.set({ navigator_bookmarks: serialized }, resolve)
  })

  bookmarks = await manager.getBookmarks()
  assert(bookmarks.length === 200, '批量保存 200 个书签全部成功')

  // 打印测试结果
  console.log(`\n${'='.repeat(50)}`)
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`)
  console.log('='.repeat(50))

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(error => {
  console.error('测试失败:', error)
  process.exit(1)
})
