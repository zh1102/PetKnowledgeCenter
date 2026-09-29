<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import AppSidebar from '../../components/AppSidebar.vue'
import PetBlink from '../../components/PetBlink.vue'
import { speciesOptions } from '../pet/model'
import { usePetStore } from '../../stores/pet'
import { useTodayStore } from '../../stores/today'

const pets = usePetStore()
const today = useTodayStore()
// 仅控制 GIF 是否解码；学习、成长和奖励的事实状态始终来自对应 store。
const pageVisible = ref(true)
const notice = ref('')

onHide(() => { pageVisible.value = false })
onShow(() => { pageVisible.value = true })
// 首页不伪造“无伙伴”主页：首次使用必须先走已确认的首宠领养流程。
onMounted(() => { if (!pets.pet) uni.redirectTo({ url: '/pages/adoption/index' }) })

const companionAsset = computed(() => {
  const pet = pets.pet
  const option = speciesOptions.find(item => item.id === pet?.species)
  const version = pet?.species === 'cat' && pets.stage.key === 'growth' ? 'v1' : option?.version
  return pet && option ? `/static/pets/${pet.species}-${pets.stage.key}-${version}.png` : '/static/ui/cat-official.png'
})
const companionMotion = computed(() => pets.pet ? `/static/pets/${pets.pet.species}-nursing-motion-v2.gif` : '')
const remainingLabel = computed(() => today.progress.remaining === 0 ? '今日任务已全部完成' : `还差 ${today.progress.remaining} 项任务`)
const nextTask = computed(() => today.snapshot.tasks.find(task => task.status === 'pending' || task.status === 'submitted'))

// 只跳转已实现页面；未实现专区明确提示，不用空页面掩盖当前交付范围。
function navigate(destination: string) {
  if (destination === 'chinese') { uni.redirectTo({ url: '/pages/tracing/index' }); return }
  if (today.busy) return
  if (destination === 'today') { uni.redirectTo({ url: '/pages/today/index' }); return }
  if (destination === 'growth') { uni.redirectTo({ url: '/pages/pet-center/index' }); return }
  if (destination === 'home') return
  if (destination === 'pet') { uni.redirectTo({ url: '/pages/pet/index' }); return }
  notice.value = destination === 'stars'
    ? `当前演示余额：${today.snapshot.stars} 颗星星。真实余额将以服务端记录为准。`
    : '这个专区仍在准备中。本阶段先完成首页、今日任务与宠物中心闭环。'
}
</script>

