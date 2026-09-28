<script setup lang="ts">
defineProps<{ selected?: string }>()
defineEmits<{ navigate: [destination: string] }>()
const navigation = [
  // 首页和任务页职责拆分：首页只汇总陪伴与进度，任务页才承载逐项学习操作。
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'today', label: '今日任务', icon: 'clipboard' },
  { id: 'chinese', label: '语文', icon: 'chinese' },
  { id: 'math', label: '数感', icon: 'math' },
  { id: 'english', label: '英语', icon: 'english' },
  // 合并宠物照料入口，档案由宠物中心内部进入；学习成长中心尚未实现，暂不占导航。
  { id: 'growth', label: '宠物中心', icon: 'pet' },
  { id: 'stars', label: '我的星星', icon: 'star' },
  { id: 'settings', label: '设置', icon: 'settings' },
]
</script>
<template>
  <view class="sidebar">
    <button class="brand-button" aria-label="返回首页" @click="$emit('navigate', 'home')"><image class="brand" src="/static/ui/brand.png" mode="aspectFit" /></button>
    <view class="nav-list">
      <button v-for="item in navigation" :key="item.id" class="nav-item" :class="{ selected: item.id === (selected || 'today'), separated: item.id === 'stars' }" :aria-label="item.label" @click="$emit('navigate', item.id)">
        <!-- 首页沿用已确认的房屋切图；任务改用清单切图，避免同一图标代表两个不同入口。 -->
        <image class="nav-icon" :src="item.icon === 'star' ? '/static/ui/star.png?v=2' : item.icon === 'clipboard' ? '/static/ui/clipboard.png' : `/static/ui/nav-${item.icon === 'home' ? 'today' : item.icon}.png?v=2`" mode="aspectFit" />
        <text>{{ item.label }}</text>
      </button>
    </view>
    <image class="nav-art" src="/static/ui/nav-footer.png" mode="widthFix" />
  </view>
</template>
<style scoped>
.sidebar { width: 176px; flex-shrink: 0; background: var(--lavender); border-right: 1px solid var(--line); min-height: 100vh; min-height: 100dvh; padding: 28px 12px 0; display: flex; flex-direction: column; }
.brand-button { background: transparent; padding: 0; width: 100%; height: 65px; }
.brand { width: 100%; height: 65px; }
.nav-list { margin-top: 35px; }
.nav-item { background: transparent; color: #543786; width: 100%; padding: 13px 13px; margin-bottom: 14px; min-height: 52px; display: flex; align-items: center; gap: 14px; text-align: left; border-radius: 15px; font-size: 17px; white-space: nowrap; }
.selected { background: var(--purple); color: white; }
.nav-icon { width: 30px; height: 32px; flex-shrink: 0; }
.separated { border-top: 1px solid #d9cdef; border-radius: 0; padding-top: 25px; margin-top: 27px; }
.nav-art { width: calc(100% + 24px); margin: auto -12px 0; }
@media (min-width: 1360px) { .sidebar { width: 255px; padding: 38px 16px 0; } .brand-button,.brand { height: 80px; } .nav-list { margin-top: 48px; } .nav-item { min-height: 73px; font-size: 25px; padding: 15px 27px; gap: 24px; margin-bottom: 18px; } .nav-icon { width: 42px; height: 45px; } .separated { margin-top: 49px; padding-top: 34px; } .nav-art { width: calc(100% + 32px); margin-left: -16px; margin-right: -16px; } }
/* 360px 手机按技术基线使用 64px 固定图标轨，给正文留下 296px 可用宽度。 */
@media (max-width: 600px) { .sidebar { width: 64px; padding: 16px 6px 0; } .brand-button,.brand { height: 36px; } .nav-item { justify-content: center; padding: 10px 0; min-height: 48px; margin-bottom: 8px; } .nav-item text { display: none; } .nav-icon { width: 28px; height: 30px; } .nav-art { display: none; } .nav-list { margin-top: 20px; } .separated { margin-top: 14px; padding-top: 16px; } }
/* 导航统一从首页视觉母版提取，按真实可见图形大小而非原切图空白对齐。 */
@media (min-width: 1360px) { .nav-icon { width: 49px; height: 49px; } .nav-item { font-weight: 400; gap: 18px; padding: 10px 24px; margin-bottom: 8px; min-height: 64px; } .separated { margin-top: 22px; padding-top: 20px; } }
/* 手机横屏高度有限，收紧纵向间距但保留 44px 热区，全部入口仍可通过页面滚动到达。 */
@media (max-width: 844px) and (orientation: landscape) { .sidebar { width:64px;padding:8px 6px 0; } .brand-button,.brand { height:32px; } .nav-list { margin-top:8px; } .nav-item { justify-content:center;padding:6px 0;min-height:44px;margin-bottom:2px; } .nav-item text { display:none; } .nav-icon { width:28px;height:30px; } .nav-art { display:none; } .separated { margin-top:6px;padding-top:7px; } }
@supports (padding: env(safe-area-inset-left)) { .sidebar { padding-left: max(12px, env(safe-area-inset-left)); } @media (max-width:600px) { .sidebar { padding-left: max(6px, env(safe-area-inset-left)); } } }
</style>
