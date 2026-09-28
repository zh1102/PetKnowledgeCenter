import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { adopt, adoptNext, nextAdoption, feed, careFor, stageOf, type Pet, type CareAction, type Species } from '../features/pet/model'
import { useTodayStore } from './today'
export const usePetStore = defineStore('pet', () => {
  const pets = ref<Pet[]>([])
  const activeSpecies = ref<Species | null>(null)
  const pet = computed(() => pets.value.find(item => item.species === activeSpecies.value) ?? null)
  const stage = computed(() => stageOf(pet.value?.growth ?? 0))
  const today = useTodayStore()
  const adoption = computed(() => nextAdoption(pets.value, today.giftDays))
  // 复用今日操作锁与失败注入，确保失败前不创建伙伴或扣星，避免两个页面并发写余额。
  return { pet, pets, activeSpecies, stage, adoption,
    adopt: (species: string, name: string) => today.run(() => {
      const created = adopt(pets.value[0] ?? null, species, name)
      pets.value.push(created)
      activeSpecies.value = created.species
    }),
    adoptNext: (species: string, name: string) => today.run(() => {
      const created = adoptNext(pets.value, today.giftDays, species, name)
      pets.value.push(created)
      activeSpecies.value = created.species
    }),
    // 切换只改变当前展示对象；每只伙伴的成长、状态与投喂次数继续独立保存。
    select: (species: Species) => { if (pets.value.some(item => item.species === species)) activeSpecies.value = species },
    // 开发面板可把首宠推进到解锁门槛；不发星、不增加投喂次数，不充当真实成长记录。
    setDemoFirstGrowth: () => {
      if (today.busy) return
      const first = pets.value[0]
      if (first && Number.isSafeInteger(first.growth) && first.growth >= 0) first.growth = Math.max(first.growth, 200)
    },
    feed: () => today.run(() => { if (!pet.value) throw new Error('请先领取你的伙伴。'); today.snapshot.stars = feed(pet.value, today.snapshot.stars) }),
    care: (action: CareAction) => today.run(() => { if (!pet.value) throw new Error('请先领取你的伙伴。'); careFor(pet.value, action) }),
  }
})