<template>
  <view class="home-shell">
    <AppSidebar selected="home" @navigate="navigate" />
    <main class="home-main">
      <view class="home-header">
        <text class="mock-badge">本地演示 · Mock · 刷新重置</text>
        <view class="profile"><image src="/static/ui/avatar.png" mode="aspectFit" /><view><text>{{ today.snapshot.child.nickname }}</text><text>{{ today.snapshot.child.grade }}</text></view></view>
        <view class="heading"><image src="/static/ui/brand.png" mode="aspectFit" /><view><text>嗨，{{ today.snapshot.child.nickname }}！</text><text class="heading-sub">和{{ pets.pet?.name ?? '伙伴' }}一起，开始今天的学习吧</text></view></view>
      </view>

      <view v-if="notice" class="home-notice" role="status"><text>{{ notice }}</text><button aria-label="关闭提示" @click="notice = ''">知道了</button></view>
      <view class="home-grid">
        <section class="home-card progress-card">
          <view class="card-label"><image src="/static/ui/goal.png" mode="aspectFit" /><text>今天的学习</text></view>
          <view class="progress-copy"><text class="progress-number">{{ today.progress.completed }}<text> / {{ today.progress.total }}</text></text><text>{{ remainingLabel }}</text></view>
          <view class="progress-track" role="progressbar" aria-label="今日任务进度" :aria-valuenow="today.progress.completed" aria-valuemin="0" :aria-valuemax="today.progress.total"><view class="progress-fill" :style="{ width: `${today.progress.percent}%` }" /></view>
          <view class="next-task"><text>下一步</text><text>{{ nextTask ? nextTask.title : '领取今日星星礼包' }}</text></view>
          <button class="primary-button" :disabled="today.busy" @click="navigate('today')">查看今日任务</button>
        </section>

        <section class="home-card companion-card">
          <view class="companion-heading"><view><text>我的伙伴</text><text>{{ pets.pet?.name }} · {{ pets.stage.label }}</text></view><button class="text-button" :disabled="today.busy" @click="navigate('growth')">去照料</button></view>
          <!-- 哺育期直接使用已交付的三种 GIF；其余阶段保留正式静态成长图，避免错误复用幼态动画。 -->
          <PetBlink v-if="pets.pet && pets.stage.key === 'nursing'" class="companion-art" :src="companionAsset" :animation="companionMotion" :active="pageVisible && !today.busy" />
          <image v-else class="companion-art" :src="companionAsset" mode="aspectFit" />
          <view class="companion-footer"><view><text>成长值</text><text>{{ pets.pet?.growth ?? 0 }}{{ pets.stage.next ? ` / ${pets.stage.next}` : ' · 已成熟' }}</text></view><text>伙伴不会因漏打卡退化</text></view>
        </section>

        <section class="home-card reward-card">
          <image src="/static/ui/gift.png" mode="aspectFit" />
          <view><text>今日星星礼包</text><text>完成全部任务后，一次领取 {{ today.snapshot.dailyGiftStars }} 颗星星。</text></view>
          <button class="secondary-button" :disabled="today.busy" @click="navigate('today')">去完成</button>
        </section>
      </view>
    </main>
  </view>
</template>

