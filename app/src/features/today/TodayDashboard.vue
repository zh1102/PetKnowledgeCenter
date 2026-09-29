<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { usePetStore } from '../../stores/pet'
import { speciesOptions } from '../pet/model'
import AppSidebar from '../../components/AppSidebar.vue'
import PetBlink from '../../components/PetBlink.vue'
import { useTodayStore } from '../../stores/today'
import type { LearningTask } from './model'

const props = defineProps<{ taskPage?: boolean }>()
const store = useTodayStore()
const pets = usePetStore()
// 任务页退到后台时卸载 GIF，静态图会自动兜底，避免 iPad/App 后台继续解码。
const pageVisible = ref(true)
onHide(() => { pageVisible.value = false })
onShow(() => { pageVisible.value = true })
// 首次进入只引导免费领养，不建立真实登录状态；刷新会重置 Mock。
onMounted(() => { if (!pets.pet) uni.redirectTo({ url: '/pages/adoption/index' }) })
const companionAsset = computed(() => {
  const pet = pets.pet
  const option = speciesOptions.find(item => item.id === pet?.species)
  const version = pet?.species === 'cat' && pets.stage.key === 'growth' ? 'v1' : option?.version
  return pet && option ? `/static/pets/${pet.species}-${pets.stage.key}-${version}.png` : '/static/ui/cat-official.png'
})
const companionMotion = computed(() => pets.pet ? `/static/pets/${pets.pet.species}-nursing-motion-v2.gif` : '')
const selected = ref<LearningTask | null>(null)
const dialog = ref<'task' | 'settings' | 'gift' | 'notice' | null>(null)
const notice = ref('')
const explanation = ref('')
const imageFailed = ref(false)
const activeFilter = ref<'all' | 'pending' | 'submitted'>('all')
const visibleTasks = computed(() => store.snapshot.tasks.filter(task => activeFilter.value === 'all' || task.status === activeFilter.value))
const giftLabel = computed(() => store.snapshot.giftClaimed ? '今日已领取' : store.progress.eligible ? '领取星星礼包' : store.progress.total ? `还差 ${store.progress.remaining} 项` : '暂无今日礼包')
const labels = { confirmed: '已完成', submitted: '待家长确认', pending: '去完成' }

// 页面白名单仅有已实现的首页与今日任务；其余入口明确告知未实现，不建立假导航。
function navigate(destination: string) {
  if (destination === 'chinese') { uni.redirectTo({ url: '/pages/tracing/index' }); return }
  // 已实现的宠物中心走真实路由，其余专区仍显示未实现提示。
  if (destination === 'growth') { uni.redirectTo({ url: '/pages/pet-center/index' }); return }
  if (destination === 'pet') { uni.redirectTo({ url: '/pages/pet/index' }); return }
  if (destination === 'settings') { dialog.value = 'settings'; return }
  if (destination === 'stars') { notice.value = `当前演示余额：${store.snapshot.stars} 颗星星。真实余额将以服务端为准。`; dialog.value = 'notice'; return }
  if (destination === 'home' || destination === 'today') {
    const url = destination === 'home' ? '/pages/index/index' : '/pages/today/index'
    const pages = getCurrentPages()
    const route = pages[pages.length - 1]?.route
    if (route !== url.slice(1)) uni.redirectTo({ url })
    return
  }
  notice.value = '该专区尚未实现。本阶段只包含首页与今日任务，请先完成今天的学习。'
  dialog.value = 'notice'
}
function openTask(task: LearningTask) {
  selected.value = task
  explanation.value = ''
  store.error = ''
  dialog.value = 'task'
}
async function submitSelected() {
  if (!selected.value) return
  // 这里仅模拟任务提交，不伪装为语音识别、答题判分或真实学习证据。
  if (await store.submit(selected.value.id)) { dialog.value = null }
}
async function receiveGift() {
  if (await store.claim()) dialog.value = 'gift'
}
function closeDialog() { if (!store.busy) { dialog.value = null; store.error = '' } }
// uni-app switch 使用自定义 detail；兼容 Vue 将 switch 识别为 SVG 标签的事件声明，并校验事件载荷。
function switchValue(event: unknown): boolean {
  const detail = (event as { detail?: { value?: unknown } })?.detail
  return detail?.value === true
}
function setOffline(event: unknown) { store.offline = switchValue(event) }
function setFailNext(event: unknown) { store.failNext = switchValue(event) }
</script>

