import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ChromeStorageManager } from '@/utils/chrome-storage'
import type { Bookmark } from '@/types/bookmark'

interface MockChromeStorage {
  data: Record<string, any>
  get(keys: string[], callback?: (result: any) => void): void
  set(items: Record<string, any>, callback?: () => void): void
  remove(keys: string[], callback?: () => void): void
}

function createMockChromeStorage(): MockChromeStorage {
  const data: Record<string, any> = {}

  return {
    data,
    get(keys: string[], callback?: (result: any) => void) {
      setTimeout(() => {
        const result: Record<string, any> = {}
        keys.forEach(key => {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            result[key] = JSON.parse(JSON.stringify(data[key]))
          }
        })
        callback?.(result)
      }, 5)
    },
    set(items: Record<string, any>, callback?: () => void) {
      setTimeout(() => {
        Object.entries(items).forEach(([key, value]) => {
          data[key] = JSON.parse(JSON.stringify(value))
        })
        callback?.()
      }, 5)
    },
    remove(keys: string[], callback?: () => void) {
      setTimeout(() => {
        keys.forEach(key => {
          delete data[key]
        })
        callback?.()
      }, 5)
    }
  }
}

function createBookmark(id: string, url: string, sort = 0): Bookmark {
  const now = new Date()
  return {
    id,
    title: id,
    url,
    description: '',
    favicon: undefined,
    categoryId: 'default',
    tags: [],
    createdAt: now,
    updatedAt: now,
    isPrivate: false,
    clickCount: 0,
    isPinned: false,
    sort,
    source: 'user'
  }
}

describe('ChromeStorageManager distributed lock', () => {
  let chromeStorage: MockChromeStorage
  let originalChrome: typeof chrome | undefined

  beforeEach(() => {
    chromeStorage = createMockChromeStorage()
    originalChrome = (globalThis as any).chrome
    ;(globalThis as any).chrome = {
      storage: {
        local: {
          get: (...args: Parameters<MockChromeStorage['get']>) => chromeStorage.get(...args),
          set: (...args: Parameters<MockChromeStorage['set']>) => chromeStorage.set(...args),
          remove: (...args: Parameters<MockChromeStorage['remove']>) => chromeStorage.remove(...args)
        }
      },
      runtime: {}
    }

  })

  afterEach(() => {
    if (originalChrome) {
      (globalThis as any).chrome = originalChrome
    } else {
      delete (globalThis as any).chrome
    }
  })

  it('serializes concurrent writes across manager instances', async () => {
    const managerA = new ChromeStorageManager()
    const managerB = new ChromeStorageManager()

    const operations = [
      managerA.saveBookmark(createBookmark('bookmark-a', 'https://a.test', 0)),
      managerB.saveBookmark(createBookmark('bookmark-b', 'https://b.test', 1))
    ]

    await Promise.all(operations)

    const final = await managerA.getBookmarks()
    const urls = final.map(bookmark => bookmark.url).sort()
    expect(urls).toEqual(['https://a.test', 'https://b.test'])
  })
})
