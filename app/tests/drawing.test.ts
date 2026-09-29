import assert from 'node:assert/strict'
import test from 'node:test'
import { appendStroke, createEmptyDraft, createStroke, parseDraft } from '../src/features/drawing/model.js'

test('一笔结束后归一化保存，过密点合并且坐标限制在画布范围', () => {
  const stroke = createStroke([
    { x: -0.2, y: 0.1, t: 0 },
    { x: 0.0002, y: 0.1001, t: 1 },
    { x: 1.2, y: 0.9, t: 20 },
  ], 0, 100, 120)
  assert.ok(stroke)
  assert.equal(stroke.points[0]?.x, 0)
  assert.equal(stroke.points.at(-1)?.x, 1)
  assert.equal(stroke.points.length, 2)
})

test('零长度、单点、倒序时间和全非法点不生成笔画', () => {
  assert.equal(createStroke([{ x: 0.2, y: 0.2, t: 0 }], 0, 1, 2), null)
  assert.equal(createStroke([{ x: 0.2, y: 0.2, t: 0 }, { x: 0.2, y: 0.2, t: 2 }], 0, 1, 3), null)
  assert.equal(createStroke([{ x: 0.1, y: 0.1, t: 0 }, { x: 0.4, y: 0.4, t: 2 }], 0, 3, 2), null)
  assert.equal(createStroke([{ x: '坏数据' }, null], 0, 1, 2), null)
})

test('损坏、旧版本和其他字模草稿拒绝恢复', () => {
  assert.equal(parseDraft(null), null)
  assert.equal(parseDraft({ ...createEmptyDraft(), schemaVersion: 2 }), null)
  assert.equal(parseDraft({ ...createEmptyDraft(), character: '水' }), null)
  assert.equal(parseDraft({ ...createEmptyDraft(), strokes: [{ index: 0, points: [] }] }), null)
})

test('笔画序号必须连续，重复或跳号不会改变草稿', () => {
  const draft = createEmptyDraft(1)
  const stroke = createStroke([{ x: 0.1, y: 0.1, t: 0 }, { x: 0.5, y: 0.5, t: 10 }], 1, 10, 20)
  assert.ok(stroke)
  assert.equal(appendStroke(draft, stroke), draft)
})

test('有效草稿可恢复并保留字模元数据', () => {
  const empty = createEmptyDraft(1)
  const stroke = createStroke([{ x: 0.1, y: 0.1, t: 0 }, { x: 0.6, y: 0.6, t: 8 }], 0, 10, 20)
  assert.ok(stroke)
  const saved = appendStroke(empty, stroke, 30)
  assert.deepEqual(parseDraft(saved), saved)
})
