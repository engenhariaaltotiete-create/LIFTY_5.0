export type ExerciseKind = 'resistance' | 'bodyweight' | 'timed' | 'cardio_distance' | 'cardio_time'
export type GoalPeriod = 'week' | 'month' | 'year'
export type CardioMetric = 'distance' | 'time'
export type SessionStatus = 'in_progress' | 'completed' | 'cancelled'
export type IntervalMode = 'tabata' | 'emom' | 'amrap' | 'custom'
export type BlockModel = 'resistance' | 'cardio' | 'interval'
export type ReadyWorkoutModality = 'resistance' | 'functional' | 'cross_training' | 'hiit' | 'hybrid'

export interface ExerciseDefinition {
  id?: number
  name: string
  kind: ExerciseKind
  primaryMuscle?: string
  secondaryMuscles?: string[]
  equipment?: string
  loadUnit?: 'kg' | 'none'
  system: boolean
  archived?: boolean
}

export interface WorkoutExercise {
  id: string
  exerciseId: number
  exerciseName: string
  kind: ExerciseKind
  sets?: number
  repsMin?: number
  repsMax?: number
  targetSeconds?: number
  targetMinutes?: number
  targetDistanceKm?: number
  workSeconds?: number
  restSeconds?: number
  targetReps?: number
  notes?: string
  order: number
}

export interface WorkoutBlock {
  id: string
  name: string
  model: BlockModel
  order: number
  exercises: WorkoutExercise[]
  intervalMode?: IntervalMode
  rounds?: number
  roundRestSeconds?: number
  totalMinutes?: number
  countdownSeconds?: number
}

export interface WorkoutTemplate {
  id?: number
  formatVersion?: number
  name: string
  description?: string
  blocks: WorkoutBlock[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface ResistanceSetResult {
  setNumber: number
  loadKg?: number
  reps?: number
  seconds?: number
}

export interface ExerciseResult {
  workoutExerciseId: string
  blockId: string
  blockName: string
  blockModel: BlockModel
  exerciseId: number
  exerciseName: string
  kind: ExerciseKind
  sets?: ResistanceSetResult[]
  loadKg?: number
  minutes?: number
  distanceKm?: number
  workSeconds?: number
  restSeconds?: number
  completedRounds?: number
  notes?: string
}

export interface WorkoutSession {
  id?: number
  templateId: number
  templateName: string
  startedAt: string
  completedAt?: string
  cancelledAt?: string
  status: SessionStatus
  results: ExerciseResult[]
  elapsedSeconds?: number
  notes?: string
  templateSnapshot: WorkoutTemplate
}

// Tipos legados mantidos apenas para migração/backup de versões anteriores.
export interface IntervalExercise { id:string; exerciseId:number; exerciseName:string; kind:ExerciseKind; targetReps?:number; order:number }
export interface IntervalWorkoutTemplate { id?:number; name:string; mode:IntervalMode; exercises:IntervalExercise[]; workSeconds:number; restSeconds:number; rounds:number; totalMinutes?:number; countdownSeconds:number; createdAt:string; updatedAt:string }
export interface IntervalWorkoutSession { id?:number; templateId:number; templateName:string; mode:IntervalMode; startedAt:string; completedAt?:string; cancelledAt?:string; status:SessionStatus; completedRounds:number; elapsedSeconds:number; templateSnapshot:IntervalWorkoutTemplate }

export interface ReadyWorkoutTemplate {
  id?: number
  name: string
  modality: ReadyWorkoutModality
  durationMinutes: 30 | 45 | 60
  source: 'system' | 'personal'
  workoutTemplate: Omit<WorkoutTemplate, 'id'>
  createdAt: string
  updatedAt: string
}

export interface ProfileRecord {
  id?: number
  name: string
  heightCm?: number
  sex?: 'male' | 'female' | 'other' | ''
  age?: number
  profilePhoto?: Blob
  date: string
}

export interface BodyMeasurement {
  id?: number
  date: string
  weightKg?: number
  neckCm?: number
  waistCm?: number
  hipCm?: number
  bodyFatPct?: number
  bodyFatSource?: 'us_navy' | 'manual'
  photos?: Blob[]
  notes?: string
}

export interface BodyGoal { id?:number; startDate:string; targetDate:string; startWeightKg?:number; targetWeightKg?:number; startBodyFatPct?:number; targetBodyFatPct?:number; active:boolean; createdAt:string }
export interface CardioGoal { id:string; activityId?:number; activity:string; metric:CardioMetric; period:GoalPeriod; target:number }
export interface AppSettings { id:'main'; weeklyWorkoutGoal:number; monthlyWorkoutGoal?:number; yearlyWorkoutGoal?:number; cardioGoals?:CardioGoal[]; theme:'light'|'dark'|'system'; intervalSounds?:boolean }
