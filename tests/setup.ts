/**
 * Vitest 测试环境setup
 */

import { vi } from 'vitest'

// Mock Chrome API
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        callback && callback({})
      }),
      set: vi.fn((items, callback) => {
        callback && callback()
      }),
      remove: vi.fn((keys, callback) => {
        callback && callback()
      })
    }
  },
  runtime: {
    lastError: null,
    id: 'test-extension-id'
  }
} as any
