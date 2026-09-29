<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppSidebar from '../../components/AppSidebar.vue'
import PetBlink from '../../components/PetBlink.vue'
import PetCareArt from '../../components/PetCareArt.vue'
import PetCareEffect from '../../components/PetCareEffect.vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { speciesOptions, type Species, type CareAction } from './model'
import { usePetStore } from '../../stores/pet'
import { useTodayStore } from '../../stores/today'
const props = defineProps<{ adoption?: boolean; center?: boolean }>()
const pets = usePetStore()
const today = useTodayStore()
const selected = ref<Species>('cat')
// uni-app页面生命周期适用于H5和App，退到后台后卸载GIF避免持续解码。
const pageVisible = ref(true)
onHide(() => { pageVisible.value = false; effect.value = null; careSpriteAction.value = null })
onShow(() => { pageVisible.value = true })
const selectionRevision = ref(0)
const careRevision = ref(0)
// 仅抚摸和清洁使用对应物种、阶段的精灵图；其余照料沿用原有提示。
const careSpriteAction = ref<'touch' | 'clean' | null>(null)
const effect = ref<'feed' | CareAction | null>(null)
const feedback = ref('')
let feedbackTimer: ReturnType<typeof setTimeout> | undefined
const statusRows = computed(() => {
  const state = pets.pet?.wellbeing
  return state ? [
    { label: '饱足', value: state.fullness, icon: 'fullness' }, { label: '清洁', value: state.cleanliness, icon: 'clean' },
    { label: '快乐', value: state.happiness, icon: 'happy' }, { label: '活力', value: state.energy, icon: 'energy' },
    { label: '知识', value: today.progress.percent, icon: 'knowledge' },
  ] : []
})
// 点击只触发一次短反馈；不等待动画结束，不用定时器影响路由和销毁。
function selectPet(species: Species) {
  if (today.busy) return
  if (selected.value !== species) selectionRevision.value += 1
  selected.value = species
}
const name = ref('团团')
const dialog = ref<'adopt' | 'newAdopt' | 'feed' | 'route' | 'notice' | null>(null)
const notice = ref('')
const imageFailed = ref(false)
const selectedOption = computed(() => speciesOptions.find(item => item.id === selected.value))
const growthPercent = computed(() => Math.min(100, (pets.pet?.growth ?? 0) / (pets.stage.next ?? 500) * 100))
// 直接进入未领养档案也需回到领养；已创建首宠则不允许通过返回路由重复创建。
onMounted(() => {
  if (!props.adoption && !pets.pet) uni.redirectTo({ url: '/pages/adoption/index' })
  if (props.adoption && pets.pet) uni.redirectTo({ url: '/pages/pet/index' })
})
function asset(species: Species, stage = 'nursing') {
  const version = speciesOptions.find(item => item.id === species)?.version
  // 猫成长期正式版本仍为 v1，其余阶段为 v2，避免引用并不存在的文件。
  return `/static/pets/${species}-${stage}-${species === 'cat' && stage === 'growth' ? 'v1' : version}.png`
}
function navigate(destination: string) {
  if (destination === 'chinese') { uni.redirectTo({ url: '/pages/tracing/index' }); return }
  if (today.busy) return
  if (!pets.pet) { notice.value = '先免费领取一位伙伴，再开始今天的学习吧。'; dialog.value = 'notice'; return }
  if (destination === 'home' || destination === 'today') uni.redirectTo({ url: destination === 'home' ? '/pages/index/index' : '/pages/today/index' })
  else if (destination === 'pet') uni.redirectTo({ url: '/pages/pet/index' })
  else if (destination === 'growth') uni.redirectTo({ url: '/pages/pet-center/index' })
  else { notice.value = '这个专区还在准备中，本轮先体验领养、学习与投喂。'; dialog.value = 'notice' }
}
function close() { if (!today.busy) { dialog.value = null; today.error = '' } }
function open(value: 'adopt' | 'feed' | 'route') { today.error = ''; effect.value = null; careSpriteAction.value = null; dialog.value = value }
// 达到确定性里程碑后只列出尚未领养的基础伙伴，失败时保留当前伙伴和弹窗供重试。
function openNewAdoption() {
  if (!pets.adoption.available || today.busy || today.offline) return
  const next = speciesOptions.find(option => !pets.pets.some(item => item.species === option.id))
  if (!next) return
  selected.value = next.id
  name.value = ''
  today.error = ''
  careSpriteAction.value = null
  effect.value = null
  dialog.value = 'newAdopt'
}
function switchPet(species: Species) {
  if (today.busy || pets.pet?.species === species) return
  careSpriteAction.value = null
  effect.value = null
  imageFailed.value = false
  pets.select(species)
}
// 成功提示采用固定定位 Toast：不参与右侧状态卡的文档流，避免操作后整行卡片和页面底部下移。
function showFeedback(message: string) {
  feedback.value = message
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => { feedback.value = ''; feedbackTimer = undefined }, 2200)
}
// 页面销毁时清理延时器，防止切页后旧 Toast 回调修改已卸载页面状态。
onBeforeUnmount(() => { if (feedbackTimer) clearTimeout(feedbackTimer) })
async function confirmAdoption() {
  if (await pets.adopt(selected.value, name.value)) uni.redirectTo({ url: '/pages/today/index' })
}
async function confirmNewAdoption() {
  if (await pets.adoptNext(selected.value, name.value)) { imageFailed.value = false; dialog.value = null; showFeedback('新伙伴已加入，可以切换照料。') }
}
async function confirmFeed() {
  effect.value = null
  // 先成功结算，再播放飞星；后台/暂停时仅保留文字反馈，不重播动画。
  // 成功才播放飞星；后台则只保留文字反馈，不能通过动画改变成长或余额。
  if (await pets.feed()) { showFeedback('投喂成功：成长 +5，饱足 +10（演示）。'); careRevision.value += 1; dialog.value = null; if (pageVisible.value) effect.value = 'feed' }
}
const actions: { id: CareAction; label: string; status: string }[] = [
  { id: 'clean', label: '清洁', status: '清洁' }, { id: 'play', label: '玩耍', status: '快乐' },
  { id: 'rest', label: '休息', status: '活力' }, { id: 'touch', label: '抚摸', status: '快乐' },
]
// 成功后才触发短动作反馈，失败沿用共享错误提示；动效与事实更新不互相依赖。
async function care(action: typeof actions[number]) {
  feedback.value = ''
  if (feedbackTimer) clearTimeout(feedbackTimer)
  effect.value = null
  if (await pets.care(action.id)) { showFeedback(`${action.label}完成：${action.status} +10（演示），不消耗星星。`); careRevision.value += 1; careSpriteAction.value = action.id === 'touch' || action.id === 'clean' ? action.id : null; if (pageVisible.value) effect.value = action.id }
}
</script>
<template>
  <view class="pet-shell">
    <AppSidebar :selected="adoption ? 'today' : 'growth'" @navigate="navigate" />
    <view class="pet-main">
      <view class="pet-header"><text class="mock">本地演示 · Mock · 刷新重置</text><view class="title"><image v-if="adoption || center" class="title-icon" :src="center ? '/static/ui/pet-center-house.png' : '/static/ui/book.png'" mode="aspectFit" /><text>{{ adoption ? '领取你的伙伴' : center ? '宠物中心' : `${pets.pet?.name ?? '伙伴'}的伙伴档案` }}</text></view><text class="subtitle">{{ adoption ? '选择一位伙伴，陪你一起学习和成长。' : center ? `照料${pets.pet?.name ?? '伙伴'}，陪它慢慢长大。` : '一起学习成长，做更棒的自己！' }}</text></view>
      <template v-if="adoption">
        <view class="adoption-grid" :class="{ 'motion-paused': !!dialog || today.busy }">
          <button v-for="option in speciesOptions" :key="option.id" class="pet-choice card" :class="{ chosen: selected === option.id }" :aria-label="`选择${option.title.split(' · ')[0]}`" :aria-pressed="selected === option.id" :disabled="today.busy" @click="selectPet(option.id)">
            <text class="choice-state">{{ selected === option.id ? '已选择' : '认识一下' }}</text>
            <view :key="`${option.id}-${selected === option.id ? selectionRevision : 'idle'}`" class="choice-feedback" :class="{ responding: selected === option.id && selectionRevision > 0 }">
              <!-- 三种伙伴使用各自正式资产生成的GIF；只有选中态解码播放，失败静态兜底。 -->
              <PetBlink class="choice-art" :src="asset(option.id)" :animation="`/static/pets/${option.id}-nursing-motion-v2.gif`" :active="selected === option.id && pageVisible && !dialog && !today.busy" />
            </view><text class="choice-title">{{ option.title }}</text><text class="choice-description">{{ option.description }}</text>
          </button>
        </view>
        <text v-if="imageFailed" class="error">部分伙伴图片不可用，请稍后重试。</text>
        <view class="adoption-footer"><text>首只伙伴免费，确认前可以更换。</text><button class="secondary" @click="open('route')">查看成长说明</button><button class="primary" :disabled="today.busy || today.offline" @click="open('adopt')">确认领养并开始学习</button></view>
      </template>
      <!-- P08独立呈现，仍复用P16操作与store：跨页不重置余额、次数和成长。 -->
      <view v-else-if="pets.pet && center" class="detail-grid center-grid">
        <!-- 抚摸和清洁已由宠物精灵图呈现爱心/水滴，中心页不再叠加通用粒子效果。 -->
        <PetCareEffect v-if="effect && effect !== 'touch' && effect !== 'clean' && pageVisible && !dialog" :key="careRevision" :kind="effect" />
        <view class="card center-companion">
          <view class="center-pet-heading"><text>{{ pets.pet.name }}</text><text class="stage">{{ pets.stage.label }}</text></view>
          <!-- 当前伙伴切换不改动其余伙伴的状态；选中态同时用文字和按钮样式表达。 -->
          <view v-if="pets.pets.length > 1" class="pet-switcher"><button v-for="companion in pets.pets" :key="companion.species" class="pet-switch" :class="{ current: pets.pet.species === companion.species }" :aria-pressed="pets.pet.species === companion.species" :disabled="today.busy" @click="switchPet(companion.species)">{{ companion.name }}{{ pets.pet.species === companion.species ? ' · 当前' : '' }}</button></view>
          <!-- 免费照料的短请求不暂停 GIF，避免 busy 时切回不同画布比例的静态图而造成视觉缩小/位移。 -->
          <!-- 固定宠物画布播放十帧 WebP；静态图常驻兜底，动作切换不改变外层尺寸。 -->
          <PetCareArt class="center-art" :src="asset(pets.pet.species, pets.stage.key)" :idle="`/static/pets/${pets.pet.species}-nursing-motion-v2.gif`" :species="pets.pet.species" :stage="pets.stage.key" :action="pets.stage.key === 'mature' ? null : careSpriteAction" :revision="careRevision" :active="pageVisible && !dialog" />
          <text v-if="imageFailed" class="error">伙伴图片暂不可用，照料记录不受影响。</text>
          <button class="primary center-action" :disabled="today.busy || today.offline" @click="open('feed')"><image src="/static/ui/pet-center-apple-transparent-v3.png" mode="aspectFit" /><text>投喂苹果 · 5 星</text></button>
          <button class="secondary center-action" :disabled="today.busy || today.offline" @click="care(actions[3]!)"><image src="/static/ui/pet-fullness-transparent-v2.png" mode="aspectFit" /><text>免费抚摸</text></button>
          <button class="secondary center-action" :disabled="today.busy || today.offline" @click="care(actions[0]!)"><image src="/static/ui/pet-clean-transparent-v2.png" mode="aspectFit" /><text>清洁 · 免费</text></button>
          <!-- 原档案页的全部照料迁入唯一中心，合并入口不丢失免费动作。 -->
          <view class="center-links"><button class="secondary" :disabled="today.busy || today.offline" @click="care(actions[1]!)">玩耍 · 免费</button><button class="secondary" :disabled="today.busy || today.offline" @click="care(actions[2]!)">休息 · 免费</button></view>
        </view>
        <view class="card center-status">
          <text class="section-title">今天的状态</text>
          <view v-for="status in statusRows" :key="status.label" class="status-row"><image class="state-icon" :src="`/static/ui/pet-${status.icon}.png`" mode="aspectFit" /><text class="state-label">{{ status.label }}</text><view class="status-track" role="progressbar" :aria-label="status.label" :aria-valuenow="status.value" aria-valuemin="0" aria-valuemax="100"><view class="fill" :style="{ width: `${status.value}%` }" /></view><text>{{ status.value }}</text></view>
          <view class="status-row"><image class="state-icon" src="/static/ui/pet-energy.png" mode="aspectFit" /><text class="state-label growth-label">成长值</text><view class="status-track" role="progressbar" aria-label="伙伴成长" :aria-valuenow="pets.pet.growth" :aria-valuemax="pets.stage.next ?? 500"><view class="fill" :style="{ width: `${growthPercent}%` }" /></view><text>{{ pets.pet.growth }} / {{ pets.stage.next ?? '成熟' }}</text></view>
          <view class="center-ledger"><view><image src="/static/ui/star.png" mode="aspectFit" /><text>星星余额</text><text>{{ today.snapshot.stars }}</text></view><view><image src="/static/ui/pet-center-apple.png" mode="aspectFit" /><text>今日投喂</text><text>{{ pets.pet.feeds }} / 4 次</text></view></view>
          <view class="center-links"><button class="secondary" @click="open('route')">查看成长路线</button><button class="primary" :disabled="!pets.adoption.available || today.busy || today.offline" @click="openNewAdoption">{{ pets.adoption.available ? '免费领养新伙伴' : pets.adoption.slot === null ? '基础伙伴已全部领养' : '新伙伴尚未解锁' }}</button></view>
          <text class="demo adoption-rule">{{ pets.adoption.reason }} 当前累计礼包日为演示数据，正式资格以服务端记录为准。</text>
          <button class="secondary center-detail" :disabled="today.busy" @click="navigate('pet')">查看伙伴成长档案</button>
          <text v-if="today.error && !dialog" class="error" role="alert">{{ today.error }}</text>
          <text class="demo">状态恢复量 +10 为演示；知识 = 今日已确认进度，不决定阶段。本次会话投喂最多 4 次，刷新重置，尚未接入服务端日期。</text>
        </view>
        <text class="center-safety">伙伴不会因为漏打卡而受伤、离开或退化。</text>
      </view>
      <view v-else-if="pets.pet" class="detail-grid">
        <PetCareEffect v-if="effect && pageVisible && !dialog" :key="careRevision" :kind="effect" />
        <view class="card portrait"><text class="stage">{{ pets.stage.label }}</text><view :key="careRevision" :class="{ 'care-responding': careRevision > 0 }"><image class="detail-art" :src="asset(pets.pet.species, pets.stage.key)" mode="aspectFit" @error="imageFailed = true" /></view><text v-if="imageFailed" class="error">图片暂不可用，伙伴成长记录不会丢失。</text><view class="growth-title">成长值 <text>{{ pets.pet.growth }}{{ pets.stage.next ? ` / ${pets.stage.next}` : ' · 已成熟' }}</text></view><view class="track" role="progressbar" aria-label="伙伴成长" :aria-valuenow="pets.pet.growth" :aria-valuemax="pets.stage.next ?? 500"><view class="fill" :style="{ width: `${growthPercent}%` }" /></view><text class="growth-note">{{ pets.stage.next ? `距离下一阶段还差 ${pets.stage.next - pets.pet.growth} 点` : '已经成熟，仍然可以陪你一起学习。' }}</text><button class="secondary route" @click="open('route')">查看成长路线</button></view>
        <view class="detail-right">
          <!-- 档案只解释成长事实，不再复制照料和余额区，不伪造历史记录。 -->
          <view class="card wellbeing"><text class="section-title">伙伴成长档案</text><text>伙伴名字：{{ pets.pet.name }}</text><text>当前阶段：{{ pets.stage.label }}</text><text>累计成长：{{ pets.pet.growth }} 点</text><text>本次会话投喂：{{ pets.pet.feeds }} 次</text><text class="demo">完整成长历史与装扮尚未开放；这里不生成不存在的记录。</text></view>
          <view class="card wellbeing"><text class="section-title">成长阶段</text><view class="stage-row" v-for="step in ['哺育期 · 0–49', '幼态期 · 50–199', '成长期 · 200–499', '成熟期 · 500 及以上']" :key="step">{{ step }}</view><text class="demo">成功投喂累计成长，阶段只前进不倒退。</text><button class="primary center-detail" :disabled="today.busy" @click="navigate('growth')">返回宠物中心照料</button></view>
        </view>
      </view>
      <text v-if="today.offline" class="error">当前为离线演示，不能领养或投喂；恢复后重试。</text>
      <!-- Toast 放在页面层而非状态卡内：显示/消失不会影响双栏卡片高度或页面底部位置。 -->
      <text v-if="feedback" class="care-feedback" role="status" aria-live="polite">{{ feedback }}</text>
      <!-- 显式区分说明/操作弹窗；遮罩外点仍沿用忙碌保护，不改变提交规则。 -->
      <view v-if="dialog" class="backdrop" @click.self="close"><view class="dialog" :class="{ 'dialog-notice': dialog === 'notice' }" role="dialog" aria-modal="true" aria-label="伙伴操作确认"><button class="close" aria-label="关闭弹窗" :disabled="today.busy" @click="close"><image src="/static/ui/dialog-close.png" mode="aspectFit" /></button>
        <!-- 领养与投喂用实际选择宠物的当前阶段，不挪用旧版成长态插画。 -->
        <image v-if="dialog === 'adopt' || dialog === 'newAdopt' || dialog === 'feed'" class="dialog-art" :src="asset(dialog === 'adopt' || dialog === 'newAdopt' ? selected : pets.pet?.species ?? 'cat', dialog === 'adopt' || dialog === 'newAdopt' ? 'nursing' : pets.stage.key)" mode="aspectFit" />
        <image v-else-if="dialog === 'notice'" class="dialog-art" src="/static/ui/dialog-task.png" mode="aspectFit" />
        <template v-if="dialog === 'adopt'"><text class="section-title">领取{{ selectedOption?.title.split(' · ')[0] }}</text><text>首只伙伴免费。给伙伴起个名字吧！</text><input v-model="name" maxlength="24" placeholder="1–12 个字" aria-label="伙伴名字" /><text class="demo">领养后进入今日任务，每只伙伴从哺育期开始。</text><button class="primary" :disabled="today.busy || today.offline" @click="confirmAdoption">{{ today.busy ? '正在领取…' : '免费确认领养' }}</button></template>
        <template v-else-if="dialog === 'newAdopt'"><text class="section-title">免费领养新伙伴</text><text>选择尚未领养的伙伴，它会从哺育期独立成长。</text><view class="new-pet-options"><button v-for="option in speciesOptions.filter(item => !pets.pets.some(companion => companion.species === item.id))" :key="option.id" class="secondary" :class="{ current: selected === option.id }" :aria-pressed="selected === option.id" @click="selected = option.id">{{ option.title.split(' · ')[0] }}</button></view><input v-model="name" maxlength="24" placeholder="1–12 个字" aria-label="新伙伴名字" /><text class="demo">达到里程碑后永久可免费领养；不消耗星星。每只基础伙伴只能领养一次。</text><button class="primary" :disabled="today.busy || today.offline || !pets.adoption.available" @click="confirmNewAdoption">{{ today.busy ? '正在领取…' : '确认免费领养' }}</button></template>
        <template v-else-if="dialog === 'feed'"><text class="section-title">投喂{{ pets.pet?.name }}</text><text>消耗 5 颗星星，增加 5 点成长值。</text><text>今日剩余 {{ 4 - (pets.pet?.feeds ?? 0) }} 次，当前余额 {{ today.snapshot.stars }} 星。</text><text v-if="today.snapshot.stars < 5 || (pets.pet?.feeds ?? 0) >= 4" class="error">{{ today.snapshot.stars < 5 ? '星星不足，先完成今日任务吧。' : '今日投喂次数已用完，明天再来吧。' }}</text><button class="primary" :disabled="today.busy || today.offline || today.snapshot.stars < 5 || (pets.pet?.feeds ?? 0) >= 4" @click="confirmFeed">{{ today.busy ? '投喂中…' : '确认投喂 · 5 星' }}</button></template>
        <template v-else-if="dialog === 'route'">
          <text class="dialog-eyebrow">伙伴成长路线</text><text class="section-title">一点一点，陪伴成长</text>
          <text class="dialog-description">每一次照料，都是陪伴的小脚印。</text>
          <view class="stage-list"><view class="stage-row" v-for="(step, index) in [{name:'哺育期',range:'0–49'}, {name:'幼态期',range:'50–199'}, {name:'成长期',range:'200–499'}, {name:'成熟期',range:'500 及以上'}]" :key="step.name"><text class="stage-number">{{ index + 1 }}</text><text class="stage-name">{{ step.name }}</text><text class="stage-range">{{ step.range }} 成长值</text></view></view>
          <text class="route-rule">成功投喂累计成长，阶段只前进不倒退。</text><text class="demo">每天最多投喂 4 次。多宠物里程碑领养暂未实现，不提供付费加速。</text>
          <button class="primary" @click="close">知道啦</button>
        </template>
        <template v-else><text class="dialog-eyebrow">温馨提醒</text><text class="section-title">伙伴的小消息</text><text>{{ notice }}</text><button class="primary" @click="close">知道啦</button></template><text v-if="today.error" class="error" role="alert">{{ today.error }}</text>
      </view></view>
    </view>
  </view>
