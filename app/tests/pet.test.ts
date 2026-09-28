import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adopt, adoptNext, nextAdoption, feed, careFor, stageOf } from '../src/features/pet/model.js'
test('首次免费，重复领养与非法名字拒绝', () => {
  const pet = adopt(null, 'rabbit', ' 小白 ')
  assert.equal(pet.name, '小白'); assert.equal(pet.growth, 0)
  assert.throws(() => adopt(pet, 'cat', '团团'))
  for (const name of ['', 'a'.repeat(13), '团\u0000团']) assert.throws(() => adopt(null, 'cat', name))
  assert.throws(() => adopt(null, 'dragon', '团团'))
})
test('投喂不足不扣星，四次上限，成长门槛准确', () => {
  const pet = adopt(null, 'dog', '旺旺')
  assert.throws(() => feed(pet, 4)); assert.equal(pet.growth, 0)
  let stars = 35
  for (let i = 0; i < 4; i++) stars = feed(pet, stars)
  assert.equal(stars, 15); assert.equal(pet.growth, 20)
  assert.throws(() => feed(pet, stars)); assert.equal(pet.growth, 20)
  assert.deepEqual([49,50,199,200,499,500].map(value => stageOf(value).key), ['nursing','juvenile','juvenile','growth','growth','mature'])
})
test('成长异常失败前不改变投喂次数', () => {
  const pet = adopt(null, 'cat', '团团'); pet.growth = NaN
  assert.throws(() => feed(pet, 35)); assert.equal(pet.feeds, 0)
})
test('免费照料只改变对应状态，上限100，不刷成长或投喂', () => {
  const pet = adopt(null, 'rabbit', '小白')
  careFor(pet, 'clean'); assert.equal(pet.wellbeing.cleanliness, 80)
  careFor(pet, 'rest'); assert.equal(pet.wellbeing.energy, 85)
  for (let i = 0; i < 20; i++) careFor(pet, 'play')
  careFor(pet, 'touch'); assert.equal(pet.wellbeing.happiness, 100)
  assert.equal(pet.wellbeing.fullness, 80); assert.equal(pet.growth, 0); assert.equal(pet.feeds, 0)
  assert.throws(() => careFor(pet, 'unknown'))
})
test('状态损坏时投喂不部分更新', () => {
  const pet = adopt(null, 'cat', '团团'); pet.wellbeing.energy = NaN
  assert.throws(() => feed(pet, 35)); assert.equal(pet.growth, 0); assert.equal(pet.feeds, 0)
})
// 对抗性检查：缺少状态字段也必须在任何修改前拒绝。
test('缺失状态字段拒绝投喂和免费照料', () => {
  const pet = adopt(null, 'cat', '团团')
  delete (pet.wellbeing as Partial<typeof pet.wellbeing>).fullness
  assert.throws(() => feed(pet, 35)); assert.throws(() => careFor(pet, 'clean'))
  assert.equal(pet.growth, 0); assert.equal(pet.feeds, 0); assert.equal(pet.wellbeing.cleanliness, 70)
})
test('第二只需首宠成长期与14个礼包日，未达标和重复物种均不改变原宠物', () => {
  const first = adopt(null, 'cat', '团团')
  const group = [first]
  first.growth = 199
  assert.equal(nextAdoption(group, 14).available, false)
  first.growth = 200
  assert.equal(nextAdoption(group, 13).available, false)
  assert.equal(nextAdoption(group, 14).available, true)
  assert.throws(() => adoptNext(group, 14, 'cat', '重复'))
  assert.throws(() => adoptNext(group, 14, 'dog', ''))
  assert.equal(group.length, 1)
  const second = adoptNext(group, 14, 'dog', '旺旺')
  group.push(second)
  assert.equal(second.growth, 0)
  assert.equal(first.growth, 200)
  careFor(second, 'clean')
  assert.equal(first.wellbeing.cleanliness, 70)
  assert.equal(second.wellbeing.cleanliness, 80)
})
test('第三只需两宠与30个礼包日，基础伙伴最多三只', () => {
  const first = adopt(null, 'cat', '团团'); first.growth = 200
  const second = adoptNext([first], 14, 'dog', '旺旺')
  const group = [first, second]
  assert.equal(nextAdoption(group, 29).available, false)
  assert.throws(() => adoptNext(group, 29, 'rabbit', '小白'))
  const third = adoptNext(group, 30, 'rabbit', '小白')
  group.push(third)
  assert.equal(nextAdoption(group, 30).available, false)
  assert.throws(() => adoptNext(group, 30, 'cat', '第四只'))
  assert.equal(group.length, 3)
  assert.equal(nextAdoption([first], -1).available, false)
})
