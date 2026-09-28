<script setup lang="ts">
defineProps<{ kind: 'feed' | 'clean' | 'play' | 'rest' | 'touch' }>()
// 纯呈现层不持有余额、不提交操作；重挂载只重播视觉，不会二次结算。
</script>
<template>
  <view class="effect" :class="kind" aria-hidden="true">
    <image v-for="i in 3" :key="i" class="particle" :class="`p${i}`" :src="kind === 'feed' || kind === 'play' ? '/static/ui/star.png' : kind === 'clean' ? '/static/ui/pet-bubble.png' : kind === 'rest' ? '/static/ui/pet-energy.png' : '/static/ui/pet-fullness.png'" mode="aspectFit" />
    <text class="effect-note">{{ kind === 'feed' ? '成长 +5' : kind === 'clean' ? '清洁 +10' : kind === 'rest' ? '好好休息' : kind === 'play' ? '一起玩耍' : '温柔陪伴' }}</text>
  </view>
</template>
<style scoped>
/* 容器跟随双栏/单栏布局，用百分比定位，不测DOM，不依赖Web专属动画库。 */
.effect{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden}.particle{position:absolute;width:42px;height:42px;left:76%;top:76%;opacity:0;animation:star-flight 1.15s ease-in-out both}.p2{animation-delay:.12s}.p3{animation-delay:.24s}.effect-note{position:absolute;left:18%;top:46%;color:var(--purple-deep);background:#fff9e8;padding:8px 14px;border-radius:16px;font-size:20px;opacity:0;animation:note-rise 1.8s ease-out .7s both}
@keyframes star-flight{0%{opacity:0;transform:scale(.6)}15%{opacity:1}55%{left:52%;top:26%;transform:scale(1.1) rotate(25deg)}85%{opacity:1}100%{left:25%;top:40%;opacity:0;transform:scale(.5) rotate(70deg)}}
.clean .particle,.rest .particle,.touch .particle,.play .particle{left:24%;top:43%;animation:care-float 1.4s ease-out both}.clean .p2,.touch .p2,.rest .p2,.play .p2{left:18%;animation-delay:.12s}.clean .p3,.touch .p3,.rest .p3,.play .p3{left:33%;animation-delay:.24s}
@keyframes care-float{0%{opacity:0;transform:translateY(20px) scale(.6)}25%{opacity:1}100%{opacity:0;transform:translateY(-65px) scale(1.1)}}
@keyframes note-rise{0%{opacity:0;transform:translateY(12px)}25%,75%{opacity:1}100%{opacity:0;transform:translateY(-15px)}}
@media(max-width:999px){.feed .particle{left:82%;top:88%}.effect-note{left:30%;top:26%}@keyframes star-flight{0%{opacity:0}15%{opacity:1}55%{left:65%;top:45%}100%{left:48%;top:22%;opacity:0}}.clean .particle,.rest .particle,.touch .particle,.play .particle{top:24%;left:45%}.particle.p2{left:35%}.particle.p3{left:55%}}
/* 减少动态效果时隐藏装饰，实际成功信息始终由父级live region提供。 */
@media(prefers-reduced-motion:reduce){.effect{display:none}.particle,.effect-note{animation:none}}
</style>
