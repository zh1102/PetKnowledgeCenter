<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
// 本轮无登录、真实孩子档案和本地奖励持久化，启动后只运行明确标注的 mock。
onLaunch(() => {})
</script>
<style>
@import './styles/tokens.css';
page { background: var(--cream); color: var(--ink); font-family: 'PetRound', 'Yuanti SC', 'Microsoft YaHei', sans-serif; overflow-x: hidden; }
uni-button, uni-input { font-family: inherit; }
view, text, button, input, image { box-sizing: border-box; }
/* H5 编译后节点带 uni- 前缀；统一盒模型避免内边距叠加导致 iPad 卡片超出画面。 */
uni-view, uni-text, uni-button, uni-input, uni-image { box-sizing: border-box; }
button { margin: 0; font-family: inherit; line-height: 1.4; }
button::after { border: 0; }
/* uni 的运行时基础样式后加载，必须覆盖默认 2.555 行高与伪元素边框。 */
uni-button { line-height: 1.4 !important; }
uni-button::after { border: 0 !important; }
button:focus-visible, input:focus-visible { outline: 3px solid #5534b2; outline-offset: 4px; }
/* 移动端浏览器工具栏和 App 安全区会改变可用高度；统一使用动态视口并保留旧内核回退。 */
.home-shell, .app-shell, .pet-shell { min-height: 100vh; min-height: 100dvh; }
/* 儿童端所有按钮至少保留 44px 触控热区；只限制最小值，不改变现有大按钮视觉尺寸。 */
button, uni-button { min-height: 44px; }
/* 刘海、圆角屏和底部手势条由页面壳统一吸收，业务卡片无需感知设备型号。 */
@supports (padding: env(safe-area-inset-top)) {
  page { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
}
</style>
