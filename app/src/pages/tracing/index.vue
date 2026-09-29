<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onHide, onResize } from '@dcloudio/uni-app'
import AppSidebar from '../../components/AppSidebar.vue'
import TracingCanvas from '../../components/TracingCanvas.vue'
import { appendStroke, createEmptyDraft, parseDraft, type TraceDraft, type TraceStroke } from '../../features/drawing/model'

const STORAGE_KEY = 'phase03:trace-draft:hanzi-yong'
const draft = ref<TraceDraft>(createEmptyDraft())
const redoStack = ref<TraceStroke[]>([])
const layoutRevision = ref(0)
const feedback = ref('沿着淡紫色“永”字慢慢描写，一笔结束后才保存。')

const progressLabel = computed(() => draft.value.strokes.length ? `已保存 ${draft.value.strokes.length} 笔` : '还没有保存笔画')

function persistDraft() {
  // Phase 0.3 使用 uni storage 验证中断恢复；正式离线队列和 SQLite 在后续阶段实现。
  try { uni.setStorageSync(STORAGE_KEY, draft.value) } catch { feedback.value = '草稿暂时无法保存，请保持页面开启。' }
}

function restoreDraft() {
  try {
    const restored = parseDraft(uni.getStorageSync(STORAGE_KEY))
    if (restored) {
      draft.value = restored
      feedback.value = `已恢复上次的 ${restored.strokes.length} 笔草稿。`
    }
  } catch { feedback.value = '草稿读取失败，已使用空白田字格。' }
}

function addStroke(stroke: TraceStroke) {
  draft.value = appendStroke(draft.value, stroke)
  redoStack.value = []
  feedback.value = `第 ${draft.value.strokes.length} 笔已保存。这里不做书法质量评分。`
  persistDraft()
}

function undo() {
  const strokes = [...draft.value.strokes]
  const removed = strokes.pop()
  if (!removed) { feedback.value = '当前没有可撤销的笔画。'; return }
  redoStack.value = [removed, ...redoStack.value]
  draft.value = { ...draft.value, strokes, updatedAt: Date.now() }
  feedback.value = '已撤销上一笔，可以重做。'
  persistDraft()
}

function redo() {
  const [next, ...remaining] = redoStack.value
  if (!next) { feedback.value = '当前没有可重做的笔画。'; return }
  const restored = { ...next, index: draft.value.strokes.length }
  draft.value = appendStroke(draft.value, restored)
  redoStack.value = remaining
  feedback.value = '已恢复上一笔。'
  persistDraft()
}

function clearDraft() {
  redoStack.value = [...draft.value.strokes]
  draft.value = createEmptyDraft()
  feedback.value = '田字格已清空，可以重新描写。'
  persistDraft()
}

function navigate(destination: string) {
  if (destination === 'chinese') return
  if (destination === 'home' || destination === 'today') {
    uni.redirectTo({ url: destination === 'home' ? '/pages/index/index' : '/pages/today/index' })
    return
  }
  if (destination === 'growth') { uni.redirectTo({ url: '/pages/pet-center/index' }); return }
  feedback.value = '当前是 Phase 0.3 描红技术样板，其他学习模块尚未接入。'
}

onMounted(restoreDraft)
onHide(persistDraft)
// 页面尺寸改变后只递增版本号，由 renderjs 在视图层重建高清画布并按比例重画。
onResize(() => { layoutRevision.value += 1 })
</script>

<template>
  <view class="trace-page">
    <AppSidebar selected="chinese" @navigate="navigate" />
    <main class="trace-main">
      <header class="trace-header">
        <view><text class="eyebrow">Phase 0.3 · 技术样板</text><text class="title">生字描红</text><text class="subtitle">田字格实时书写，一笔结束后保存；不会自动判定孩子失败。</text></view>
        <view class="character-card"><text class="pinyin">yǒng</text><text class="character">永</text><text>永久 · 永远</text></view>
      </header>
      <view class="trace-grid">
        <section class="guide-card">
          <text class="section-title">书写提示</text>
          <text class="guide-line">1. 一次只用一根手指书写</text>
          <text class="guide-line">2. 沿淡紫色字模完成笔画</text>
          <text class="guide-line">3. 横竖屏切换后草稿仍保留</text>
          <view class="status-box"><text>{{ progressLabel }}</text><text>字模版本 1.0.0</text><text>坐标按画布比例保存</text></view>
          <text class="privacy-note">当前草稿仅保存在本机演示存储，不上传图片或儿童书写内容。</text>
        </section>
        <section class="canvas-card">
          <TracingCanvas :strokes="draft.strokes" :layout-revision="layoutRevision" @stroke-end="addStroke" @ignored="feedback = $event" />
          <view class="toolbar" aria-label="描红操作">
            <button class="secondary" :disabled="!draft.strokes.length" @click="undo">撤销</button>
            <button class="secondary" :disabled="!redoStack.length" @click="redo">重做</button>
            <button class="danger" :disabled="!draft.strokes.length" @click="clearDraft">清空</button>
          </view>
          <text class="feedback" role="status">{{ feedback }}</text>
        </section>
      </view>
    </main>
  </view>
