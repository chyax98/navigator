/**
 * 测试主页书签保存的竞态条件
 *
 * 模拟场景：用户快速连续点击多个书签的"添加到主页"按钮
 * 期望结果：所有书签都应该成功保存，没有数据丢失
 */

// Mock Chrome Storage API
const storage = {
  local: {
    data: {},
    get(keys, callback) {
      const result = {}
      keys.forEach(key => {
        if (this.data[key]) {
          result[key] = JSON.parse(JSON.stringify(this.data[key]))
        }
      })
      setTimeout(() => callback(result), 10) // 模拟异步延迟
    },
    set(items, callback) {
      setTimeout(() => {
        Object.assign(this.data, items)
        callback && callback()
      }, 10) // 模拟异步延迟
    }
  }
}

global.chrome = { storage, runtime: {} }

// 模拟 ChromeStorageManager（无锁版本）
class ChromeStorageManagerWithoutLock {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null)
      })
    })
  }

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve)
    })
  }

  async saveHomepageLayout(layout) {
    // 无锁版本：直接保存
    await this.set('homepage_layout', layout)
  }

  async getHomepageLayout() {
    return await this.get('homepage_layout')
  }
}

// 模拟 ChromeStorageManager（有锁版本）
class ChromeStorageManagerWithLock {
  constructor() {
    this.writeLock = Promise.resolve()
  }

  async acquireWriteLock(operation) {
    const previousLock = this.writeLock
    let releaseLock

    this.writeLock = new Promise((resolve) => {
      releaseLock = resolve
    })

    try {
      await previousLock
      return await operation()
    } finally {
      releaseLock()
    }
  }

  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null)
      })
    })
  }

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve)
    })
  }

  async saveHomepageLayout(layout) {
    // 有锁版本：使用互斥锁
    return this.acquireWriteLock(async () => {
      await this.set('homepage_layout', layout)
    })
  }

  async getHomepageLayout() {
    return await this.get('homepage_layout')
  }
}

// 测试函数：模拟并发添加书签
async function testConcurrentSave(StorageClass, testName) {
  console.log(`\n======== ${testName} ========`)

  // 重置存储
  chrome.storage.local.data = {}

  const manager = new StorageClass()

  // 模拟快速连续添加 5 个书签
  const addOperations = []
  for (let i = 1; i <= 5; i++) {
    const operation = (async () => {
      // 读取当前数据
      const current = await manager.getHomepageLayout()
      const items = current ? current.items : []

      // 添加新书签
      const newItem = { bookmarkId: `bookmark-${i}`, gridIndex: items.length, addedAt: new Date().toISOString() }
      items.push(newItem)

      // 保存（这里会出现竞态）
      await manager.saveHomepageLayout({
        config: { lastModified: new Date().toISOString() },
        items
      })

      console.log(`✓ 添加书签 ${i}`)
    })()

    addOperations.push(operation)
  }

  // 等待所有操作完成
  await Promise.all(addOperations)

  // 验证结果
  const final = await manager.getHomepageLayout()
  const finalCount = final ? final.items.length : 0

  console.log(`\n期望保存: 5 个书签`)
  console.log(`实际保存: ${finalCount} 个书签`)

  if (finalCount === 5) {
    console.log(`✅ 测试通过：所有书签都成功保存`)
  } else {
    console.log(`❌ 测试失败：丢失了 ${5 - finalCount} 个书签`)
    console.log(`保存的书签 ID:`, final.items.map(item => item.bookmarkId))
  }

  return finalCount === 5
}

// 运行测试
async function runTests() {
  console.log('测试主页书签保存的竞态条件')
  console.log('=' .repeat(50))

  const result1 = await testConcurrentSave(
    ChromeStorageManagerWithoutLock,
    '测试 1: 无互斥锁（旧代码）'
  )

  const result2 = await testConcurrentSave(
    ChromeStorageManagerWithLock,
    '测试 2: 有互斥锁（新代码）'
  )

  console.log('\n' + '='.repeat(50))
  console.log('测试总结:')
  console.log(`  无锁版本: ${result1 ? '✅ 通过' : '❌ 失败（预期失败）'}`)
  console.log(`  有锁版本: ${result2 ? '✅ 通过' : '❌ 失败'}`)

  if (!result1 && result2) {
    console.log('\n✅ 修复有效：互斥锁成功防止了竞态条件导致的数据丢失')
  } else if (result1) {
    console.log('\n⚠️  注意：无锁版本也通过了测试，可能是延迟不够大')
  } else {
    console.log('\n❌ 修复无效：有锁版本仍然失败')
  }
}

// 执行测试
runTests().catch(console.error)
