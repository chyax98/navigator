import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 导入样式
import './styles/main.css'

// 创建应用实例
const app = createApp(App)

// 注册 Pinia
const pinia = createPinia()
app.use(pinia)

// 注册路由
app.use(router)

// 在应用挂载前初始化配置
async function initializeApp() {
  const { useConfigStore } = await import('@/stores/config')
  const configStore = useConfigStore()
  configStore.loadConfig()
}

// 初始化并挂载应用
initializeApp().then(() => {
  app.mount('#app')
})
