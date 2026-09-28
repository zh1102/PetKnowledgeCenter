export type Species = 'cat' | 'dog' | 'rabbit'
export type CareAction = 'clean' | 'play' | 'rest' | 'touch'
export interface Pet { species: Species; name: string; growth: number; feeds: number; wellbeing: { fullness: number; cleanliness: number; happiness: number; energy: number } }
export const speciesOptions: { id: Species; title: string; description: string; version: string }[] = [
  { id: 'cat', title: '小猫 · 温柔好奇', description: '喜欢探索新事物，会一直陪在你身边。', version: 'v2' },
  { id: 'dog', title: '小狗 · 热情可靠', description: '总是充满活力，在你需要时给你力量。', version: 'v1' },
  { id: 'rabbit', title: '兔子 · 安静细心', description: '喜欢安静地思考，陪你一步一步进步。', version: 'v3' },
]
// 首宠只创建一次；名称限制为 1–12 个 Unicode 字符，拒绝控制字符，失败不修改状态。
export function adopt(existing: Pet | null, species: string, input: string): Pet {
  if (existing) throw new Error('你已经领取过首位伙伴啦。')
  if (!speciesOptions.some(option => option.id === species)) throw new Error('请选择猫、狗或兔子。')
  const name = input.trim()
  if (!name || Array.from(name).length > 12 || /[\u0000-\u001f\u007f]/u.test(name)) throw new Error('请填写 1–12 个字的伙伴名字。')
  // 基线与每次恢复10仅为可见交互演示，非生产配置；不自动衰减或制造儿童焦虑。
  return { species: species as Species, name, growth: 0, feeds: 0, wellbeing: { fullness: 80, cleanliness: 70, happiness: 90, energy: 75 } }
}
// 第二、第三只只按已冻结的里程碑解锁；礼包日必须是不同日期的累计结果，演示环境由 Mock 面板注入。
export function nextAdoption(pets: Pet[], giftDays: number): { slot: 2 | 3 | null; available: boolean; reason: string } {
  if (!Number.isSafeInteger(giftDays) || giftDays < 0) return { slot: null, available: false, reason: '礼包日数据异常。' }
  if (pets.length === 0) return { slot: null, available: false, reason: '请先免费领取首只伙伴。' }
  if (pets.length >= 3) return { slot: null, available: false, reason: '三位基础伙伴已全部领养。' }
  if (pets.length === 1) {
    const growth = pets[0]?.growth ?? -1
    if (!Number.isSafeInteger(growth) || growth < 0) return { slot: 2, available: false, reason: '首只伙伴成长数据异常。' }
    if (growth < 200 || giftDays < 14) return { slot: 2, available: false, reason: `第二只需首宠达到成长期、累计领取 14 个不同日期的礼包；当前首宠成长 ${growth}/200，礼包日 ${giftDays}/14。` }
    return { slot: 2, available: true, reason: '第二只基础伙伴已解锁，可免费领养。' }
  }
  if (giftDays < 30) return { slot: 3, available: false, reason: `第三只需已有两只伙伴、累计领取 30 个不同日期的礼包；当前礼包日 ${giftDays}/30。` }
  return { slot: 3, available: true, reason: '第三只基础伙伴已解锁，可免费领养。' }
}

// 先验证资格、物种与名字，再返回新伙伴；失败不修改已有伙伴或星星。
export function adoptNext(pets: Pet[], giftDays: number, species: string, input: string): Pet {
  const unlock = nextAdoption(pets, giftDays)
  if (!unlock.available) throw new Error(unlock.reason)
  if (pets.some(pet => pet.species === species)) throw new Error('这位伙伴已经领养，请选择尚未领养的伙伴。')
  return adopt(null, species, input)
}
export function stageOf(growth: number) {
  if (growth >= 500) return { key: 'mature', label: '成熟期', next: null }
  if (growth >= 200) return { key: 'growth', label: '成长期', next: 500 }
  if (growth >= 50) return { key: 'juvenile', label: '幼态期', next: 200 }
  return { key: 'nursing', label: '哺育期', next: 50 }
}
// 先完整校验再扣星；本轮仅内存原子更新，生产需服务端事务/账本/日期和幂等键。
export function feed(pet: Pet, stars: number): number {
  if (!Number.isSafeInteger(stars) || stars < 5) throw new Error('星星不足，完成今日任务后再来吧。')
  if (!Number.isSafeInteger(pet.feeds) || pet.feeds < 0 || pet.feeds >= 4) throw new Error('今天已投喂 4 次，可以明天再来。')
  if (!Number.isSafeInteger(pet.growth) || pet.growth < 0 || !Number.isSafeInteger(pet.growth + 5)) throw new Error('成长数据异常，未扣除星星。')
  validateWellbeing(pet)
  pet.growth += 5
  pet.feeds += 1
  pet.wellbeing.fullness = Math.min(100, pet.wellbeing.fullness + 10)
  return stars - 5
}

// 完整检查后再修改，坏数据不部分更新；免费照料不增加余额、成长或投喂次数。
function validateWellbeing(pet: Pet): void {
  // 显式校验四个必需字段，避免缺失字段被 Object.values 跳过后写入 NaN。
  const values = pet.wellbeing && [pet.wellbeing.fullness, pet.wellbeing.cleanliness, pet.wellbeing.happiness, pet.wellbeing.energy]
  if (!values || values.some(value => !Number.isInteger(value) || value < 0 || value > 100)) throw new Error('伙伴状态异常，请重试。')
}
export function careFor(pet: Pet, action: string): void {
  validateWellbeing(pet)
  const target = action === 'clean' ? 'cleanliness' : action === 'play' || action === 'touch' ? 'happiness' : action === 'rest' ? 'energy' : null
  if (!target) throw new Error('照料动作不存在。')
  pet.wellbeing[target] = Math.min(100, pet.wellbeing[target] + 10)
}