<template>
  <view class="app-shell">
    <AppSidebar @navigate="navigate" />
    <view class="main-content">
      <view class="page-header">
        <view class="profile"><image src="/static/ui/avatar.png" mode="aspectFit" /><view><text class="nickname">{{ store.snapshot.child.nickname }}</text><text class="grade">{{ store.snapshot.child.grade }}</text></view></view>
        <text class="mock-badge">本地演示 · Mock</text>
        <view class="heading"><image src="/static/ui/header-today.png" mode="aspectFit" /><text>今天的任务</text></view>
        <text class="subtitle">完成五项任务，一次领取今日星星礼包。</text>
        <image class="header-note" src="/static/ui/note.png" mode="aspectFit" />
      </view>

      <view v-if="store.offline" class="offline-banner">离线演示：你可以查看任务，提交和礼包领取暂不可用。</view>
      <view class="dashboard-grid">
        <view class="card progress-card">
          <view class="progress-heading"><image src="/static/ui/goal.png" mode="aspectFit" /><text>今日进度</text><text class="progress-value">{{ store.progress.completed }} <text class="total">/ {{ store.progress.total }}</text></text></view>
          <view class="progress-track" role="progressbar" :aria-valuenow="store.progress.completed" :aria-valuemax="store.progress.total" aria-valuemin="0" aria-label="今日任务进度"><view class="progress-fill" :style="{ width: `${store.progress.percent}%` }" /></view>
          <!-- 仅哺育期使用对应物种 GIF，成长阶段仍使用已验收的阶段静态资产。 -->
          <PetBlink v-if="pets.pet && pets.stage.key === 'nursing'" class="companion official-cat" :src="companionAsset" :animation="companionMotion" :active="pageVisible && !dialog && !store.busy" />
          <image v-else class="companion official-cat" :src="companionAsset" mode="aspectFit" @error="imageFailed = true" />
          <text v-if="imageFailed" class="error-text">伙伴图片暂不可用，不影响你的学习进度。</text>
          <view class="encouragement"><text class="encouragement-title">{{ store.progress.eligible ? '今天的努力，全部完成啦！' : '坚持就是最棒的！' }}</text><text>一点一滴的努力，都会让你变得更好！</text></view>
        </view>

        <view class="card tasks-card">
          <view v-if="props.taskPage" class="filters">
            <button v-for="filter in ([{ id: 'all', label: '全部任务' }, { id: 'pending', label: '待完成' }, { id: 'submitted', label: '待确认' }] as const)" :key="filter.id" :class="{ active: activeFilter === filter.id }" @click="activeFilter = filter.id">{{ filter.label }}</button>
          </view>
          <view v-if="!visibleTasks.length" class="empty-state"><text>{{ store.snapshot.tasks.length ? '这里的任务都处理好啦' : '今天还没有安排任务' }}</text><text>{{ store.snapshot.tasks.length ? '切换“全部任务”查看今日进度。' : '请家长配置学习计划，宠物会安心等你。' }}</text></view>
          <button v-for="task in visibleTasks" :key="task.id" class="task-row" :aria-label="`${task.title}，${labels[task.status]}`" :disabled="store.busy" @click="openTask(task)">
            <image class="task-icon" :src="`/static/ui/${task.icon}.png`" mode="aspectFit" />
            <text class="task-title">{{ task.title }}</text>
            <view class="task-state" :class="task.status"><image v-if="task.status !== 'pending'" class="status-icon" :src="`/static/ui/status-${task.status}.png`" mode="aspectFit" /><text>{{ labels[task.status] }}</text></view>
          </button>
          <view class="gift-card"><view class="gift-main"><image src="/static/ui/gift.png" mode="aspectFit" /><view class="gift-copy"><text class="gift-title">今日星星礼包</text><text>全部确认后领取 {{ store.snapshot.dailyGiftStars }} 颗星星</text></view><button class="gift-button" :disabled="!store.progress.eligible || store.snapshot.giftClaimed || store.busy || store.offline" @click="receiveGift">{{ store.busy ? '正在处理…' : giftLabel }}</button></view><text class="gift-note">{{ store.waiting.length ? `还有 ${store.waiting.length} 项等待家长确认，确认后才计入完成。` : store.snapshot.giftClaimed ? '今日礼包已到账，明天继续一起努力！' : '单项任务增加进度，全部完成后一次领取。' }}</text></view>
          <text v-if="store.error && !dialog" class="error-text" role="alert">{{ store.error }}</text>
        </view>
      </view>
    </view>

    <view v-if="dialog" class="modal-backdrop" @click.self="closeDialog">
      <view class="modal" role="dialog" aria-modal="true" :aria-label="dialog === 'task' ? selected?.title : '提示'">
        <button class="close-button" :disabled="store.busy" aria-label="关闭弹窗" @click="closeDialog"><image src="/static/ui/dialog-close.png" mode="aspectFit" /></button>
        <template v-if="dialog === 'task' && selected">
          <image class="modal-icon" src="/static/ui/dialog-task.png" mode="aspectFit" /><text class="modal-title">{{ selected.title }}</text>
          <text class="modal-description">{{ selected.description }}</text>
          <view class="task-meta">约 {{ selected.durationMinutes }} 分钟 · {{ selected.confirmationMode === 'guardian' ? '由家长确认' : '由系统判定' }}</view>
          <template v-if="selected.status === 'pending'"><text class="demo-note">任务内容页尚未开发，以下仅模拟提交；不会判定真实学习完成。</text><input v-model="explanation" class="task-input" placeholder="记录一句学习收获（选填）" maxlength="200" aria-label="学习收获" /><button class="primary-button" :disabled="store.busy || store.offline" @click="submitSelected">{{ store.busy ? '提交中…' : '模拟提交任务' }}</button></template>
          <view v-else class="confirmation-note">{{ selected.status === 'submitted' ? '已提交，等待家长确认。单项任务不会立即发放星星。' : '这项任务已完成，继续保持你的好习惯！' }}</view>
          <button v-if="selected.status !== 'pending'" class="primary-button" @click="closeDialog">知道啦</button>
        </template>
        <template v-else-if="dialog === 'settings'">
          <text class="modal-title">Mock 场景面板</text><text class="demo-note">仅供开发验证，不是正式家长入口；状态仅存在内存中，刷新重置。</text>
          <view class="scenario-row"><text>模拟离线</text><switch :checked="store.offline" color="#9777ee" @change="setOffline" /></view>
          <view class="scenario-row"><text>下一次提交失败</text><switch :checked="store.failNext" color="#9777ee" @change="setFailNext" /></view>
          <view v-for="task in store.waiting" :key="task.id" class="scenario-row"><text>{{ task.title }}</text><button class="small-button" :disabled="store.busy || store.offline" @click="store.confirm(task.id)">模拟家长确认</button></view>
          <view class="scenario-actions"><button class="small-button" :disabled="store.busy" @click="store.reset('initial')">初始 3/5</button><button class="small-button" :disabled="store.busy" @click="store.reset('pending')">全部待开始</button><button class="small-button" :disabled="store.busy" @click="store.reset('empty')">空任务</button></view>
          <!-- 跨日里程碑只在开发面板注入演示数值；正式资格不得由客户端设置。 -->
          <text class="demo-note">多宠物解锁演示：累计礼包日 {{ store.giftDays }}；下列按钮不发星、不生成真实历史。</text>
          <view class="scenario-actions"><button class="small-button" :disabled="store.busy || !pets.pets.length" @click="pets.setDemoFirstGrowth()">首宠达到成长期</button><button class="small-button" :disabled="store.busy" @click="store.setDemoGiftDays(14)">累计 14 礼包日</button><button class="small-button" :disabled="store.busy" @click="store.setDemoGiftDays(30)">累计 30 礼包日</button></view>
        </template>
        <template v-else-if="dialog === 'gift'"><image class="reward-art" src="/static/ui/gift.png" mode="aspectFit" /><text class="modal-title">今天的努力，收到了！</text><text class="modal-description">演示礼包 +{{ store.snapshot.dailyGiftStars }} 颗星星</text><text class="demo-note">当前演示余额 {{ store.snapshot.stars }}。真实结算尚未接入。</text><button class="primary-button" @click="closeDialog">太棒啦</button></template>
        <template v-else><text class="modal-title">温馨提示</text><text class="modal-description">{{ notice }}</text><button class="primary-button" @click="closeDialog">知道了</button></template>
        <text v-if="store.error" class="error-text" role="alert">{{ store.error }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }
