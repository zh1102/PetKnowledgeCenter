export interface NormalizedPoint {
  x: number
  y: number
  t: number
}

export interface TraceStroke {
  index: number
  startedAt: number
  endedAt: number
  points: NormalizedPoint[]
}

export interface TraceDraft {
  schemaVersion: 1
  templateId: string
  templateVersion: string
  character: string
  aspectRatio: 1
  strokes: TraceStroke[]
  updatedAt: number
}

const MAX_POINTS_PER_STROKE = 2048
const MIN_POINT_DISTANCE = 0.002

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * 只在一笔结束时执行归一化和降采样，避免把每个触摸点写入 Vue 响应式状态。
 * 过密点会被合并，但始终保留起点与终点，极快划线仍能形成连续线段。
 */
export function createStroke(rawPoints: unknown, index: number, startedAt: number, endedAt: number): TraceStroke | null {
  if (!Array.isArray(rawPoints) || rawPoints.length < 2 || !Number.isInteger(index) || index < 0) return null
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(endedAt) || endedAt < startedAt) return null

  const valid: NormalizedPoint[] = []
  for (const candidate of rawPoints.slice(0, MAX_POINTS_PER_STROKE)) {
    if (!isRecord(candidate) || !isFiniteNumber(candidate.x) || !isFiniteNumber(candidate.y) || !isFiniteNumber(candidate.t)) continue
    valid.push({ x: clampUnit(candidate.x), y: clampUnit(candidate.y), t: Math.max(0, candidate.t) })
  }
  if (valid.length < 2) return null

  const simplified: NormalizedPoint[] = [valid[0]!]
  for (let pointIndex = 1; pointIndex < valid.length - 1; pointIndex += 1) {
    const point = valid[pointIndex]!
    const previous = simplified[simplified.length - 1]!
    if (Math.hypot(point.x - previous.x, point.y - previous.y) >= MIN_POINT_DISTANCE) simplified.push(point)
  }
  const last = valid[valid.length - 1]!
  const previous = simplified[simplified.length - 1]!
  if (Math.hypot(last.x - previous.x, last.y - previous.y) < MIN_POINT_DISTANCE) return null
  simplified.push(last)

  return { index, startedAt, endedAt, points: simplified }
}

export function createEmptyDraft(now = Date.now()): TraceDraft {
  return {
    schemaVersion: 1,
    templateId: 'hanzi-yong-trace',
    templateVersion: '1.0.0',
    character: '永',
    aspectRatio: 1,
    strokes: [],
    updatedAt: now,
  }
}

/**
 * 草稿只接受当前字模和结构版本，损坏或其他题目的缓存直接回退为空草稿，避免串题。
 */
export function parseDraft(value: unknown): TraceDraft | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.templateId !== 'hanzi-yong-trace') return null
  if (value.templateVersion !== '1.0.0' || value.character !== '永' || value.aspectRatio !== 1) return null
  if (!Array.isArray(value.strokes) || !isFiniteNumber(value.updatedAt)) return null

  const strokes: TraceStroke[] = []
  for (const candidate of value.strokes) {
    if (!isRecord(candidate) || !Number.isInteger(candidate.index) || !isFiniteNumber(candidate.startedAt) || !isFiniteNumber(candidate.endedAt)) return null
    const stroke = createStroke(candidate.points, Number(candidate.index), candidate.startedAt, candidate.endedAt)
    if (!stroke || stroke.index !== strokes.length) return null
    strokes.push(stroke)
  }
  return { ...createEmptyDraft(value.updatedAt), strokes }
}

export function appendStroke(draft: TraceDraft, stroke: TraceStroke, now = Date.now()): TraceDraft {
  if (stroke.index !== draft.strokes.length) return draft
  return { ...draft, strokes: [...draft.strokes, stroke], updatedAt: now }
}