</template>

<style scoped>
.trace-page{display:flex;min-height:100vh;min-height:100dvh}.trace-main{flex:1;min-width:0;padding:34px 28px 48px}.trace-header{display:flex;align-items:center;justify-content:space-between;gap:24px;max-width:1280px;margin:0 auto 24px}.trace-header text{display:block}.eyebrow{font-size:14px;color:var(--purple-deep);font-weight:700}.title{font-size:52px;font-weight:900;margin:8px 0;color:var(--ink)}.subtitle{font-size:20px;line-height:1.6;color:#6f597e}.character-card{width:180px;flex-shrink:0;padding:16px;text-align:center;border:1.5px solid var(--line);border-radius:24px;background:#fff;box-shadow:var(--card-shadow);color:#705a8b}.pinyin{font-size:18px}.character{font-family:"KaiTi","STKaiti",serif;font-size:68px;line-height:1.1;color:var(--purple-deep)}.trace-grid{display:grid;grid-template-columns:minmax(230px,.62fr) minmax(420px,1.38fr);gap:20px;max-width:1280px;margin:0 auto}.guide-card,.canvas-card{padding:24px;border:1.5px solid var(--line);border-radius:28px;background:#fff;box-shadow:var(--card-shadow);min-width:0}.section-title{display:block;font-size:27px;font-weight:700;margin-bottom:20px}.guide-line{display:block;padding:12px 0;border-bottom:1px solid #eee8f7;font-size:18px;line-height:1.6}.status-box{margin:24px 0;padding:18px;border-radius:18px;background:#f4efff}.status-box text{display:block;margin:7px 0;color:#644c85}.privacy-note{display:block;font-size:15px;line-height:1.7;color:#847493}.toolbar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:12px;width:min(100%,560px);margin:20px auto 0}.toolbar button{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;margin:0;padding:0 8px;border-radius:16px;font-size:18px;line-height:1}.secondary{background:#f0eaff;color:var(--purple-deep)}.danger{background:#fff0f1;color:#9d3d48}.toolbar button[disabled]{background:#eeeaf3;color:#a59cac}.feedback{display:block;max-width:560px;min-height:52px;margin:14px auto 0;padding:12px 16px;border-radius:14px;background:#fff8e7;color:#755a2c;line-height:1.6;text-align:center}
@media(max-width:999px){.trace-main{padding:24px 20px 36px}.trace-header{align-items:flex-start}.title{font-size:42px}.character-card{width:150px}.trace-grid{grid-template-columns:1fr}.guide-card{order:2}.canvas-card{order:1}}
@media(max-width:600px){.trace-main{padding:18px 12px 28px}.trace-header{display:block}.title{font-size:32px}.subtitle{font-size:16px}.character-card{display:none}.guide-card,.canvas-card{padding:16px;border-radius:20px}.toolbar{gap:8px}.toolbar button{font-size:16px;padding:10px 4px}}
@media(max-width:844px) and (orientation:landscape){.trace-main{padding:12px}.trace-header{margin-bottom:12px}.title{font-size:30px;margin:2px 0}.subtitle{font-size:15px}.character-card{display:none}.trace-grid{grid-template-columns:minmax(190px,.7fr) minmax(340px,1.3fr);gap:12px}.guide-card{order:initial;padding:16px}.canvas-card{order:initial;padding:14px}.guide-line{font-size:15px;padding:6px 0}.status-box{margin:12px 0;padding:10px}.privacy-note{font-size:13px}}
</style>
