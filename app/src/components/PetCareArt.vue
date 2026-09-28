<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import PetBlink from './PetBlink.vue'

const props = defineProps<{ src: string; idle: string; species: string; stage: string; action: 'touch' | 'clean' | null; revision: number; active: boolean }>()
const frame = ref(0)
const playing = ref(false)
const spriteReady = ref(false)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let playedRevision = -1

// 每次成功照料才从第一帧播放；切页、弹窗和组件卸载立即停止计时，避免后台继续刷新图片。
function stop() {
  if (timer) clearTimeout(timer)
  timer = undefined
  playing.value = false
  spriteReady.value = false
  frame.value = 0
}
// 图片加载完成前保留静态图；完成后才切换到唯一的精灵图层并开始计时，避免叠影和首帧空白。
function start() {
  if (!playing.value || spriteReady.value) return
  spriteReady.value = true
  frame.value = 0
  timer = setTimeout(advance, 90)
}
function advance() {
  if (frame.value >= 9) { stop(); return }
  frame.value += 1
  timer = setTimeout(advance, 90)
}
watch(() => [props.revision, props.active, props.species, props.stage], () => {
  stop()
  failed.value = false
  // 弹窗关闭或页面回前台时不重播上一轮动作，只响应新的成功操作编号。
  if (props.active && props.action && props.revision !== playedRevision) {
    playedRevision = props.revision
    playing.value = true
  }
})
onBeforeUnmount(stop)

// 精灵图文件名来自固定物种/阶段枚举，渲染框始终保持正方形与居中位置。
const sprite = () => `/static/pets/${props.species}-${props.stage}-${props.action}-sprite-v4.webp`
</script>
<template>
  <view class="care-art">
    <view class="art-square">
      <PetBlink v-if="stage === 'nursing' && !playing" class="art-layer" :src="src" :animation="idle" :active="active" />
      <!-- 静态图只在精灵图加载前或播放结束后显示，不能与透明精灵帧同时叠放。 -->
      <image v-else class="art-layer" :class="{ 'under-sprite': playing && spriteReady && !failed }" :src="src" mode="aspectFit" />
      <view v-if="playing && !failed" class="sprite-window" :class="{ ready: spriteReady }">
        <image class="sprite-strip" :src="sprite()" mode="scaleToFill" :style="{ transform: `translateX(-${frame * 10}%)` }" @load="start" @error="failed = true; stop()" />
      </view>
    </view>
  </view>
</template>
<style scoped>
.care-art{display:flex;align-items:center;justify-content:center;overflow:hidden}
.art-square{height:100%;aspect-ratio:1;max-width:100%;position:relative}
.art-layer,.sprite-window{position:absolute;inset:0;width:100%;height:100%}
.sprite-window{overflow:hidden}
.sprite-window:not(.ready),.under-sprite{visibility:hidden}
.sprite-strip{display:block;width:1000%;height:100%;max-width:none}
@media(prefers-reduced-motion:reduce){.sprite-window{display:none}.under-sprite{visibility:visible}}
</style>
