<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ src: string; active: boolean; animation: string }>()
const failed = ref(false)
// GIF不能可靠停在当前帧；暂停/后台/失败均移除GIF并显示正式静态图，不影响业务。
</script>
<template>
  <view class="blink-art">
    <image class="still" :class="{ hidden: active && !failed }" :src="src" mode="aspectFit" />
    <image v-if="active && !failed" class="animated" :src="animation" mode="aspectFit" @error="failed = true" />
  </view>
</template>
<style scoped>
.blink-art{position:relative;width:100%;height:100%}.still,.animated{position:absolute;inset:0;width:100%;height:100%}.hidden{visibility:hidden}
/* Web/iPad Safari减少动态效果时只显示静态；App可通过已有暂停按钮控制。 */
@media(prefers-reduced-motion:reduce){.animated{display:none}.still.hidden{visibility:visible}}
</style>
