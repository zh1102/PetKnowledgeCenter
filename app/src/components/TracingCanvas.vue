<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { createStroke, type TraceStroke } from '../features/drawing/model'

// renderjs 官方要求逻辑层使用选项式 methods，视图层才能通过 callMethod 一笔一次回传。
export default defineComponent({
  props: {
    strokes: { type: Array as PropType<TraceStroke[]>, required: true },
    layoutRevision: { type: Number, required: true },
  },
  emits: {
    strokeEnd: (stroke: TraceStroke) => stroke.points.length >= 2,
    ignored: (reason: string) => reason.length > 0,
  },
  computed: {
    traceCommand(): { revision: string; strokes: TraceStroke[] } {
      // 笔画数量驱动内容重绘，布局版本驱动横竖屏切换后的画布尺寸重建。
      return { revision: `${this.layoutRevision}:${this.strokes.length}`, strokes: this.strokes }
    },
  },
  methods: {
    commitStroke(payload: unknown) {
      if (typeof payload !== 'object' || payload === null) {
        this.$emit('ignored', '笔迹数据无效，已忽略。')
        return
      }
      const points = Reflect.get(payload, 'points')
      const startedAt = Number(Reflect.get(payload, 'startedAt'))
      const endedAt = Number(Reflect.get(payload, 'endedAt'))
      const stroke = createStroke(points, this.strokes.length, startedAt, endedAt)
      if (!stroke) {
        this.$emit('ignored', '请写出一段清晰笔画，轻点不会计入。')
        return
      }
      this.$emit('strokeEnd', stroke)
    },
    reportIgnored(reason: unknown) {
      this.$emit('ignored', typeof reason === 'string' ? reason : '这次触摸没有生成笔画。')
    },
  },
})
</script>

<template>
  <view class="trace-surface" :trace-command="traceCommand" :change:trace-command="traceRenderer.restore">
    <canvas
      class="trace-canvas"
      canvas-id="phase03-trace-canvas"
      disable-scroll
      aria-label="田字格描红画布，示范字永"
      @touchstart="traceRenderer.touchStart"
      @touchmove="traceRenderer.touchMove"
      @touchend="traceRenderer.touchEnd"
      @touchcancel="traceRenderer.touchCancel"
      @mousedown="traceRenderer.mouseStart"
      @mousemove="traceRenderer.mouseMove"
      @mouseup="traceRenderer.mouseEnd"
      @mouseleave="traceRenderer.mouseCancel"
    />
  </view>
</template>

