import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 沿用 uni-app 应用入口；浏览器只是视觉样板，正式发布目标仍是 App 双端。
export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
