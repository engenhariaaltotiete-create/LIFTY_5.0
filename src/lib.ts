import { db } from './db/database'
import type { AppSettings, BodyGoal, BodyMeasurement, ExerciseDefinition, ExerciseResult, IntervalWorkoutSession, IntervalWorkoutTemplate, ProfileRecord, ReadyWorkoutTemplate, WorkoutSession, WorkoutTemplate } from './types'

export const uid = () => crypto.randomUUID()
export const localDate = (iso:string) => new Date(iso).toLocaleDateString('sv-SE')
export const startOfWeek = (d=new Date()) => { const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x }
export const inSameMonth=(iso:string,d=new Date())=>{const x=new Date(iso);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()}
export const inSameYear=(iso:string,d=new Date())=>new Date(iso).getFullYear()===d.getFullYear()
export const periodStart=(period:'week'|'month'|'year',now=new Date())=>{const d=new Date(now);d.setHours(0,0,0,0);if(period==='week')return startOfWeek(d);if(period==='month'){d.setDate(1);return d}d.setMonth(0,1);return d}

export async function lastExerciseResult(exerciseId:number,beforeId?:number):Promise<ExerciseResult|undefined>{
 const sessions=(await db.sessions.where('status').equals('completed').toArray()).sort((a,b)=>(b.completedAt||b.startedAt).localeCompare(a.completedAt||a.startedAt))
 for(const s of sessions){if(beforeId&&s.id===beforeId)continue;const found=s.results.find(r=>r.exerciseId===exerciseId);if(found)return structuredClone(found)}
}
export function cardioProgress(goal:NonNullable<AppSettings['cardioGoals']>[number],sessions:WorkoutSession[]){
 const start=periodStart(goal.period)
 return sessions.filter(s=>s.status==='completed'&&new Date(s.completedAt||s.startedAt)>=start).flatMap(s=>s.results)
  .filter(r=>goal.activityId?r.exerciseId===goal.activityId:r.exerciseName.toLowerCase()===goal.activity.toLowerCase())
  .reduce((a,r)=>a+(goal.metric==='distance'?(r.distanceKm||0):(r.minutes||0)),0)
}

export function navyBodyFatPct(sex:ProfileRecord['sex'],heightCm?:number,neckCm?:number,waistCm?:number,hipCm?:number){
 if(!heightCm||!neckCm||!waistCm||heightCm<=0||neckCm<=0||waistCm<=0)return undefined
 let density:number|undefined
 if(sex==='male'&&waistCm>neckCm)density=1.0324-0.19077*Math.log10(waistCm-neckCm)+0.15456*Math.log10(heightCm)
 if(sex==='female'&&hipCm&&waistCm+hipCm>neckCm)density=1.29579-0.35004*Math.log10(waistCm+hipCm-neckCm)+0.22100*Math.log10(heightCm)
 if(!density||density<=0)return undefined
 const pct=495/density-450
 return Number.isFinite(pct)&&pct>0&&pct<75?Math.round(pct*10)/10:undefined
}

const blobToDataURL=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob)})
const dataURLToBlob=async(data:string)=>(await fetch(data)).blob()
async function encodeBlobs(v:unknown):Promise<unknown>{if(v instanceof Blob)return{__blob:true,data:await blobToDataURL(v)};if(Array.isArray(v))return Promise.all(v.map(encodeBlobs));if(v&&typeof v==='object'){const o:Record<string,unknown>={};for(const[k,x]of Object.entries(v))o[k]=await encodeBlobs(x);return o}return v}
async function decodeBlobs(v:unknown):Promise<unknown>{if(Array.isArray(v))return Promise.all(v.map(decodeBlobs));if(v&&typeof v==='object'){const x=v as Record<string,unknown>;if(x.__blob===true&&typeof x.data==='string')return dataURLToBlob(x.data);const o:Record<string,unknown>={};for(const[k,y]of Object.entries(x))o[k]=await decodeBlobs(y);return o}return v}
export async function compressImage(blob:Blob,maxPx=1280,quality=.82):Promise<Blob>{try{const b=await createImageBitmap(blob);const s=Math.min(1,maxPx/Math.max(b.width,b.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));const ctx=c.getContext('2d');if(!ctx){b.close();return blob}ctx.drawImage(b,0,0,c.width,c.height);b.close();return await new Promise<Blob>(r=>c.toBlob(x=>r(x||blob),'image/jpeg',quality))}catch{return blob}}

function downloadJson(data:unknown,name:string){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}

