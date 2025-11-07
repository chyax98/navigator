import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 导入样式
import './styles/design-tokens.css'
import './styles/main.css'

// 创建应用实例
const app = createApp(App)

// 注册 Pinia
const pinia = createPinia()
app.use(pinia)

// 注册路由
app.use(router)

// 挂载应用（配置和数据初始化在 App.vue 的 onMounted 中进行）
app.mount('#app')
