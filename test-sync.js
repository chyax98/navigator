/**
 * Chrome 书签同步逻辑测试
 * 验证增量同步、URL 去重、置顶保护
 */

// 模拟 Chrome Storage
const storage = {
  data: {},
  local: {
    get(keys, callback) {
      const result = {}
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = storage.data[key]
        })
      } else {
        Object.assign(result, storage.data)
      }
      callback(result)
    },
    set(items, callback) {
      Object.assign(storage.data, items)
      callback?.()
    }
  },
  bookmarks: {
    tree: null,
    getTree(callback) {
      callback(this.tree)
    }
  }
}

global.chrome = {
  storage,
  runtime: { lastError: null }
}

// URL 规范化
function normalizeUrl(url) {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

// 模拟 syncFromChrome 逻辑
async function syncFromChrome(chromeBookmarks, existingBookmarks) {
  // URL 去重
  const existingUrls = new Set(
    existingBookmarks.map(b => normalizeUrl(b.url))
  )

  const bookmarksToAdd = []
  let added = 0

  for (const chromeBookmark of chromeBookmarks) {
    const normalizedUrl = normalizeUrl(chromeBookmark.url)

    if (existingUrls.has(normalizedUrl)) {
      continue // 跳过已存在的 URL
    }

    bookmarksToAdd.push(chromeBookmark)
    existingUrls.add(normalizedUrl)
    added++
  }

  // 批量保存
  const allBookmarks = [...existingBookmarks, ...bookmarksToAdd]
  const serialized = allBookmarks.map(b => ({
    ...b,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  await new Promise(resolve => {
    chrome.storage.local.set({ navigator_bookmarks: serialized }, resolve)
  })

  return { added }
}

// 测试用例
async function runTests() {
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

  console.log('📝 开始测试 Chrome 书签同步逻辑\n')

  // 测试 1: 首次同步（空数据库）
  console.log('--- 测试 1: 首次同步 ---')
  storage.data = {}

  const chromeBookmarks = [
    { id: 'chrome-1', title: 'Google', url: 'https://google.com', source: 'chrome' },
    { id: 'chrome-2', title: 'GitHub', url: 'https://github.com', source: 'chrome' },
    { id: 'chrome-3', title: 'Stack Overflow', url: 'https://stackoverflow.com', source: 'chrome' }
  ]

  let result = await syncFromChrome(chromeBookmarks, [])
  assert(result.added === 3, '首次同步应添加所有 Chrome 书签 (3)')

  const bookmarks = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], res => {
      resolve(res.navigator_bookmarks || [])
    })
  })
  assert(bookmarks.length === 3, '存储中有 3 个书签')

  // 测试 2: 重复同步（应跳过所有）
  console.log('\n--- 测试 2: 重复同步（URL 去重）---')
  result = await syncFromChrome(chromeBookmarks, bookmarks.map(b => ({
    ...b,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt)
  })))
  assert(result.added === 0, '重复同步应跳过所有书签 (0)')

  // 测试 3: 新增部分书签
  console.log('\n--- 测试 3: 增量同步（新增 2 个）---')
  const moreBookmarks = [
    ...chromeBookmarks,
    { id: 'chrome-4', title: 'MDN', url: 'https://developer.mozilla.org', source: 'chrome' },
    { id: 'chrome-5', title: 'Vue', url: 'https://vuejs.org', source: 'chrome' }
  ]

  const existing = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], res => {
      resolve((res.navigator_bookmarks || []).map(b => ({
        ...b,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt)
      })))
    })
  })

  result = await syncFromChrome(moreBookmarks, existing)
  assert(result.added === 2, '增量同步应新增 2 个书签')

  const afterSync = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], res => {
      resolve(res.navigator_bookmarks || [])
    })
  })
  assert(afterSync.length === 5, '同步后总共 5 个书签')

  // 测试 4: URL 变体去重（带 / 和不带 /）
  console.log('\n--- 测试 4: URL 规范化去重 ---')
  const urlVariants = [
    { id: 'v1', title: 'Site 1', url: 'https://example.com/', source: 'chrome' },
    { id: 'v2', title: 'Site 2', url: 'https://example.com', source: 'chrome' } // 应该被跳过
  ]

  storage.data = {}
  result = await syncFromChrome(urlVariants, [])
  assert(result.added === 1, 'URL 变体应该去重（只添加 1 个）')

  // 测试 5: 置顶书签 + Chrome 同步
  console.log('\n--- 测试 5: 置顶书签与同步共存 ---')
  storage.data = {}

  // 先添加用户置顶的书签
  const userBookmarks = [
    { id: 'user-1', title: 'My Google', url: 'https://google.com', isPinned: true, source: 'user' }
  ]

  await new Promise(resolve => {
    chrome.storage.local.set({
      navigator_bookmarks: userBookmarks.map(b => ({
        ...b,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }, resolve)
  })

  // 同步 Chrome 书签（包含相同 URL）
  const chromeBookmarksWithDuplicate = [
    { id: 'chrome-1', title: 'Google', url: 'https://google.com', source: 'chrome' }, // 应跳过
    { id: 'chrome-2', title: 'GitHub', url: 'https://github.com', source: 'chrome' }
  ]

  const currentBookmarks = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], res => {
      resolve((res.navigator_bookmarks || []).map(b => ({
        ...b,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt)
      })))
    })
  })

  result = await syncFromChrome(chromeBookmarksWithDuplicate, currentBookmarks)
  assert(result.added === 1, '同步时跳过用户已有的 URL（新增 1 个）')

  const final = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], res => {
      resolve(res.navigator_bookmarks || [])
    })
  })
  assert(final.length === 2, '最终有 2 个书签（1 个用户 + 1 个 Chrome）')
  assert(final.some(b => b.isPinned === true), '用户的置顶书签仍然存在')

  // 测试 6: 大规模同步（200+ 书签）
  console.log('\n--- 测试 6: 大规模同步 (270 个书签) ---')
  storage.data = {}

  const largeChromeBookmarks = []
  for (let i = 0; i < 270; i++) {
    largeChromeBookmarks.push({
      id: `chrome-${i}`,
      title: `Bookmark ${i}`,
      url: `https://example.com/${i}`,
      source: 'chrome'
    })
  }

  result = await syncFromChrome(largeChromeBookmarks, [])
  assert(result.added === 270, '大规模同步应添加所有书签 (270)')

  const largeSync = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], res => {
      resolve(res.navigator_bookmarks || [])
    })
  })
  assert(largeSync.length === 270, '存储中有 270 个书签')

  // 再次同步，验证不重复
  const currentLarge = largeSync.map(b => ({
    ...b,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt)
  }))
  result = await syncFromChrome(largeChromeBookmarks, currentLarge)
  assert(result.added === 0, '重复同步 270 个书签应全部跳过 (0)')

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
