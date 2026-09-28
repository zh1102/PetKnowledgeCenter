import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claimGift, confirmTask, createDemoToday, progressOf, submitTask } from '../src/features/today/model.js'

test('初始3/5，待确认不算完成，礼包剩2项', () => {
  assert.deepEqual(progressOf(createDemoToday().tasks), { completed: 3, total: 5, remaining: 2, percent: 60, eligible: false })
})
test('单项提交不发星星，未全部确认不能领取', () => {
  const state = createDemoToday()
  submitTask(state, 'explain-math')
  assert.equal(state.stars, 35)
  assert.equal(state.tasks.find(task => task.id === 'explain-math')?.status, 'submitted')
  assert.throws(() => claimGift(state))
})
test('全部确认后仅结算一次；20次重复领取不重复发奖', () => {
  const state = createDemoToday()
  submitTask(state, 'explain-math')
  confirmTask(state, 'explain-math')
  confirmTask(state, 'sanmi')
  for (let i = 0; i < 20; i++) claimGift(state)
  assert.equal(state.stars, 55)
  assert.equal(state.giftClaimed, true)
})
test('系统任务提交直接确认，家长任务必须先提交', () => {
  const state = createDemoToday()
  const math = state.tasks.find(task => task.id === 'math')
  if (!math) throw new Error('fixture absent')
  math.status = 'pending'
  submitTask(state, 'math')
  assert.equal(math.status, 'confirmed')
  assert.throws(() => confirmTask(state, 'explain-math'))
})
test('空任务、无效任务、非法奖励拒绝，不改变余额', () => {
  const state = createDemoToday()
  assert.throws(() => submitTask(state, 'missing'))
  state.tasks = []
  assert.equal(progressOf(state.tasks).eligible, false)
  assert.throws(() => claimGift(state))
  assert.equal(state.stars, 35)
})
test('选做任务不阻塞；负奖励不能结算', () => {
  const state = createDemoToday()
  state.tasks.forEach(task => { task.status = 'confirmed' })
  state.tasks.push({ id: 'optional', title: '选做', description: '', durationMinutes: 1, confirmationMode: 'guardian', status: 'pending', icon: 'book', required: false })
  assert.equal(progressOf(state.tasks).eligible, true)
  state.dailyGiftStars = -1
  assert.throws(() => claimGift(state))
  assert.equal(state.stars, 35)
})