<script module="traceRenderer" lang="renderjs">
// @ts-nocheck -- renderjs 由 uni-app 视图层编译，vue-tsc 不认识它的 this 与第二模块语义。
export default {
  data() {
    return { canvas: null, context: null, width: 0, height: 0, active: null, strokes: [] }
  },
  mounted() {
    setTimeout(() => this.setupCanvas(), 0)
  },
  methods: {
    setupCanvas() {
      const canvas = this.$el.querySelector('canvas')
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * scale)
      canvas.height = Math.round(rect.height * scale)
      const context = canvas.getContext('2d')
      context.setTransform(scale, 0, 0, scale, 0, 0)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      this.canvas = canvas
      this.context = context
      this.width = rect.width
      this.height = rect.height
      this.redraw()
    },
    restore(command) {
      this.strokes = command && Array.isArray(command.strokes) ? command.strokes : []
      // 每次命令变更都重新读取布局尺寸，避免旋转后沿用旧像素缓冲区产生位移。
      this.setupCanvas()
    },
    redraw() {
      if (!this.context) return
      const context = this.context
      context.clearRect(0, 0, this.width, this.height)
      context.save()
      context.strokeStyle = '#d8cbed'
      context.lineWidth = 1.5
      context.setLineDash([8, 8])
      context.beginPath()
      context.moveTo(this.width / 2, 0)
      context.lineTo(this.width / 2, this.height)
      context.moveTo(0, this.height / 2)
      context.lineTo(this.width, this.height / 2)
      context.moveTo(0, 0)
      context.lineTo(this.width, this.height)
      context.moveTo(this.width, 0)
      context.lineTo(0, this.height)
      context.stroke()
      context.setLineDash([])
      context.fillStyle = 'rgba(151,119,238,.15)'
      context.font = `700 ${Math.round(this.width * .67)}px "KaiTi", "STKaiti", serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText('永', this.width / 2, this.height / 2 + this.height * .035)
      context.restore()
      this.strokes.forEach(stroke => this.drawNormalized(stroke.points, '#7250d8'))
    },
    drawNormalized(points, color) {
      if (!this.context || !Array.isArray(points) || points.length < 2) return
      this.context.strokeStyle = color
      this.context.lineWidth = Math.max(7, this.width * .025)
      this.context.beginPath()
      this.context.moveTo(points[0].x * this.width, points[0].y * this.height)
      for (let index = 1; index < points.length; index += 1) this.context.lineTo(points[index].x * this.width, points[index].y * this.height)
      this.context.stroke()
    },
    position(source) {
      const rect = this.canvas.getBoundingClientRect()
      return {
        x: Math.min(1, Math.max(0, (source.clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (source.clientY - rect.top) / rect.height)),
      }
    },
    begin(source, identifier) {
      if (!this.canvas || this.active) return false
      const point = this.position(source)
      this.active = { identifier, startedAt: Date.now(), points: [{ ...point, t: 0 }] }
      return true
    },
    move(source, identifier) {
      if (!this.active || this.active.identifier !== identifier) return
      const point = this.position(source)
      const previous = this.active.points[this.active.points.length - 1]
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < .0015) return
      this.active.points.push({ ...point, t: Date.now() - this.active.startedAt })
      this.redraw()
      this.drawNormalized(this.active.points, '#7250d8')
    },
    finish(identifier) {
      if (!this.active || this.active.identifier !== identifier) return
      const completed = this.active
      this.active = null
      this.$ownerInstance.callMethod('commitStroke', { points: completed.points, startedAt: completed.startedAt, endedAt: Date.now() })
    },
    touchStart(event) {
      if (event.cancelable) event.preventDefault()
      if (!event.touches || event.touches.length !== 1 || this.active) {
        this.$ownerInstance.callMethod('reportIgnored', '检测到多指或手掌触摸，本次不生成笔画。')
        return
      }
      const touch = event.changedTouches[0]
      this.begin(touch, touch.identifier)
    },
    touchMove(event) {
      if (event.cancelable) event.preventDefault()
      if (!this.active) return
      const touch = Array.from(event.touches || []).find(item => item.identifier === this.active.identifier)
      if (touch) this.move(touch, touch.identifier)
    },
    touchEnd(event) {
      if (event.cancelable) event.preventDefault()
      if (!this.active) return
      const touch = Array.from(event.changedTouches || []).find(item => item.identifier === this.active.identifier)
      if (touch) this.finish(touch.identifier)
    },
    touchCancel() {
      this.active = null
      this.redraw()
      this.$ownerInstance.callMethod('reportIgnored', '书写被系统中断，未完成笔画已丢弃。')
    },
    mouseStart(event) { if (event.button === 0) this.begin(event, 'mouse') },
    mouseMove(event) { if (this.active && this.active.identifier === 'mouse') this.move(event, 'mouse') },
    mouseEnd() { this.finish('mouse') },
    mouseCancel() { if (this.active && this.active.identifier === 'mouse') this.touchCancel() },
  },
}
</script>

<style scoped>
.trace-surface{position:relative;width:min(100%,560px);aspect-ratio:1;margin:0 auto;border:3px solid #a98bea;border-radius:24px;overflow:hidden;background:#fffdf8;box-shadow:inset 0 0 0 8px #f4efff}
.trace-canvas{display:block;width:100%;height:100%;touch-action:none;cursor:crosshair}
@media(max-width:600px){.trace-surface{border-radius:18px;box-shadow:inset 0 0 0 5px #f4efff}}
</style>
