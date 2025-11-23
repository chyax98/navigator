/**
 * 调试 loadBookmarks 逻辑
 * 检查是否有数据被意外过滤或覆盖
 */

// 模拟 Chrome Storage
const storage = {
  data: {
    navigator_bookmarks: [
      {
        id: 'bookmark-1',
        title: 'Google',
        url: 'https://google.com',
        categoryId: 'default',
        tags: [],
        isPinned: true,
        pinnedAt: '2025-01-01T00:00:00.000Z',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        sort: 0,
        source: 'user'
      },
      {
        id: 'bookmark-2',
        title: 'GitHub',
        url: 'https://github.com',
        categoryId: 'default',
        tags: [],
        isPinned: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        sort: 1,
        source: 'chrome'
      },
      {
        id: 'bookmark-3',
        title: 'Vue',
        url: 'https://vuejs.org',
        categoryId: 'default',
        tags: [],
        isPinned: true,
        pinnedAt: '2025-01-01T00:00:00.000Z',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        sort: 2,
        source: 'chrome'
      }
    ]
  },
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
    }
  }
}

global.chrome = { storage, runtime: { lastError: null } }

// 模拟 loadBookmarks
async function loadBookmarks() {
  const loadedBookmarks = await new Promise(resolve => {
    chrome.storage.local.get(['navigator_bookmarks'], result => {
      resolve(result.navigator_bookmarks || [])
    })
  })

  console.log('📦 原始存储数据:', loadedBookmarks.length, '个书签')

  const normalizedBookmarks = loadedBookmarks.map((bookmark, index) => ({
    ...bookmark,
    createdAt: new Date(bookmark.createdAt),
    updatedAt: new Date(bookmark.updatedAt),
    sort: typeof bookmark.sort === 'number' ? bookmark.sort : index,
    source: bookmark.source === 'chrome' ? 'chrome' : 'user',
    isPinned: Boolean(bookmark.isPinned)
  }))

  console.log('✅ 标准化后:', normalizedBookmarks.length, '个书签')
  normalizedBookmarks.forEach(b => {
    console.log(`  - ${b.title} (isPinned=${b.isPinned}, source=${b.source})`)
  })

  return normalizedBookmarks
}

loadBookmarks().then(bookmarks => {
  console.log('\n📊 最终结果:', bookmarks.length, '个书签')
}).catch(error => {
  console.error('❌ 加载失败:', error)
})
