import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// 官方插件是 CommonJS 发布包；ESM 配置下读取其 default，避免加载时出现 uni is not a function。
const createUni = typeof uni === 'function' ? uni : (uni as unknown as { default: typeof uni }).default
// 仅监听本机供 iPad 视口开发验证，不把 mock 页面暴露到公网。
export default defineConfig({ plugins: [createUni()], server: { host: '127.0.0.1', port: 5173, strictPort: true } })
