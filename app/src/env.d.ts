/// <reference types="vite/client" />

// vue-tsc 不识别 uni-app 的 renderjs 模块属性；这里只补模板可见形状，业务数据仍由严格 TS 校验。
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    traceRenderer: Record<string, (...args: unknown[]) => unknown>
  }
}

export {}
