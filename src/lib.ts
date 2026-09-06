import { db } from './db/database'
import type {
  AppSettings,
  BodyGoal,
  BodyMeasurement,
  ExerciseDefinition,
  ExerciseResult,
  IntervalWorkoutSession,
  IntervalWorkoutTemplate,
  ProfileRecord,
  ReadyWorkoutTemplate,
  WorkoutSession,
  WorkoutTemplate
} from './types'

export const uid = () => crypto.randomUUID()

export const localDate = (iso: string) =>
  new Date(iso).toLocaleDateString('sv-SE')

export const startOfWeek = (d = new Date()) => {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7

  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)

  return x
}

export const inSameMonth = (
  iso: string,
  d = new Date()
) => {
  const x = new Date(iso)

  return (
    x.getFullYear() === d.getFullYear() &&
    x.getMonth() === d.getMonth()
  )
}

export const inSameYear = (
  iso: string,
  d = new Date()
) =>
  new Date(iso).getFullYear() ===
  d.getFullYear()

export const periodStart = (
  period: 'week' | 'month' | 'year',
  now = new Date()
) => {
  const d = new Date(now)

  d.setHours(0, 0, 0, 0)

  if (period === 'week') {
    return startOfWeek(d)
  }

  if (period === 'month') {
    d.setDate(1)
    return d
  }

  d.setMonth(0, 1)

  return d
}

export async function lastExerciseResult(
  exerciseId: number,
  beforeId?: number
): Promise<ExerciseResult | undefined> {
  const sessions = (
    await db.sessions
      .where('status')
      .equals('completed')
      .toArray()
  ).sort((a, b) =>
    (b.completedAt || b.startedAt)
      .localeCompare(
        a.completedAt || a.startedAt
      )
  )

  for (const s of sessions) {
    if (
      beforeId &&
      s.id === beforeId
    ) {
      continue
    }

    const found = s.results.find(
      r =>
        r.exerciseId === exerciseId
    )

    if (found) {
      return structuredClone(found)
    }
  }
}

export function cardioProgress(
  goal:
    NonNullable<
      AppSettings['cardioGoals']
    >[number],
  sessions: WorkoutSession[]
) {
  const start =
    periodStart(goal.period)

  return sessions
    .filter(
      s =>
        s.status === 'completed' &&
        new Date(
          s.completedAt ||
            s.startedAt
        ) >= start
    )
    .flatMap(s => s.results)
    .filter(r =>
      goal.activityId
        ? r.exerciseId ===
          goal.activityId
        : r.exerciseName.toLowerCase() ===
          goal.activity.toLowerCase()
    )
    .reduce(
      (a, r) =>
        a +
        (
          goal.metric ===
          'distance'
            ? r.distanceKm || 0
            : r.minutes || 0
        ),
      0
    )
}

export function navyBodyFatPct(
  sex: ProfileRecord['sex'],
  heightCm?: number,
  neckCm?: number,
  waistCm?: number,
  hipCm?: number
) {
  if (
    !heightCm ||
    !neckCm ||
    !waistCm ||
    heightCm <= 0 ||
    neckCm <= 0 ||
    waistCm <= 0
  ) {
    return undefined
  }

  let density:
    number | undefined

  if (
    sex === 'male' &&
    waistCm > neckCm
  ) {
    density =
      1.0324 -
      0.19077 *
        Math.log10(
          waistCm - neckCm
        ) +
      0.15456 *
        Math.log10(heightCm)
  }

  if (
    sex === 'female' &&
    hipCm &&
    waistCm + hipCm >
      neckCm
  ) {
    density =
      1.29579 -
      0.35004 *
        Math.log10(
          waistCm +
            hipCm -
            neckCm
        ) +
      0.221 *
        Math.log10(heightCm)
  }

  if (
    !density ||
    density <= 0
  ) {
    return undefined
  }

  const pct =
    495 / density - 450

  return (
    Number.isFinite(pct) &&
    pct > 0 &&
    pct < 75
  )
    ? Math.round(pct * 10) / 10
    : undefined
}

const blobToDataURL = (
  blob: Blob
) =>
  new Promise<string>(
    (
      resolve,
      reject
    ) => {
      const r =
        new FileReader()

      r.onload = () =>
        resolve(
          String(r.result)
        )

      r.onerror = reject

      r.readAsDataURL(blob)
    }
  )

const dataURLToBlob =
  async (data: string) =>
    (await fetch(data)).blob()

async function encodeBlobs(
  v: unknown
): Promise<unknown> {
  if (v instanceof Blob) {
    return {
      __blob: true,
      data:
        await blobToDataURL(
          v
        )
    }
  }

  if (Array.isArray(v)) {
    return Promise.all(
      v.map(encodeBlobs)
    )
  }

  if (
    v &&
    typeof v === 'object'
  ) {
    const o:
      Record<
        string,
        unknown
      > = {}

    for (
      const [k, x] of
      Object.entries(v)
    ) {
      o[k] =
        await encodeBlobs(x)
    }

    return o
  }

  return v
}

async function decodeBlobs(
  v: unknown
): Promise<unknown> {
  if (Array.isArray(v)) {
    return Promise.all(
      v.map(decodeBlobs)
    )
  }

  if (
    v &&
    typeof v === 'object'
  ) {
    const x =
      v as Record<
        string,
        unknown
      >

    if (
      x.__blob === true &&
      typeof x.data ===
        'string'
    ) {
      return dataURLToBlob(
        x.data
      )
    }

    const o:
      Record<
        string,
        unknown
      > = {}

    for (
      const [k, y] of
      Object.entries(x)
    ) {
      o[k] =
        await decodeBlobs(y)
    }

    return o
  }

  return v
}

export async function compressImage(
  blob: Blob,
  maxPx = 1280,
  quality = 0.82
): Promise<Blob> {
  try {
    const b =
      await createImageBitmap(
        blob
      )

    const s = Math.min(
      1,
      maxPx /
        Math.max(
          b.width,
          b.height
        )
    )

    const c =
      document.createElement(
        'canvas'
      )

    c.width = Math.max(
      1,
      Math.round(
        b.width * s
      )
    )

    c.height = Math.max(
      1,
      Math.round(
        b.height * s
      )
    )

    const ctx =
      c.getContext('2d')

    if (!ctx) {
      b.close()
      return blob
    }

    ctx.drawImage(
      b,
      0,
      0,
      c.width,
      c.height
    )

    b.close()

    return await new Promise<Blob>(
      r =>
        c.toBlob(
          x =>
            r(x || blob),
          'image/jpeg',
          quality
        )
    )
  } catch {
    return blob
  }
}

function downloadJson(
  data: unknown,
  name: string
) {
  const blob = new Blob(
    [
      JSON.stringify(
        data,
        null,
        2
      )
    ],
    {
      type:
        'application/json'
    }
  )

  const url =
    URL.createObjectURL(
      blob
    )

  const a =
    document.createElement(
      'a'
    )

  a.href = url
  a.download = name
 
