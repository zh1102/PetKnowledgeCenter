export type TaskStatus = 'pending' | 'submitted' | 'confirmed'
export type ConfirmationMode = 'guardian' | 'system'
export interface LearningTask {
  id: string
  title: string
  description: string
  durationMinutes: number
  confirmationMode: ConfirmationMode
  status: TaskStatus
  icon: string
  required: boolean
}
export interface TodaySnapshot {
  child: { id: string; nickname: string; grade: string }
  tasks: LearningTask[]
  stars: number
  dailyGiftStars: number
  giftClaimed: boolean
}

// 未经客户确认的数值仅用于演示，不建立生产奖励规则；孩子档案也是演示化名。
export function createDemoToday(): TodaySnapshot {
  return {
    child: { id: 'demo-child', nickname: '小米', grade: '一年级' },
    stars: 35, dailyGiftStars: 20, giftClaimed: false,
    tasks: [
      { id: 'reading', title: '阅读打卡', description: '安静读一会儿，再告诉家长你读了什么。', durationMinutes: 10, confirmationMode: 'guardian', status: 'confirmed', icon: 'book', required: true },
      { id: 'english', title: '英语打卡', description: '完成家长布置的英语练习，再读给家长听。', durationMinutes: 5, confirmationMode: 'guardian', status: 'confirmed', icon: 'english', required: true },
      { id: 'sanmi', title: '三米打卡', description: '完成三米老师今天布置的英语内容。', durationMinutes: 5, confirmationMode: 'guardian', status: 'submitted', icon: 'clipboard', required: true },
      { id: 'math', title: '数学天天练', description: '完成适龄数学练习，由系统自动判定。', durationMinutes: 5, confirmationMode: 'system', status: 'confirmed', icon: 'math', required: true },
      { id: 'explain-math', title: '讲数学题', description: '把一道题的思路讲给家长听，由家长确认。', durationMinutes: 5, confirmationMode: 'guardian', status: 'pending', icon: 'question', required: true },
    ],
  }
}

// 待确认不计入完成；零任务也不允许领取礼包，避免空计划产生奖励。
export function progressOf(tasks: LearningTask[]) {
  const required = tasks.filter(task => task.required)
  const completed = required.filter(task => task.status === 'confirmed').length
  return { completed, total: required.length, remaining: required.length - completed,
    percent: required.length ? Math.round(completed / required.length * 100) : 0,
    eligible: required.length > 0 && completed === required.length }
}

// mock 同样复现正式规则：提交只推进状态，不改变余额；重复提交不会反向覆盖已确认状态。
export function submitTask(snapshot: TodaySnapshot, id: string): void {
  const task = snapshot.tasks.find(item => item.id === id)
  if (!task) throw new Error('任务不存在，请返回今日任务。')
  if (task.status !== 'pending') return
  task.status = task.confirmationMode === 'system' ? 'confirmed' : 'submitted'
}

// 该函数只由明确标注的开发演示面板调用，不代表实现了生产家长权限验证。
export function confirmTask(snapshot: TodaySnapshot, id: string): void {
  const task = snapshot.tasks.find(item => item.id === id)
  if (!task) throw new Error('任务不存在。')
  if (task.status !== 'submitted') throw new Error('请先提交任务，再进行家长确认。')
  task.status = 'confirmed'
}

// 内存内模拟一次性结算；生产必须由服务端日期、事务和幂等账本提供最终事实。
export function claimGift(snapshot: TodaySnapshot): void {
  if (snapshot.giftClaimed) return
  if (!progressOf(snapshot.tasks).eligible) throw new Error('全部必做任务确认完成后，才可以领取礼包。')
  if (!Number.isSafeInteger(snapshot.dailyGiftStars) || snapshot.dailyGiftStars < 0) throw new Error('礼包配置无效。')
  if (!Number.isSafeInteger(snapshot.stars + snapshot.dailyGiftStars)) throw new Error('星星余额超出演示范围。')
  snapshot.stars += snapshot.dailyGiftStars
  snapshot.giftClaimed = true
}
