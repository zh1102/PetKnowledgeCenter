import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { claimGift, confirmTask, createDemoToday, progressOf, submitTask } from '../features/today/model'

export const useTodayStore = defineStore('today', () => {
  const snapshot = ref(createDemoToday())
  const busy = ref(false)
  const offline = ref(false)
  const failNext = ref(false)
  const error = ref('')
  // 当前原型没有跨日账本；此值仅用于开发演示多宠物里程碑，不作为正式奖励事实。
  const giftDays = ref(0)
  const demoGiftDayCounted = ref(false)
  const progress = computed(() => progressOf(snapshot.value.tasks))
  const waiting = computed(() => snapshot.value.tasks.filter(task => task.status === 'submitted'))

  // 只模拟延迟/失败，不产生 HTTP 请求。失败前不修改事实，按钮锁防止并发重复提交。
  async function run(operation: () => void): Promise<boolean> {
    if (busy.value) return false
    error.value = ''
    if (offline.value) { error.value = '当前为离线演示，请恢复网络后再提交。'; return false }
    busy.value = true
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 350))
      // 延迟途中进入离线仍需拒绝写入，不在网络已断的场景产生演示结算。
      if (offline.value) throw new Error('操作途中进入离线，状态未改变，请恢复后重试。')
      if (failNext.value) { failNext.value = false; throw new Error('模拟提交失败，任务状态未改变，请重试。') }
      operation()
      return true
    } catch (cause: unknown) {
      error.value = cause instanceof Error ? cause.message : '操作未完成，请重试。'
      return false
    } finally { busy.value = false }
  }

  function reset(scenario: 'initial' | 'empty' | 'pending' = 'initial') {
    if (busy.value) return
    snapshot.value = createDemoToday()
    if (scenario === 'empty') snapshot.value.tasks = []
    if (scenario === 'pending') snapshot.value.tasks.forEach(task => { task.status = 'pending' })
    error.value = ''
  }
  function setDemoGiftDays(target: 14 | 30) {
    if (busy.value) return
    giftDays.value = Math.max(giftDays.value, target)
  }
  return { snapshot, busy, offline, failNext, error, giftDays, setDemoGiftDays, progress, waiting, reset, run,
    submit: (id: string) => run(() => submitTask(snapshot.value, id)),
    confirm: (id: string) => run(() => confirmTask(snapshot.value, id)),
    claim: () => run(() => {
      const claimedBefore = snapshot.value.giftClaimed
      claimGift(snapshot.value)
      // 同一演示日期重复点击不会累计新的礼包日；正式环境需服务端按家庭日期去重。
      if (!claimedBefore && !demoGiftDayCounted.value) { giftDays.value += 1; demoGiftDayCounted.value = true }
    }) }
})
