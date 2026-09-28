<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
// 本轮无登录、真实孩子档案和本地奖励持久化，启动后只运行明确标注的 mock。
onLaunch(() => {})
</script>
<style>
@import './styles/tokens.css';
page { background: var(--cream); color: var(--ink); font-family: 'PetRound', 'Yuanti SC', 'Microsoft YaHei', sans-serif; }
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
</style>