.main-content { flex: 1; min-width: 0; padding: 0 20px 35px; }
.page-header { position: relative; min-height: 185px; padding-top: 59px; }
.profile { position: absolute; top: 12px; right: 0; display: flex; gap: 9px; align-items: center; }
.profile image { width: 44px; height: 44px; } .profile text { display: block; } .nickname { font-size: 18px; } .grade { font-size: 14px; color: var(--muted); }
.mock-badge { position: absolute; right: 105px; top: 20px; font-size: 11px; color: #958d9f; }
.heading { display: flex; gap: 18px; align-items: center; font-size: 49px; font-weight: 900; line-height: 1.2; letter-spacing: 2px; }
.heading image { width: 69px; height: 76px; } .subtitle { font-size: 23px; display: block; margin-top: 8px; color: #634148; }
.header-note { position: absolute; width: 184px; height: 103px; right: 0; top: 67px; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1.04fr; gap: 16px; }
.card { background: #fff; border: 1.5px solid var(--line); border-radius: 25px; box-shadow: var(--card-shadow); min-width: 0; }
.progress-card { padding: 29px 23px 24px; display: flex; flex-direction: column; }
.progress-heading { display: flex; gap: 12px; align-items: center; font-size: 25px; font-weight: 700; } .progress-heading image { width: 45px; height: 45px; }
.progress-value { color: var(--purple-deep); font-size: 34px; white-space: nowrap; } .total { font-size: 27px; color: var(--ink); }
.progress-track { background: #efebf7; height: 17px; border-radius: 20px; margin-top: 17px; overflow: hidden; } .progress-fill { height: 100%; background: var(--purple); border-radius: inherit; transition: width .25s ease; }
.companion { width: 100%; height: 290px; margin: 20px 0 15px; } .official-cat { height: 290px; }
.encouragement { margin-top: auto; padding: 23px 24px; background: #f5f0ff; border-radius: 23px; color: #35245d; font-size: 20px; line-height: 1.6; }
.encouragement text { display: block; } .encouragement-title { margin-bottom: 5px; }
.tasks-card { padding: 17px 15px; display: flex; flex-direction: column; gap: 9px; }
.task-row { width: 100%; background: #fff; display: flex; align-items: center; gap: 12px; padding: 9px; min-height: 62px; border: 1px solid var(--line); border-radius: 17px; text-align: left; }
.task-icon { width: 47px; height: 43px; flex-shrink: 0; } .task-title { font-size: 19px; font-weight: 700; color: #241835; flex: 1; min-width: 0; overflow-wrap: anywhere; }
.task-state { padding: 9px 16px; font-size: 16px; font-weight: 700; border-radius: 28px; white-space: nowrap; flex-shrink: 0; }
/* 状态符号来自同一母版，不用字符画勾选；缩小字重避免系统合成粗体显得过硬。 */
.task-state { display: flex; align-items: center; justify-content: center; gap: 7px; }
.status-icon { width: 26px; height: 26px; flex-shrink: 0; }
.heading { font-family: 'PetRound', sans-serif; text-shadow: 0 2px 0 rgba(64,40,44,.08); }
.task-title { font-weight: 700; }
.confirmed { color: var(--green); background: var(--mint); } .submitted { color: var(--orange); background: var(--amber); } .pending { color: white; background: var(--purple); border-radius: 14px; min-width: 90px; text-align: center; }
.gift-card { padding: 20px 12px 15px; background: #f3eeff; border-radius: 20px; margin-top: auto; } .gift-main { display: flex; align-items: center; gap: 9px; } .gift-main image { width: 70px; height: 76px; flex-shrink: 0; } .gift-copy { flex: 1; min-width: 0; font-size: 14px; line-height: 1.5; color: #594279; } .gift-copy text { display: block; } .gift-title { font-size: 22px; font-weight: 700; color: #27173d; margin-bottom: 6px; }
.gift-button { padding: 10px 13px; background: var(--purple); color: white; border-radius: 15px; font-size: 18px; font-weight: 700; min-height: 44px; flex-shrink: 0; } .gift-button[disabled] { background: #c5bed5; color: #fff; }
.gift-note { display: block; text-align: center; color: #8770b5; font-size: 14px; line-height: 1.5; margin-top: 13px; }
.filters { display: flex; gap: 6px; } .filters button { background: #f5f1ff; color: #785baa; border-radius: 12px; padding: 9px 12px; font-size: 14px; } .filters .active { background: var(--purple); color: white; }
.empty-state { padding: 50px 20px; text-align: center; color: #786395; } .empty-state text { display: block; margin-bottom: 15px; line-height: 1.6; }
.offline-banner { background: var(--amber); padding: 12px 18px; border-radius: 12px; margin-bottom: 12px; color: #805418; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(43, 29, 63, .24); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 100; }
.modal { width: 520px; max-width: 100%; max-height: 85vh; overflow-y: auto; background: var(--cream); border-radius: 28px; border: 1px solid var(--line); padding: 33px; box-shadow: 0 15px 45px rgba(43, 29, 63, .15); position: relative; }
/* 与伙伴弹窗一致，使用flex居中规避uni-button默认/全局行高覆盖。 */
.close-button { position:absolute;top:16px;right:18px;background:#f3eefb;border:1px solid #e6dcf6;border-radius:14px;color:#756288;font-size:15px;padding:10px 16px;margin:0;width:72px;height:44px;min-height:44px;display:flex;align-items:center;justify-content:center;white-space:nowrap;letter-spacing:0;line-height:1.4; }
.modal-title { display: block; font-size: 28px; font-weight: 700; margin: 5px 0 18px; } .modal-description { display: block; font-size: 18px; line-height: 1.8; margin-bottom: 20px; overflow-wrap: anywhere; }
.modal-icon { width: 60px; height: 60px; } .task-meta,.confirmation-note { background: #f0eaff; padding: 15px; border-radius: 14px; line-height: 1.7; }
.demo-note { display: block; color: #847493; font-size: 14px; line-height: 1.8; margin: 15px 0; } .task-input { background: white; border: 1px solid #d9cdef; height: 52px; font-size: 16px; padding: 12px; border-radius: 12px; margin: 16px 0; }
.primary-button { width: 100%; background: var(--purple); color: white; min-height: 52px; padding: 14px; font-size: 19px; border-radius: 16px; margin-top: 20px; } .primary-button[disabled],.small-button[disabled] { background: #c5bed5; color: white; }
.scenario-row { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line); } .small-button { background: #ece3ff; color: #633caf; padding: 12px; min-height: 44px; border-radius: 12px; font-size: 14px; } .scenario-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 20px; }
.reward-art { display: block; margin: 0 auto 20px; width: 110px; height: 120px; } .error-text { display: block; color: #a33b46; margin-top: 15px; line-height: 1.7; font-size: 16px; }
@media (min-width: 1360px) { .main-content { padding: 0 28px 55px 21px; } .page-header { min-height: 262px; padding-top: 86px; } .heading { gap: 22px; font-size: 74px; } .heading image { width: 100px; height: 111px; } .subtitle { font-size: 34px; margin-top: 0; padding-left: 31px; } .profile { top: 18px; right: 0; gap: 13px; } .profile image { width: 62px; height: 61px; } .nickname { font-size: 25px; } .grade { font-size: 20px; } .mock-badge { top: 22px; right: 150px; } .header-note { width: 282px; height: 158px; top: 97px; } .dashboard-grid { grid-template-columns: 1fr 1.04fr; gap: 16px; } .card { border-radius: 31px; } .progress-card { padding: 40px 34px 34px; } .progress-heading { font-size: 35px; gap: 16px; } .progress-heading image { width: 67px; height: 66px; } .progress-value { font-size: 47px; } .total { font-size: 39px; } .progress-track { height: 24px; margin-top: 10px; } .companion,.official-cat { height: 360px; margin: 20px 0; } .encouragement { font-size: 28px; padding: 32px 34px; min-height: 167px; } .tasks-card { padding: 23px 20px 18px; gap: 10px; } .task-row { min-height: 87px; padding: 11px 14px; gap: 23px; border-radius: 23px; } .task-icon { width: 70px; height: 61px; } .task-title { font-size: 27px; } .task-state { font-size: 23px; padding: 13px 20px; } .pending { min-width: 155px; } .gift-card { margin-top: 11px; padding: 29px 17px 18px; } .gift-main image { width: 105px; height: 114px; } .gift-title { font-size: 31px; } .gift-copy { font-size: 20px; } .gift-button { font-size: 25px; padding: 14px 20px; } .gift-note { font-size: 19px; } }
@media (min-width: 1000px) and (max-width: 1359px) { .header-note { width: 170px; } .heading { font-size: 46px; } .subtitle { font-size: 21px; } .companion { height: 256px; } .encouragement { font-size: 19px; } .gift-main { flex-wrap: wrap; } .gift-button { margin-left: auto; } }
@media (max-width: 999px) { .header-note { display: none; } .dashboard-grid { grid-template-columns: 1fr; } .progress-card { padding: 24px; } .companion,.official-cat { height: 240px; } .encouragement { margin-top: 0; padding: 16px 22px; } .tasks-card { padding: 18px; } .page-header { min-height: 182px; } .heading { font-size: 43px; } .subtitle { font-size: 20px; line-height: 1.5; } .gift-main { gap: 12px; } .gift-title { font-size: 23px; } }
@media (max-width: 600px) { .main-content { padding: 0 12px 25px; } .page-header { min-height: 182px; padding-top: 74px; } .heading { font-size: 26px; gap: 9px; letter-spacing: 0; } .heading image { width: 40px; height: 44px; } .subtitle { font-size: 16px; margin-top: 13px; } .profile { top: 15px; } .mock-badge { left: 0; right: auto; top: 15px; font-size: 9px; } .progress-heading { font-size: 20px; gap: 7px; } .progress-heading image { width: 32px; height: 32px; } .progress-value { font-size: 25px; } .total { font-size: 20px; } .progress-card { padding: 18px 14px; } .encouragement { font-size: 16px; } .task-row { flex-wrap: wrap; gap: 9px; } .task-title { font-size: 18px; } .task-state { font-size: 14px; margin-left: auto; } .task-icon { width: 34px; height: 34px; } .gift-main { flex-wrap: wrap; } .gift-main image { width: 50px; height: 55px; } .gift-title { font-size: 20px; } .gift-button { width: 100%; } .modal { padding: 23px; } }
/* 手机横屏压缩头部和插画高度，任务卡仍保持单列与完整文字。 */
@media (max-width:844px) and (orientation:landscape) { .main-content{padding:0 12px 20px}.page-header{min-height:116px;padding-top:44px}.heading{font-size:29px}.heading image{width:42px;height:46px}.subtitle{font-size:16px;margin-top:2px}.profile{top:6px}.mock-badge{top:8px}.companion,.official-cat{height:190px}.tasks-card{padding:14px}.task-row{min-height:52px} }
@media (prefers-reduced-motion: reduce) { .progress-fill { transition: none; } }
/* 1448 母版的垂直节奏：插画保留完整比例，卡片下边缘及鼓励文案与原稿对齐。 */
@media (min-width: 1360px) {
  .main-content { padding-bottom: 35px; }
  .heading { font-size: 72px; letter-spacing: 1px; -webkit-text-stroke: 1px var(--ink); }
  .task-row { min-height: 86px; gap: 20px; }
  .task-state { font-size: 22px; padding: 10px 14px; }
  .status-icon { width: 37px; height: 37px; }
  .companion,.official-cat { height: 317px; margin: 32px 0; }
  .encouragement { font-size: 24px; padding: 31px 32px; min-height: 167px; }
  .gift-title { font-size: 29px; }
  .gift-copy { font-size: 19px; }
  .gift-button { font-size: 24px; padding: 14px 17px; }
}
/* 放在视口覆盖之后，为右上角关闭按钮预留独立区域，避免标题重叠。 */
.modal{box-sizing:border-box;padding-top:76px;max-height:calc(100vh - 48px);background:#fffdf7;animation:modal-enter .16s ease-out both}.close-button:active{background:#e7dcfa}.close-button[disabled]{opacity:.5}
@keyframes modal-enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.modal{animation:none}}
/* 统一为资产母版的白色居中卡片；开发面板保持原表单布局，不改变业务。 */
.modal{background:#fff; padding:40px 28px 28px;border-color:#e8e1f5;text-align:center;border-radius:24px}.modal .close-button{width:44px;height:44px;right:12px;top:12px;background:transparent;border:0;padding:12px}.close-button image{width:20px;height:20px}.modal-icon{display:block;width:220px;max-width:100%;height:146px;margin:0 auto 16px}.modal-title{margin:0 24px 14px;line-height:1.4}.modal-description{color:#7d6d92;line-height:1.65;margin-bottom:16px}.task-meta{font-size:15px;padding:12px 16px;border-radius:12px;background:#faf7ff}.confirmation-note{margin-top:16px;padding:14px 16px;background:#f5f0ff;color:#756288;border-radius:12px;line-height:1.65}.modal>.primary-button{width:100%;margin-top:24px;min-height:52px}.modal .demo-note{margin-top:16px}.modal .scenario-row{text-align:left}.modal .reward-art{display:block;margin:8px auto 16px}
@media(max-width:600px){.modal{padding:40px 22px 22px}.modal-title{font-size:24px}.modal-icon{height:126px;width:190px}}
/* 动态视口随软键盘变化，弹窗内容区可滚动且底部按钮不会被永久遮住。 */
.modal{max-height:calc(100dvh - 48px);overscroll-behavior:contain}
@supports (padding: env(safe-area-inset-right)){.main-content{padding-right:max(12px,env(safe-area-inset-right))}.modal-backdrop{padding-bottom:max(16px,env(safe-area-inset-bottom))}}
</style>
