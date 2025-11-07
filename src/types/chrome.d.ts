/**
 * Chrome Extension API 类型定义
 * 最小化类型定义，仅包含项目使用的 API
 */

declare namespace chrome {
  // Runtime API
  export namespace runtime {
    export const id: string | undefined
    export const lastError: { message: string } | undefined
  }

  // Storage API
  export namespace storage {
    export interface StorageArea {
      get(
        keys: string | string[] | null,
        callback: (items: { [key: string]: any }) => void
      ): void
      set(items: { [key: string]: any }, callback?: () => void): void
      remove(keys: string | string[], callback?: () => void): void
      clear(callback?: () => void): void
    }

    export const local: StorageArea
    export const sync: StorageArea
  }

  // Bookmarks API
  export namespace bookmarks {
    export interface BookmarkTreeNode {
      id: string
      parentId?: string
      index?: number
      url?: string
      title: string
      dateAdded?: number
      dateGroupModified?: number
      children?: BookmarkTreeNode[]
    }

    export interface BookmarkRemoveInfo {
      parentId: string
      index: number
      node: BookmarkTreeNode
    }

    export interface BookmarkMoveInfo {
      parentId: string
      index: number
      oldParentId: string
      oldIndex: number
    }

    export interface BookmarkChangeInfo {
      title?: string
      url?: string
    }

    export function getTree(callback: (results: BookmarkTreeNode[]) => void): void
    export function get(
      idOrIdList: string | string[],
      callback: (results: BookmarkTreeNode[]) => void
    ): void
    export function getChildren(
      id: string,
      callback: (results: BookmarkTreeNode[]) => void
    ): void
    export function create(
      bookmark: {
        parentId?: string
        index?: number
        title?: string
        url?: string
      },
      callback?: (result: BookmarkTreeNode) => void
    ): void
    export function update(
      id: string,
      changes: { title?: string; url?: string },
      callback?: (result: BookmarkTreeNode) => void
    ): void
    export function remove(id: string, callback?: () => void): void
    export function move(
      id: string,
      destination: { parentId?: string; index?: number },
      callback?: (result: BookmarkTreeNode) => void
    ): void

    // Event listeners
    export const onCreated: {
      addListener(callback: (id: string, bookmark: BookmarkTreeNode) => void): void
      removeListener(callback: (id: string, bookmark: BookmarkTreeNode) => void): void
    }
    export const onRemoved: {
      addListener(callback: (id: string, removeInfo: BookmarkRemoveInfo) => void): void
      removeListener(callback: (id: string, removeInfo: BookmarkRemoveInfo) => void): void
    }
    export const onChanged: {
      addListener(callback: (id: string, changeInfo: BookmarkChangeInfo) => void): void
      removeListener(callback: (id: string, changeInfo: BookmarkChangeInfo) => void): void
    }
    export const onMoved: {
      addListener(callback: (id: string, moveInfo: BookmarkMoveInfo) => void): void
      removeListener(callback: (id: string, moveInfo: BookmarkMoveInfo) => void): void
    }
  }

  // Tabs API
  export namespace tabs {
    export interface Tab {
      id?: number
      index: number
      windowId: number
      highlighted: boolean
      active: boolean
      pinned: boolean
      url?: string
      title?: string
      favIconUrl?: string
    }

    export function create(
      createProperties: {
        url?: string
        active?: boolean
        index?: number
        windowId?: number
      },
      callback?: (tab: Tab) => void
    ): void

    export function query(
      queryInfo: {
        active?: boolean
        currentWindow?: boolean
        url?: string | string[]
      },
      callback: (result: Tab[]) => void
    ): void
  }
}

// Window 对象扩展
interface Window {
  __TAURI__?: any
  __clearDB__?: () => Promise<void>
}