<style scoped>
.home-shell{display:flex;min-height:100vh}.home-main{flex:1;min-width:0;padding:0 28px 48px}.home-header{min-height:252px;padding:72px 8px 32px;position:relative}.mock-badge{position:absolute;top:20px;right:145px;color:#958d9f;font-size:12px}.profile{position:absolute;top:16px;right:0;display:flex;align-items:center;gap:12px}.profile image{width:60px;height:60px}.profile text{display:block;font-size:23px}.profile text:last-child{font-size:18px;color:var(--muted)}.heading{display:flex;align-items:center;gap:18px;color:var(--ink)}.heading image{width:94px;height:94px}.heading text{display:block;font-size:62px;font-weight:900;line-height:1.15;letter-spacing:1px}.heading .heading-sub{margin-top:9px;color:#68444b;font-size:26px;font-weight:400;letter-spacing:0}.home-grid{display:grid;grid-template-columns:minmax(300px,.92fr) minmax(360px,1.08fr);gap:18px;max-width:1280px}.home-card{background:#fff;border:1.5px solid var(--line);border-radius:28px;box-shadow:var(--card-shadow);min-width:0}.progress-card{padding:28px;display:flex;flex-direction:column}.card-label{display:flex;align-items:center;gap:12px;color:#301749;font-size:29px;font-weight:700}.card-label image{width:55px;height:55px}.progress-copy{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:28px 0 15px;color:#826d9f;font-size:18px}.progress-number{color:var(--purple-deep);font-size:55px;font-weight:800}.progress-number text{font-size:28px;color:#563e77}.progress-track{height:20px;overflow:hidden;background:#eee8ff;border-radius:18px}.progress-fill{height:100%;border-radius:inherit;background:var(--purple);transition:width .25s ease}.next-task{margin:28px 0 25px;padding:16px 18px;border-radius:16px;background:#f5f0ff;color:#735c93}.next-task text{display:block;line-height:1.6}.next-task text:last-child{color:#301749;font-size:21px;font-weight:700}.primary-button,.secondary-button{min-height:56px;border-radius:17px;padding:14px 20px;font-size:20px}.primary-button{width:100%;background:var(--purple);color:#fff}.primary-button[disabled],.secondary-button[disabled]{background:#c6bfd6;color:#fff}.companion-card{position:relative;padding:28px 28px 0;overflow:hidden;background:#fffdf8}.companion-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.companion-heading text{display:block;color:#301749;font-size:29px;font-weight:700}.companion-heading text:last-child{margin-top:5px;color:#806b9e;font-size:17px;font-weight:400}.text-button{background:#f0eaff;color:var(--purple-deep);border:1px solid var(--line);border-radius:14px;padding:10px 16px;font-size:16px;white-space:nowrap}.companion-art{display:block;width:100%;height:310px;margin:0 auto}.companion-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 -28px;padding:18px 28px;background:#f4efff;color:#795f9d;font-size:15px}.companion-footer>view text{display:block}.companion-footer>view text:last-child{font-size:22px;font-weight:700;color:#301749}.reward-card{grid-column:1/-1;display:flex;align-items:center;gap:18px;padding:20px 26px;background:#f5f0ff}.reward-card image{width:94px;height:82px;flex-shrink:0}.reward-card>view{flex:1;min-width:0}.reward-card text{display:block;color:#301749;font-size:25px;font-weight:700}.reward-card text:last-child{margin-top:6px;color:#775f98;font-size:17px;font-weight:400;line-height:1.6}.secondary-button{background:#fff;color:var(--purple-deep);border:1px solid var(--line);white-space:nowrap}.home-notice{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1280px;margin:-10px 0 18px;padding:12px 16px;border-radius:14px;background:#f5f0ff;color:#5d477d;line-height:1.5}.home-notice button{background:transparent;color:var(--purple-deep);padding:7px;font-size:14px;white-space:nowrap}
@media(max-width:999px){.home-main{padding:0 20px 36px}.home-header{min-height:202px;padding-top:68px}.heading text{font-size:44px}.heading .heading-sub{font-size:21px}.home-grid{grid-template-columns:1fr}.reward-card{grid-column:auto}.companion-art{height:270px}.profile text{font-size:18px}.profile text:last-child{font-size:14px}.profile image{width:48px;height:48px}.mock-badge{right:105px}.reward-card{align-items:flex-start}}
@media(max-width:600px){.home-main{padding:0 12px 26px}.home-header{min-height:184px;padding:72px 0 20px}.mock-badge{top:16px;left:0;right:auto;font-size:10px}.profile{top:14px}.profile text{display:none}.heading{gap:10px}.heading image{width:52px;height:52px}.heading text{font-size:31px}.heading .heading-sub{font-size:16px;margin-top:7px}.progress-card,.companion-card{padding:20px}.card-label{font-size:23px}.card-label image{width:42px;height:42px}.progress-copy{margin:20px 0 12px;font-size:15px}.progress-number{font-size:42px}.progress-number text{font-size:21px}.next-task{margin:20px 0}.companion-heading text{font-size:24px}.companion-art{height:220px}.companion-footer{margin:0 -20px;padding:15px 20px;align-items:flex-start;flex-direction:column;gap:7px}.reward-card{padding:18px;gap:10px}.reward-card image{width:66px;height:64px}.reward-card text{font-size:20px}.reward-card text:last-child{font-size:14px}.secondary-button{font-size:16px;padding:10px;min-height:48px}.home-notice{font-size:14px}}
/* 640×360、844×390 等手机横屏优先展示核心进度，避免竖屏头部占满首屏。 */
@media(max-width:844px) and (orientation:landscape){.home-main{padding:0 12px 20px}.home-header{min-height:116px;padding:44px 0 12px}.heading image{width:44px;height:44px}.heading text{font-size:29px}.heading .heading-sub{font-size:16px;margin-top:2px}.profile{top:6px}.mock-badge{top:8px}.home-grid{gap:12px}.progress-card,.companion-card{padding:16px}.companion-art{height:190px}.reward-card{padding:14px 18px}}
@supports (padding: env(safe-area-inset-right)){.home-main{padding-right:max(12px,env(safe-area-inset-right))}}
@media(prefers-reduced-motion:reduce){.progress-fill{transition:none}}
</style>