</template>
<style scoped>
.pet-shell{display:flex;min-height:100vh}.pet-main{flex:1;min-width:0;padding:35px 24px 40px}.pet-header{padding:35px 8px 28px;position:relative}.mock{display:block;text-align:right;font-size:12px;color:var(--muted);margin-bottom:22px}.title{display:block;font-size:48px;font-weight:900;overflow-wrap:anywhere;color:var(--ink)}.subtitle{display:block;font-size:23px;margin-top:12px;line-height:1.5}.card{background:white;border:1.5px solid var(--line);border-radius:28px;box-shadow:var(--card-shadow)}.adoption-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.pet-choice{padding:22px 18px;text-align:left;min-width:0;color:#301749}.chosen{border:3px solid var(--purple);background:#fcfaff}.choice-state{display:block;font-size:16px;color:var(--purple-deep)}.choice-art{width:100%;height:265px;display:block}.choice-title{display:block;font-size:23px;font-weight:700;margin:16px 0}.choice-description{display:block;border-top:1px solid var(--line);padding-top:18px;font-size:18px;line-height:1.7;min-height:120px}.adoption-footer{display:flex;align-items:center;flex-wrap:wrap;gap:16px;margin-top:25px;font-size:18px}.adoption-footer>text{flex:1;min-width:180px}.primary,.secondary{padding:15px 22px;min-height:52px;border-radius:18px;font-size:20px;line-height:1.5}.primary{background:var(--purple);color:white}.secondary{background:#f0eaff;color:var(--purple-deep);border:1px solid var(--line)}.primary[disabled]{background:#c6bfd6;color:white}.detail-grid{display:grid;grid-template-columns:1fr 1.04fr;gap:18px}.portrait{padding:25px;min-width:0}.stage{display:inline-block;background:#e4dcff;color:var(--purple-deep);padding:14px 24px;border-radius:35px;font-size:25px;font-weight:700}.detail-art{width:100%;height:350px;display:block}.growth-title{text-align:center;font-size:25px}.growth-title text{font-size:32px;font-weight:700;color:var(--purple-deep)}.track{height:22px;background:#eee8ff;border-radius:20px;overflow:hidden;margin:18px 0}.fill{background:var(--purple);height:100%;border-radius:inherit}.growth-note{display:block;text-align:center;font-size:18px;color:var(--muted);margin-bottom:25px}.route{width:100%}.detail-right{display:flex;flex-direction:column;gap:18px}.wellbeing{padding:28px;font-size:20px;line-height:1.7}.wellbeing>text{display:block}.section-title{display:block;font-size:28px;font-weight:700;color:#301749;margin-bottom:16px;overflow-wrap:anywhere}.demo{display:block;font-size:16px;color:#7d6d92;line-height:1.7;margin-top:18px}.care-card{padding:20px;flex:1}.care-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.care{background:#f5f0ff;padding:10px;border-radius:20px;display:flex;align-items:center;gap:10px;font-size:22px;color:#301749;min-height:110px}.care image{width:75px;height:80px;flex-shrink:0}.balance{background:#fff6e2;border-radius:18px;padding:16px;font-size:17px;margin:18px 0;line-height:1.7}.balance text{display:block}.care-card>.primary{width:100%}.backdrop{position:fixed;inset:0;z-index:100;background:rgba(43,29,63,.24);display:flex;align-items:center;justify-content:center;padding:24px}.dialog{width:520px;max-width:100%;max-height:85vh;overflow:auto;border-radius:28px;background:var(--cream);padding:30px;border:1px solid var(--line);box-shadow:0 15px 45px #2b1d3f26}.dialog>text{display:block;line-height:1.7;font-size:18px}.dialog .section-title{font-size:28px}.close{background:transparent;color:#756288;margin-left:auto;padding:10px;min-height:44px;font-size:16px}.dialog input{height:55px;background:white;border:1px solid var(--line);border-radius:12px;padding:12px;font-size:20px;margin:18px 0}.dialog>.primary{width:100%;margin-top:24px}.error{display:block;font-size:17px;color:#a43e46;line-height:1.7;margin-top:14px}.stage-row{background:#f0eaff;margin-bottom:10px;border-radius:12px;padding:14px;font-size:20px}
@media(min-width:1360px){.title{font-size:67px}.pet-header{padding-bottom:32px}.choice-art{height:350px}.choice-title{font-size:29px}.choice-description{font-size:23px}.pet-main{padding:35px 28px}.detail-art{height:410px}.care{min-height:145px}.care image{width:100px;height:110px}}
@media(max-width:999px){.adoption-grid{grid-template-columns:1fr}.pet-choice{display:grid;grid-template-columns:140px 1fr;column-gap:16px}.choice-art{grid-column:1;grid-row:1/4;height:170px}.choice-state,.choice-title,.choice-description{grid-column:2}.choice-description{min-height:0;font-size:18px}.detail-grid{grid-template-columns:1fr}.title{font-size:40px}.subtitle{font-size:20px}.pet-header{padding-top:0}}
@media(max-width:600px){.pet-main{padding:20px 12px}.title{font-size:29px}.pet-choice{display:block}.choice-art{height:220px}.choice-title{font-size:23px}.care-grid{grid-template-columns:1fr}.detail-art{height:240px}.growth-title text{font-size:26px}.adoption-footer>.primary{width:100%}}
/* 标准 iPad 横屏两列卡片较窄，图文纵排保持中文标签完整，避免每两字换行。 */
@media(min-width:1000px) and (max-width:1359px){.care{flex-direction:column;font-size:18px;gap:4px;min-height:125px}.care image{width:65px;height:65px}.care text{white-space:nowrap}.pet-header{padding-top:10px}.pet-main{padding-top:20px}}
.title{display:flex;align-items:center;gap:16px}.title-icon{width:85px;height:85px;flex-shrink:0}
/* 仅让选中伙伴轻微起伏，静态图含坐垫，因此称为起伏动效而非真实呼吸/骨骼动画。 */
.motion-controls{display:flex;justify-content:flex-end;margin:-12px 0 12px}.motion-controls button{font-size:15px;min-height:44px;padding:8px 16px}
.chosen .choice-art{animation:pet-idle 4.6s ease-in-out infinite;transform-origin:50% 85%}
.responding{animation:pet-select .45s ease-out 1;transform-origin:50% 85%}
.motion-paused .choice-art,.motion-paused .choice-feedback{animation:none!important;transform:none!important}
@keyframes pet-idle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.008)}}
@keyframes pet-select{0%,100%{transform:translateY(0)}45%{transform:translateY(-5px)}}
@media(max-width:999px){.choice-feedback{grid-column:1;grid-row:1/4}.choice-feedback .choice-art{width:100%}}
@media(max-width:600px){.motion-controls{margin:0 0 12px}}
@media(prefers-reduced-motion:reduce){.choice-art,.choice-feedback{animation:none!important;transform:none!important}}
@media(min-width:1360px){.subtitle{font-size:32px}.adoption-footer{font-size:23px}.adoption-footer button{font-size:25px}.title{-webkit-text-stroke:.7px var(--ink)}}
@media(max-width:600px){.title-icon{width:45px;height:45px}}
/* 状态使用名称+数值，不只靠颜色；免费动作保持大热区，单次反馈而非持续晃动。 */
.status-row{display:flex;align-items:center;gap:12px;margin:12px 0;font-size:18px}.status-row>text:first-child{width:42px;flex-shrink:0}.status-row>text:last-child{width:90px;text-align:right;white-space:nowrap;font-size:16px}.status-track{flex:1;min-width:20px;background:#eee8ff;border-radius:18px;height:19px;overflow:hidden}.care-feedback{display:block;background:#e9f8ee;color:#245e39;padding:12px;border-radius:12px;margin-top:14px;line-height:1.6;font-size:17px}.care-card .care{min-height:80px;justify-content:center;font-size:20px}.care-card .care image{width:60px;height:60px}.care-card .care[disabled]{background:#eeeaf5;color:#897e9b}.care-responding{animation:pet-select .55s ease-out 1}.wellbeing .demo{font-size:14px}.wellbeing{padding:22px}
@media(prefers-reduced-motion:reduce){.care-responding{animation:none!important}}
@media(max-width:600px){.status-row{gap:6px}.status-row>text:last-child{width:72px;font-size:14px}.wellbeing{padding:16px}}
/* 弹窗局部优化：固定关闭热区，正文自然换行；限制整卡高度，短屏可滚动。 */
.backdrop{padding:24px;background:rgba(43,29,63,.28);overflow:hidden}
.dialog{position:relative;box-sizing:border-box;width:520px;max-width:100%;max-height:calc(100vh - 48px);padding:48px 32px 28px;background:#fffdf7;border:1px solid #e5dcf5;border-radius:26px;box-shadow:0 12px 36px rgba(43,29,63,.16);overscroll-behavior:contain}
.dialog .close{position:absolute;top:16px;right:18px;width:72px;height:44px;min-height:44px;margin:0;padding:10px 16px;display:flex;align-items:center;justify-content:center;line-height:1.4;border-radius:14px;background:#f3eefb;border:1px solid #e6dcf6;color:#756288;font-size:15px;white-space:nowrap;letter-spacing:0}
.dialog .close::after{border:none}.dialog>.section-title{padding-right:24px;margin:12px 0 16px;font-size:28px;line-height:1.4}
.dialog>text{overflow-wrap:anywhere;line-height:1.65}.dialog .dialog-eyebrow{font-size:13px;font-weight:700;color:var(--purple-deep);letter-spacing:1px;margin-bottom:6px}.dialog .dialog-description{font-size:16px;color:#7d6d92;margin-bottom:20px}.dialog>.primary{margin-top:24px;min-height:52px;font-size:18px;border-radius:16px}.dialog-notice{width:460px}.dialog .demo{font-size:14px;line-height:1.7;margin-top:14px;padding:12px 14px;background:#f7f3fd;border-radius:12px}.dialog input{box-sizing:border-box;width:100%;min-height:56px}.stage-list{margin:4px 0 18px}.stage-row{display:flex;align-items:center;gap:12px;padding:14px;margin:0 0 10px;border:1px solid #e9e2f6;border-radius:14px;background:#faf7ff}.stage-number{width:32px;height:32px;flex-shrink:0;line-height:32px;text-align:center;border-radius:10px;background:#ebe2ff;color:var(--purple-deep);font-size:16px;font-weight:700}.stage-name{font-size:18px;font-weight:700}.stage-range{margin-left:auto;font-size:14px;color:#7d6d92;text-align:right}.dialog .route-rule{font-size:16px}
@media(max-width:600px){.backdrop{padding:16px}.dialog{padding:48px 22px 22px;max-height:calc(100vh - 32px);border-radius:22px}.dialog>.section-title{font-size:24px}.stage-row{gap:8px;padding:12px}.stage-name{font-size:16px}.stage-range{font-size:12px}}
/* uni-button全局!important行高覆盖了旧44px行高；改为flex居中不依赖行高。 */
.dialog{padding-top:76px}.dialog .close:active{background:#e7dcfa}.dialog .close[disabled]{opacity:.5}.dialog>.primary{display:flex;align-items:center;justify-content:center;padding:14px 20px}.dialog .section-title{margin-top:6px}.dialog .stage-list{margin-top:22px}
/* 仅短距离进入，不依赖动画完成回调；减少动态效果时立即显示。 */
.dialog{animation:dialog-enter .16s ease-out both}
@keyframes dialog-enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.dialog{animation:none}}
/* 同步弹窗母版：白底、居中标题、分区间距；保留输入与状态列表可编辑。 */
.dialog{background:#fff;text-align:center;padding:44px 28px 28px;border-radius:24px}.dialog .close{top:12px;right:12px;width:44px;height:44px;background:transparent;border:0;padding:12px}.dialog .close image{width:20px;height:20px}.dialog-art{display:block;width:220px;max-width:100%;height:150px;margin:0 auto 16px}.dialog>.section-title{padding:0;margin:18px 0 16px}.dialog>.demo{margin-top:16px}.dialog>.primary{margin-top:24px}.stage-list{text-align:left}.dialog input{text-align:left}.dialog>.dialog-eyebrow{margin-top:24px}
/* P16母版细化：状态图标、稳定照料热区、清晰余额分区，不重画角色。 */
.detail-grid{position:relative}.state-icon{width:40px;height:40px;flex-shrink:0}.state-label{width:42px;flex-shrink:0}.status-row{gap:10px;margin:12px 0}.status-track{height:20px}.care-card .care{min-height:106px;flex-direction:row;gap:12px;padding:16px;font-size:20px}.care-card .care image{width:50px;height:50px}.care-grid{gap:14px}.balance{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border:1px solid #fff0cd;background:#fff9e8}.portrait .route{font-size:22px;min-height:64px}.detail-grid .card{border-radius:24px}.wellbeing .section-title{font-size:24px}.care-card>.primary{font-size:18px;min-height:48px}.wellbeing .demo{font-size:12px}.growth-title text{font-size:40px}
@media(max-width:600px){.state-icon{width:30px;height:30px}.state-label{width:36px}.status-row{gap:6px;font-size:16px}.care-card .care{font-size:18px}.growth-title text{font-size:32px}}
/* P08沿用母版双栏白卡，低于1000px单栏；表单/按钮文字长时允许换行。 */
.center-grid{grid-template-columns:1.03fr 1fr;gap:18px}.center-companion,.center-status{padding:28px;min-width:0}.center-pet-heading{display:flex;align-items:center;gap:20px;flex-wrap:wrap;font-size:32px;font-weight:700;overflow-wrap:anywhere}.center-pet-heading .stage{font-size:21px;padding:10px 20px}.center-art{display:block;width:100%;height:340px;margin:20px 0}.center-action{width:100%;display:flex;align-items:center;justify-content:center;gap:14px;border-radius:30px;margin-top:14px;min-height:62px;line-height:1.2;font-size:23px}.center-action image{display:block;align-self:center;width:38px;height:38px;flex-shrink:0}.center-action text{display:block;align-self:center;line-height:1.2}.center-status .section-title{font-size:32px;margin:8px 0 26px}.center-status .status-row{margin:22px 0;font-size:21px;gap:14px}.center-status .state-label{width:48px}.center-status .growth-label{width:64px}.center-status .status-row>text:last-child{width:100px;font-size:18px}.center-ledger{border-top:1px solid var(--line);padding-top:22px;margin-top:28px}.center-ledger>view{display:flex;align-items:center;gap:14px;background:#f4efff;padding:15px;border-radius:16px;margin-bottom:12px;font-size:23px}.center-ledger image{width:42px;height:42px;flex-shrink:0}.center-ledger text:last-child{margin-left:auto;white-space:nowrap;color:var(--purple-deep)}.center-links{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}.center-links button{padding:14px 10px;font-size:18px;width:100%;min-height:60px}.center-detail{width:100%;margin-top:16px;font-size:16px;padding:10px 14px;min-height:48px}.center-safety{grid-column:1/-1;display:block;text-align:right;color:#9382b5;line-height:1.65;font-size:16px}.center-status .demo{font-size:13px}
/* 独立 Toast 覆盖页面层：不占高度，连续操作时复用同一个提示位。 */
.care-feedback{position:fixed;z-index:220;left:50%;bottom:32px;box-sizing:border-box;max-width:calc(100vw - 48px);margin:0;padding:13px 18px;border:1px solid #cdebd6;border-radius:14px;background:#e9f8ee;box-shadow:0 10px 26px rgba(43,29,63,.16);color:#245e39;line-height:1.6;font-size:17px;transform:translateX(-50%);pointer-events:none;animation:toast-enter .18s ease-out both}
@keyframes toast-enter{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
@media(min-width:1360px){.center-art{height:380px}.center-status .section-title{font-size:38px}.center-status .status-row{font-size:25px;margin:28px 0}.center-action{font-size:28px;min-height:76px}.center-links button{font-size:23px;min-height:72px}}
@media(max-width:999px){.center-grid{grid-template-columns:1fr}.center-art{height:280px}.center-companion,.center-status{padding:24px}.center-safety{text-align:center}.center-status .status-row{gap:10px}}
@media(max-width:600px){.center-companion,.center-status{padding:18px}.center-art{height:220px}.center-pet-heading{font-size:25px;gap:10px}.center-status .section-title{font-size:25px}.center-action{font-size:19px}.center-status .status-row{font-size:16px;gap:6px}.center-status .status-row>text:last-child{width:76px;font-size:14px}.center-status .state-label{width:34px}.center-status .growth-label{width:48px}.center-ledger>view{font-size:18px;padding:12px}.center-links{grid-template-columns:1fr}.center-links button{font-size:18px}.center-safety{font-size:14px}.care-feedback{bottom:20px;font-size:15px}}
/* 多宠物切换与领养选项保持大热区，长名字换行；锁定原因独立占行避免挤压按钮。 */
.pet-switcher,.new-pet-options{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.pet-switcher .pet-switch,.new-pet-options button{min-height:48px;padding:9px 16px;border-radius:14px;background:#f0eaff;color:var(--purple-deep);font-size:16px;overflow-wrap:anywhere}.pet-switcher .current,.new-pet-options .current{background:var(--purple);color:#fff}.adoption-rule{margin-top:12px;overflow-wrap:anywhere}.new-pet-options{justify-content:center}
@media(max-width:600px){.pet-switcher .pet-switch,.new-pet-options button{flex:1 1 115px;font-size:15px}}
/* 手机横屏使用紧凑头部和图像高度，保留单列结构以避免状态条及中文标签被压断。 */
@media(max-width:844px) and (orientation:landscape){.pet-main{padding:10px 12px 20px}.pet-header{padding:0 0 14px}.mock{margin-bottom:4px}.title{font-size:29px}.title-icon{width:44px;height:44px}.subtitle{font-size:16px;margin-top:4px}.choice-art,.detail-art,.center-art{height:190px}.center-companion,.center-status{padding:16px}.care-grid{grid-template-columns:1fr 1fr}.care-card .care{min-height:72px}}
/* 软键盘或地址栏改变高度时以动态视口约束弹窗，并为圆角屏安全区留白。 */
.dialog{max-height:calc(100dvh - 48px)}
@supports (padding: env(safe-area-inset-right)){.pet-main{padding-right:max(12px,env(safe-area-inset-right))}.backdrop{padding-bottom:max(16px,env(safe-area-inset-bottom))}}
</style>
