/**
 * 插件系统类型定义
 */

import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

export type HookHandler = (data?: unknown) => void | Promise<void>

export interface PluginMeta {
  name: string
  version: string
  description: string
  author: string
  icon?: string
}

export interface PluginConfig {
  enabled: boolean
  settings: Record<string, any>
}

export interface PluginHooks {
  onInstall?: () => void | Promise<void>
  onUninstall?: () => void | Promise<void>
  onActivate?: () => void | Promise<void>
  onDeactivate?: () => void | Promise<void>
}

export interface Plugin {
  meta: PluginMeta
  config: PluginConfig
  hooks?: PluginHooks
  components?: Record<string, Component>
  routes?: RouteRecordRaw[]
}

export enum PluginStatus {
  INSTALLED = 'installed',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  ERROR = 'error'
}

export interface PluginManager {
  register(plugin: Plugin): Promise<void>
  unregister(pluginName: string): Promise<void>
  activate(pluginName: string): Promise<void>
  deactivate(pluginName: string): Promise<void>
  getPlugin(pluginName: string): Plugin | undefined
  listPlugins(): Plugin[]
  emit(event: string, data?: unknown): void
  on(event: string, handler: HookHandler): void
  off(event: string, handler: HookHandler): void
}
