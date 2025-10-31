/**
 * 插件状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Plugin, PluginStatus } from '@/types/plugin'

export const usePluginStore = defineStore('plugin', () => {
  // State
  const plugins = ref<Map<string, Plugin>>(new Map())
  const hooks = ref<Map<string, Function[]>>(new Map())

  // Getters
  const installedPlugins = computed(() => {
    return Array.from(plugins.value.values())
  })

  const activatedPlugins = computed(() => {
    return installedPlugins.value.filter(p => p.config.enabled)
  })

  // Actions
  async function register(plugin: Plugin) {
    try {
      // 检查是否已安装
      if (plugins.value.has(plugin.meta.name)) {
        throw new Error(`Plugin ${plugin.meta.name} is already installed`)
      }

      // 注册插件
      plugins.value.set(plugin.meta.name, plugin)

      // 注册钩子
      if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
          addHook(hookName, handler)
        })
      }

      // 执行安装钩子
      if (plugin.hooks?.onInstall) {
        await plugin.hooks.onInstall()
      }

      console.log(`Plugin ${plugin.meta.name} registered successfully`)
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.meta.name}:`, error)
      throw error
    }
  }

  async function unregister(pluginName: string) {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`)
    }

    try {
      // 执行卸载钩子
      if (plugin.hooks?.onUninstall) {
        await plugin.hooks.onUninstall()
      }

      // 移除钩子
      if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
          removeHook(hookName, handler)
        })
      }

      // 移除插件
      plugins.value.delete(pluginName)

      console.log(`Plugin ${pluginName} unregistered successfully`)
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginName}:`, error)
      throw error
    }
  }

  async function activate(pluginName: string) {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`)
    }

    try {
      // 执行激活钩子
      if (plugin.hooks?.onActivate) {
        await plugin.hooks.onActivate()
      }

      plugin.config.enabled = true

      console.log(`Plugin ${pluginName} activated successfully`)
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginName}:`, error)
      throw error
    }
  }

  async function deactivate(pluginName: string) {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`)
    }

    try {
      // 执行停用钩子
      if (plugin.hooks?.onDeactivate) {
        await plugin.hooks.onDeactivate()
      }

      plugin.config.enabled = false

      console.log(`Plugin ${pluginName} deactivated successfully`)
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginName}:`, error)
      throw error
    }
  }

  function getPlugin(pluginName: string): Plugin | undefined {
    return plugins.value.get(pluginName)
  }

  function getPluginStatus(pluginName: string): PluginStatus {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) return PluginStatus.ERROR

    return plugin.config.enabled ? PluginStatus.ACTIVATED : PluginStatus.DEACTIVATED
  }

  function updatePluginSettings(pluginName: string, settings: Record<string, any>) {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`)
    }

    plugin.config.settings = { ...plugin.config.settings, ...settings }
  }

  // Hook 系统
  function addHook(event: string, handler: Function) {
    if (!hooks.value.has(event)) {
      hooks.value.set(event, [])
    }
    hooks.value.get(event)!.push(handler)
  }

  function removeHook(event: string, handler: Function) {
    const handlers = hooks.value.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  function emit(event: string, data?: any) {
    const handlers = hooks.value.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Hook handler error for event ${event}:`, error)
        }
      })
    }
  }

  function on(event: string, handler: Function) {
    addHook(event, handler)
  }

  function off(event: string, handler: Function) {
    removeHook(event, handler)
  }

  return {
    // State
    plugins,
    hooks,

    // Getters
    installedPlugins,
    activatedPlugins,

    // Actions
    register,
    unregister,
    activate,
    deactivate,
    getPlugin,
    getPluginStatus,
    updatePluginSettings,

    // Hook system
    emit,
    on,
    off
  }
})