const cleanText=(v:string)=>v
 .replace(/^\uFEFF/,'')
 .replace(/\u00A0/g,' ')
 .replace(/\r/g,'')
 .replace(/^\s*```(?:text|txt)?\s*$/gim,'')
 .trim()
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
const safeLine=(v:unknown)=>String(v??'').replace(/\r?\n/g,' ').trim()
const validKinds=['resistance','bodyweight','timed','cardio_distance','cardio_time'] as const
const workoutHeader=/^\s*===\s*LIFTY\s+WORKOUT\s*===\s*$/i
const workoutEnd=/^\s*===\s*END\s+LIFTY\s+WORKOUT\s*===\s*$/i

export function workoutToLiftyText(workout:WorkoutTemplate){
 const out:string[]=['=== LIFTY WORKOUT ===','VERSION: 1',`NAME: ${safeLine(workout.name)}`]
 if(workout.description)out.push(`DESCRIPTION: ${safeLine(workout.description)}`)
 for(const b of [...workout.blocks].sort((a,c)=>a.order-c.order)){
  out.push('','[BLOCK]',`NAME: ${safeLine(b.name)}`,`MODEL: ${b.model}`)
  if(b.model==='interval'){
   out.push(`INTERVAL_MODE: ${b.intervalMode||'custom'}`,`ROUNDS: ${b.rounds||1}`,`ROUND_REST_SECONDS: ${b.roundRestSeconds||0}`,`COUNTDOWN_SECONDS: ${b.countdownSeconds??3}`)
   if(b.totalMinutes!=null)out.push(`TOTAL_MINUTES: ${b.totalMinutes}`)
  }
  for(const e of [...b.exercises].sort((a,c)=>a.order-c.order)){
   out.push('','[EXERCISE]',`NAME: ${safeLine(e.exerciseName)}`,`KIND: ${e.kind}`)
   if(e.sets!=null)out.push(`SETS: ${e.sets}`)
   if(e.repsMin!=null)out.push(`REPS_MIN: ${e.repsMin}`)
   if(e.repsMax!=null)out.push(`REPS_MAX: ${e.repsMax}`)
   if(e.targetSeconds!=null)out.push(`TARGET_SECONDS: ${e.targetSeconds}`)
   if(e.targetMinutes!=null)out.push(`TARGET_MINUTES: ${e.targetMinutes}`)
   if(e.targetDistanceKm!=null)out.push(`TARGET_DISTANCE_KM: ${e.targetDistanceKm}`)
   if(e.workSeconds!=null)out.push(`WORK_SECONDS: ${e.workSeconds}`)
   if(e.restSeconds!=null)out.push(`REST_SECONDS: ${e.restSeconds}`)
   if(e.targetReps!=null)out.push(`TARGET_REPS: ${e.targetReps}`)
   if(e.notes)out.push(`NOTES: ${safeLine(e.notes)}`)
  }
 }
 out.push('','=== END LIFTY WORKOUT ===')
 return out.join('\n')
}

type TextSection={type:'root'|'block'|'exercise';values:Record<string,string>}
type ParsedWorkout=ReturnType<typeof parseOneWorkoutText>

function extractWorkoutTexts(text:string){
 const lines=cleanText(text).split('\n')
 const parts:string[]=[]
 let current:string[]|null=null

 for(const raw of lines){
  const line=raw.trim()
  if(workoutHeader.test(line)){
   if(current?.length)parts.push(current.join('\n'))
   current=['=== LIFTY WORKOUT ===']
   continue
  }
  if(!current)continue
  if(workoutEnd.test(line)){
   current.push('=== END LIFTY WORKOUT ===')
   parts.push(current.join('\n'))
   current=null
   continue
  }
  current.push(raw)
 }
 if(current?.length)parts.push(current.join('\n'))
 return parts
}

function parseOneWorkoutText(text:string){
 const lines=cleanText(text).split('\n').map(x=>x.trim()).filter(Boolean)
 if(!lines.length||!workoutHeader.test(lines[0]))throw new Error('Texto LIFTY inválido: cabeçalho não encontrado.')
 const sections:TextSection[]=[{type:'root',values:{}}];let current=sections[0]
 for(const line of lines.slice(1)){
  if(workoutEnd.test(line))break
  if(/^\s*BLOCK\s*$/i.test(line)){current={type:'block',values:{}};sections.push(current);continue}
  if(/^\s*EXERCISE\s*$/i.test(line)){current={type:'exercise',values:{}};sections.push(current);continue}
  const i=line.indexOf(':');if(i<1)continue
  current.values[line.slice(0,i).trim().toUpperCase()]=line.slice(i+1).trim()
 }
 const root=sections[0].values
 if(root.VERSION!=='1')throw new Error('Versão do texto LIFTY incompatível.')
 if(!root.NAME)throw new Error('Treino sem nome.')
 const parsedBlocks:{values:Record<string,string>;exercises:Record<string,string>[]}[]=[]
 let b:null|{values:Record<string,string>;exercises:Record<string,string>[]} = null
 for(const sec of sections.slice(1)){
  if(sec.type==='block'){b={values:sec.values,exercises:[]};parsedBlocks.push(b)}
  else if(sec.type==='exercise'){if(!b)throw new Error('Exercício encontrado antes de um bloco.');b.exercises.push(sec.values)}
 }
 if(!parsedBlocks.length)throw new Error('Treino sem blocos.')
 return {root,blocks:parsedBlocks}
}

function parseNumber(value:string|undefined,field:string,workoutName:string){
 if(value===undefined||value==='')return undefined
 const n=Number(value.replace(',','.'))
 if(!Number.isFinite(n))throw new Error(`Campo ${field} inválido no treino "${workoutName}".`)
 return n
}

function validateParsedWorkout(parsed:ParsedWorkout,index:number){
 const workoutName=parsed.root.NAME||`Treino ${index+1}`
 for(const pb of parsed.blocks){
  const model=pb.values.MODEL
  if(!['resistance','cardio','interval'].includes(model))throw new Error(`Modelo de bloco inválido no treino "${workoutName}": ${model||'(vazio)'}.`)
  if(!pb.values.NAME)throw new Error(`Bloco sem nome no treino "${workoutName}".`)
  if(!pb.exercises.length)throw new Error(`O bloco "${pb.values.NAME}" do treino "${workoutName}" não possui exercícios.`)
  for(const pe of pb.exercises){
   if(!pe.NAME)throw new Error(`Exercício sem nome no bloco "${pb.values.NAME}" do treino "${workoutName}".`)
   for(const field of ['SETS','REPS_MIN','REPS_MAX','TARGET_SECONDS','TARGET_MINUTES','TARGET_DISTANCE_KM','WORK_SECONDS','REST_SECONDS','TARGET_REPS'])parseNumber(pe[field],field,workoutName)
  }
  for(const field of ['ROUNDS','ROUND_REST_SECONDS','TOTAL_MINUTES','COUNTDOWN_SECONDS'])parseNumber(pb.values[field],field,workoutName)
 }
}

export async function importLiftyText(text:string){
 const parts=extractWorkoutTexts(text)
 if(!parts.length)throw new Error('Nenhum treino LIFTY encontrado no texto. Verifique se cada treino começa com === LIFTY WORKOUT ===.')

 const parsedWorkouts=parts.map((part,index)=>{
  try{
   const parsed=parseOneWorkoutText(part)
   validateParsedWorkout(parsed,index)
   return parsed
  }catch(error){
   const message=error instanceof Error?error.message:'Erro desconhecido.'
   throw new Error(`Falha no treino ${index+1}: ${message}`)
  }
 })

 const ids:number[]=[]
 await db.transaction('rw',[db.exercises,db.workouts],async()=>{
  const library=await db.exercises.toArray()
  for(const parsed of parsedWorkouts){
   const now=new Date().toISOString()
   const blocks=[] as WorkoutTemplate['blocks']
   for(let bi=0;bi<parsed.blocks.length;bi++){
    const pb=parsed.blocks[bi]
    const model=pb.values.MODEL as WorkoutTemplate['blocks'][number]['model']
    const exercises=[] as WorkoutTemplate['blocks'][number]['exercises']
    for(let ei=0;ei<pb.exercises.length;ei++){
     const pe=pb.exercises[ei]
     let kind=(pe.KIND||(model==='resistance'?'resistance':model==='cardio'?'cardio_time':'bodyweight')) as ExerciseDefinition['kind']
     if(!validKinds.includes(kind as typeof validKinds[number]))kind=model==='resistance'?'resistance':model==='cardio'?'cardio_time':'bodyweight'
     let def=library.find(x=>norm(x.name)===norm(pe.NAME)&&!x.archived)
     if(!def){
      const exerciseId=await db.exercises.add({name:pe.NAME,kind,system:false,loadUnit:kind==='resistance'?'kg':'none'})
      if(exerciseId===undefined)throw new Error(`Não foi possível criar o exercício "${pe.NAME}".`)
      def={id:exerciseId,name:pe.NAME,kind,system:false,loadUnit:kind==='resistance'?'kg':'none'}
      library.push(def)
     }
     const n=(k:string)=>parseNumber(pe[k],k,parsed.root.NAME)
     exercises.push({id:uid(),exerciseId:def.id!,exerciseName:def.name,kind:def.kind,order:ei,sets:n('SETS'),repsMin:n('REPS_MIN'),repsMax:n('REPS_MAX'),targetSeconds:n('TARGET_SECONDS'),targetMinutes:n('TARGET_MINUTES'),targetDistanceKm:n('TARGET_DISTANCE_KM'),workSeconds:n('WORK_SECONDS'),restSeconds:n('REST_SECONDS'),targetReps:n('TARGET_REPS'),notes:pe.NOTES})
    }
    const n=(k:string)=>parseNumber(pb.values[k],k,parsed.root.NAME)
    blocks.push({id:uid(),name:pb.values.NAME,model,order:bi,exercises,intervalMode:model==='interval'?(pb.values.INTERVAL_MODE||'custom') as WorkoutTemplate['blocks'][number]['intervalMode']:undefined,rounds:model==='interval'?n('ROUNDS')||1:undefined,roundRestSeconds:model==='interval'?n('ROUND_REST_SECONDS')||0:undefined,totalMinutes:model==='interval'?n('TOTAL_MINUTES'):undefined,countdownSeconds:model==='interval'?n('COUNTDOWN_SECONDS')??3:undefined})
   }
   const id=await db.workouts.add({name:parsed.root.NAME,description:parsed.root.DESCRIPTION,formatVersion:4,blocks,archived:false,createdAt:now,updatedAt:now})
   if(id===undefined)throw new Error(`Não foi possível criar o treino "${parsed.root.NAME}".`)
   ids.push(id)
  }
 })
 return ids
}

export async function exportBackup(){
 const payload={
  app:'LIFTY',
  version:4,
  exportedAt:new Date().toISOString(),
  exercises:await db.exercises.toArray(),
  workouts:await db.workouts.toArray(),
  sessions:await db.sessions.toArray(),
  readyWorkouts:await db.readyWorkouts.toArray(),
  profile:await db.profile.toArray(),
  measurements:await db.measurements.toArray(),
  goals:await db.goals.toArray(),
  settings:await db.settings.toArray(),
  legacyIntervalWorkouts:await db.intervalWorkouts.toArray(),
  legacyIntervalSessions:await db.intervalSessions.toArray()
 }

 downloadJson(
  await encodeBlobs(payload),
  `lifty-backup-${localDate(new Date().toISOString())}.json`
 )
}

export async function importBackup(file:File){
 const raw=JSON.parse(await file.text())

 if(raw.app!=='LIFTY'){
  throw new Error('Arquivo de backup inválido.')
 }

 const d=await decodeBlobs(raw) as Record<string,unknown[]>

 await db.transaction(
  'rw',
  [
   db.exercises,
   db.workouts,
   db.sessions,
   db.intervalWorkouts,
   db.intervalSessions,
   db.readyWorkouts,
   db.profile,
   db.measurements,
   db.goals,
   db.settings
  ],
  async()=>{
   await Promise.all([
    db.exercises.clear(),
    db.workouts.clear(),
    db.sessions.clear(),
    db.intervalWorkouts.clear(),
    db.intervalSessions.clear(),
    db.readyWorkouts.clear(),
    db.profile.clear(),
    db.measurements.clear(),
    db.goals.clear(),
    db.settings.clear()
   ])

   if(d.exercises?.length)await db.exercises.bulkPut(d.exercises as ExerciseDefinition[])
   if(d.workouts?.length)await db.workouts.bulkPut(d.workouts as WorkoutTemplate[])
   if(d.sessions?.length)await db.sessions.bulkPut(d.sessions as WorkoutSession[])
   if(d.readyWorkouts?.length)await db.readyWorkouts.bulkPut(d.readyWorkouts as ReadyWorkoutTemplate[])
   if(d.profile?.length)await db.profile.bulkPut(d.profile as ProfileRecord[])
   if(d.measurements?.length)await db.measurements.bulkPut(d.measurements as BodyMeasurement[])
   if(d.goals?.length)await db.goals.bulkPut(d.goals as BodyGoal[])
   if(d.settings?.length)await db.settings.bulkPut(d.settings as AppSettings[])
   if(d.legacyIntervalWorkouts?.length)await db.intervalWorkouts.bulkPut(d.legacyIntervalWorkouts as IntervalWorkoutTemplate[])
   if(d.legacyIntervalSessions?.length)await db.intervalSessions.bulkPut(d.legacyIntervalSessions as IntervalWorkoutSession[])
  }
 )
}
