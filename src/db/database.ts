import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, BodyGoal, BodyMeasurement, ExerciseDefinition, IntervalWorkoutSession, IntervalWorkoutTemplate, ProfileRecord, ReadyWorkoutTemplate, WorkoutSession, WorkoutTemplate } from '../types'

export class TrainingDatabase extends Dexie {
  exercises!: EntityTable<ExerciseDefinition, 'id'>
  workouts!: EntityTable<WorkoutTemplate, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  intervalWorkouts!: EntityTable<IntervalWorkoutTemplate, 'id'>
  intervalSessions!: EntityTable<IntervalWorkoutSession, 'id'>
  readyWorkouts!: EntityTable<ReadyWorkoutTemplate, 'id'>
  profile!: EntityTable<ProfileRecord, 'id'>
  measurements!: EntityTable<BodyMeasurement, 'id'>
  goals!: EntityTable<BodyGoal, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('MeuTreinoDB')
    this.version(1).stores({ exercises:'++id, name, kind, primaryMuscle, system, archived', workouts:'++id, name, archived, createdAt, updatedAt', sessions:'++id, templateId, status, startedAt, completedAt', profile:'++id, date', measurements:'++id, date', goals:'++id, startDate, targetDate, active, createdAt', settings:'id' })
    this.version(2).stores({ exercises:'++id, name, kind, primaryMuscle, system, archived', workouts:'++id, name, archived, createdAt, updatedAt', sessions:'++id, templateId, status, startedAt, completedAt', profile:'++id, date', measurements:'++id, date', goals:'++id, startDate, targetDate, active, createdAt', settings:'id' })
    this.version(3).stores({ exercises:'++id, name, kind, primaryMuscle, system, archived', workouts:'++id, name, archived, createdAt, updatedAt', sessions:'++id, templateId, status, startedAt, completedAt, cancelledAt', intervalWorkouts:'++id, name, mode, createdAt, updatedAt', intervalSessions:'++id, templateId, status, mode, startedAt, completedAt, cancelledAt', readyWorkouts:'++id, name, modality, durationMinutes, source, createdAt, updatedAt', profile:'++id, date', measurements:'++id, date', goals:'++id, startDate, targetDate, active, createdAt', settings:'id' })
    this.version(4).stores({ exercises:'++id, name, kind, primaryMuscle, system, archived', workouts:'++id, name, archived, createdAt, updatedAt', sessions:'++id, templateId, status, startedAt, completedAt, cancelledAt', intervalWorkouts:'++id, name, mode, createdAt, updatedAt', intervalSessions:'++id, templateId, status, mode, startedAt, completedAt, cancelledAt', readyWorkouts:'++id, name, modality, durationMinutes, source, createdAt, updatedAt', profile:'++id, date', measurements:'++id, date', goals:'++id, startDate, targetDate, active, createdAt', settings:'id' }).upgrade(async tx => {
      const hybridFromStandard=(old:any)=>({ ...old, formatVersion:4, blocks:Array.isArray(old.blocks)?old.blocks:[{ id:crypto.randomUUID(), name:'Treino principal', model:'resistance', order:0, exercises:(old.exercises||[]).map((x:any,i:number)=>({...x,order:i})) }] })
      const hybridFromInterval=(old:any)=>({ name:old.name, formatVersion:4, archived:false, createdAt:old.createdAt, updatedAt:old.updatedAt, blocks:[{ id:crypto.randomUUID(), name:'Intervalado', model:'interval', order:0, intervalMode:old.mode, rounds:old.rounds, roundRestSeconds:old.restSeconds, totalMinutes:old.totalMinutes, countdownSeconds:old.countdownSeconds??3, exercises:(old.exercises||[]).map((x:any,i:number)=>({...x,workSeconds:old.workSeconds,restSeconds:i===(old.exercises.length-1)?0:old.restSeconds,order:i})) }] })
      const workouts=await tx.table('workouts').toArray()
      for(const old of workouts)if(!Array.isArray(old.blocks))await tx.table('workouts').put(hybridFromStandard(old))
      const sessions=await tx.table('sessions').toArray()
      for(const old of sessions){if(Array.isArray(old.templateSnapshot?.blocks))continue;const snap=hybridFromStandard(old.templateSnapshot||{name:old.templateName,exercises:[]});const block=snap.blocks[0];await tx.table('sessions').put({...old,templateSnapshot:snap,results:(old.results||[]).map((r:any)=>({...r,blockId:block.id,blockName:block.name,blockModel:'resistance'}))})}
      const intervalMap=new Map<number,number>()
      const legacyIntervals=await tx.table('intervalWorkouts').toArray()
      for(const old of legacyIntervals){const hybrid=hybridFromInterval(old);const newId=await tx.table('workouts').add(hybrid);if(old.id!=null)intervalMap.set(old.id,newId)}
      const legacySessions=await tx.table('intervalSessions').toArray()
      for(const old of legacySessions){const snap=hybridFromInterval(old.templateSnapshot||old),block=snap.blocks[0];await tx.table('sessions').add({templateId:intervalMap.get(old.templateId)||old.templateId,templateName:old.templateName,startedAt:old.startedAt,completedAt:old.completedAt,cancelledAt:old.cancelledAt,status:old.status,elapsedSeconds:old.elapsedSeconds,templateSnapshot:snap,results:block.exercises.map((x:any)=>({workoutExerciseId:x.id,blockId:block.id,blockName:block.name,blockModel:'interval',exerciseId:x.exerciseId,exerciseName:x.exerciseName,kind:x.kind,workSeconds:x.workSeconds,restSeconds:x.restSeconds,completedRounds:old.completedRounds||0}))})}
      const ready=await tx.table('readyWorkouts').toArray()
      for(const old of ready){if(old.workoutTemplate?.blocks)continue;let wt:any;if(old.standardTemplate)wt=hybridFromStandard(old.standardTemplate);else if(old.intervalTemplate)wt=hybridFromInterval(old.intervalTemplate);if(wt)await tx.table('readyWorkouts').put({...old,workoutTemplate:wt,standardTemplate:undefined,intervalTemplate:undefined})}
      const settings=await tx.table('settings').get('main');if(settings)await tx.table('settings').put({...settings,intervalSounds:settings.intervalSounds??true})
    })
  }
}
export const db = new TrainingDatabase()
