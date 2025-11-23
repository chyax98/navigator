/**
 * 测试主页书签保存的真实场景
 *
 * 模拟 homepage store 的真实行为：
 * 1. 操作内存中的 items 数组
 * 2. 调用 persistLayout() 保存
 * 3. 并发调用时使用互斥锁保护
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
      setTimeout(() => callback(result), 5) // 模拟异步延迟
    },
    set(items, callback) {
      setTimeout(() => {
        Object.assign(this.data, items)
        callback && callback()
      }, 5) // 模拟异步延迟
    }
  }
}

global.chrome = { storage, runtime: {} }

// 模拟 HomepageStore（无锁版本）
class HomepageStoreWithoutLock {
  constructor() {
    this.items = []
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

  async persistLayout() {
    // 无锁版本：直接保存
    const layout = {
      config: { lastModified: new Date().toISOString() },
      items: this.items.map(item => ({ ...item })) // 复制数组
    }
    await this.set('homepage_layout', layout)
  }

  async addBookmark(bookmarkId) {
    // 模拟真实场景：操作内存数组
    const newItem = {
      bookmarkId,
      gridIndex: this.items.length,
      addedAt: new Date().toISOString()
    }
    this.items.push(newItem)

    // 保存（无锁）
    await this.persistLayout()

    console.log(`✓ 添加书签 ${bookmarkId}`)
  }

  async loadLayout() {
    const data = await this.get('homepage_layout')
    if (data) {
      this.items = data.items || []
    }
  }
}

// 模拟 HomepageStore（有锁版本）
class HomepageStoreWithLock {
  constructor() {
    this.items = []
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

  async persistLayout() {
    // 有锁版本：使用互斥锁
    return this.acquireWriteLock(async () => {
      const layout = {
        config: { lastModified: new Date().toISOString() },
        items: this.items.map(item => ({ ...item })) // 复制数组
      }
      await this.set('homepage_layout', layout)
    })
  }

  async addBookmark(bookmarkId) {
    // 模拟真实场景：操作内存数组
    const newItem = {
      bookmarkId,
      gridIndex: this.items.length,
      addedAt: new Date().toISOString()
    }
    this.items.push(newItem)

    // 保存（有锁）
    await this.persistLayout()

    console.log(`✓ 添加书签 ${bookmarkId}`)
  }

  async loadLayout() {
    const data = await this.get('homepage_layout')
    if (data) {
      this.items = data.items || []
    }
  }
}

// 测试函数：模拟并发添加书签
async function testConcurrentAdd(StoreClass, testName) {
  console.log(`\n======== ${testName} ========`)

  // 重置存储
  chrome.storage.local.data = {}

  const store = new StoreClass()

  // 模拟快速连续添加 5 个书签（并发）
  const addOperations = []
  for (let i = 1; i <= 5; i++) {
    addOperations.push(store.addBookmark(`bookmark-${i}`))
  }

  // 等待所有操作完成
  await Promise.all(addOperations)

  // 从存储加载数据验证
  await store.loadLayout()

  console.log(`\n期望保存: 5 个书签`)
  console.log(`内存中: ${store.items.length} 个书签`)

  if (store.items.length === 5) {
    console.log(`✅ 测试通过：所有书签都成功保存`)
    console.log(`保存的书签 ID:`, store.items.map(item => item.bookmarkId))
  } else {
    console.log(`❌ 测试失败：丢失了 ${5 - store.items.length} 个书签`)
    console.log(`保存的书签 ID:`, store.items.map(item => item.bookmarkId))
  }

  return store.items.length === 5
}

// 运行多次测试以增加出现竞态的概率
async function runTests() {
  console.log('测试主页书签并发添加场景')
  console.log('=' .repeat(50))

  let withoutLockPass = 0
  let withLockPass = 0
  const iterations = 10

  console.log(`\n运行 ${iterations} 次测试以验证稳定性...\n`)

  for (let i = 0; i < iterations; i++) {
    console.log(`\n>>> 第 ${i + 1} 轮测试`)

    const result1 = await testConcurrentAdd(
      HomepageStoreWithoutLock,
      `无互斥锁`
    )

    const result2 = await testConcurrentAdd(
      HomepageStoreWithLock,
      `有互斥锁`
    )

    if (result1) withoutLockPass++
    if (result2) withLockPass++

    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n' + '='.repeat(50))
  console.log(`测试总结 (${iterations} 次测试):`)
  console.log(`  无锁版本: ${withoutLockPass}/${iterations} 通过 (${(withoutLockPass/iterations*100).toFixed(1)}%)`)
  console.log(`  有锁版本: ${withLockPass}/${iterations} 通过 (${(withLockPass/iterations*100).toFixed(1)}%)`)

  if (withLockPass === iterations && withoutLockPass < iterations) {
    console.log('\n✅ 修复有效：互斥锁确保了100%成功率')
  } else if (withLockPass === iterations && withoutLockPass === iterations) {
    console.log('\n⚠️  两个版本都通过了所有测试')
    console.log('   可能的原因：异步延迟不够大，未能触发竞态条件')
    console.log('   或者这个场景下确实不会出现数据丢失')
  } else if (withLockPass < iterations) {
    console.log('\n❌ 修复无效：有锁版本仍然出现失败')
  } else {
    console.log('\n✅ 修复有效但不稳定：有锁版本通过率100%，无锁版本通过率较低')
  }
}

// 执行测试
runTests().catch(console.error)
