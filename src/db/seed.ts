import { db } from './database'
import { defaultExercises } from '../data/exercises'
import { uid } from '../lib'
import type { ExerciseDefinition, ReadyWorkoutTemplate, WorkoutBlock, WorkoutExercise, WorkoutTemplate } from '../types'
const now=()=>new Date().toISOString()
function exItem(e:ExerciseDefinition,order:number,model:WorkoutBlock['model']):WorkoutExercise{return{id:uid(),exerciseId:e.id!,exerciseName:e.name,kind:e.kind,order,sets:model==='resistance'?3:undefined,repsMin:model==='resistance'?10:undefined,repsMax:model==='resistance'?15:undefined,targetMinutes:model==='cardio'?10:undefined,targetDistanceKm:model==='cardio'&&e.kind==='cardio_distance'?2:undefined,workSeconds:model==='interval'?30:undefined,restSeconds:model==='interval'?15:undefined}}
export async function seedDatabase(){
 const names=new Set((await db.exercises.toArray()).map(e=>e.name.toLocaleLowerCase('pt-BR'))),missing=defaultExercises.filter(e=>!names.has(e.name.toLocaleLowerCase('pt-BR')));if(missing.length)await db.exercises.bulkAdd(missing)
 const st=await db.settings.get('main');await db.settings.put(st?{...st,monthlyWorkoutGoal:st.monthlyWorkoutGoal??16,yearlyWorkoutGoal:st.yearlyWorkoutGoal??200,cardioGoals:st.cardioGoals??[],intervalSounds:st.intervalSounds??true}:{id:'main',weeklyWorkoutGoal:4,monthlyWorkoutGoal:16,yearlyWorkoutGoal:200,cardioGoals:[],theme:'light',intervalSounds:true})
 const current=await db.readyWorkouts.toArray();if(current.some(x=>x.workoutTemplate?.blocks))return
 if(current.length)await db.readyWorkouts.clear()
 const all=await db.exercises.toArray(),map=new Map(all.map(e=>[e.name,e]));const pick=(...wanted:string[])=>wanted.map(n=>map.get(n)).filter(Boolean) as ExerciseDefinition[]
 function template(name:string,blocks:{name:string;model:WorkoutBlock['model'];names:string[];mode?:'tabata'|'emom'|'amrap'|'custom'}[]):Omit<WorkoutTemplate,'id'>{return{name,formatVersion:4,archived:false,createdAt:now(),updatedAt:now(),blocks:blocks.map((b,bi)=>{const xs=pick(...b.names);return{id:uid(),name:b.name,model:b.model,order:bi,intervalMode:b.mode,rounds:b.model==='interval'?4:undefined,roundRestSeconds:b.model==='interval'?60:undefined,countdownSeconds:b.model==='interval'?3:undefined,exercises:xs.map((e,i)=>({...exItem(e,i,b.model),restSeconds:b.model==='interval'&&i===xs.length-1?0:exItem(e,i,b.model).restSeconds}))}})}}
 const defs:[string,ReadyWorkoutTemplate['modality'],30|45|60,ReturnType<typeof template>][]=[
  ['Full Body Híbrido 45','hybrid',45,template('Full Body Híbrido 45',[{name:'Aquecimento',model:'cardio',names:['Bike ergométrica']},{name:'Musculação',model:'resistance',names:['Agachamento livre','Supino reto com halteres','Puxada frontal neutra','Elevação lateral com halteres']},{name:'Final HIIT',model:'interval',mode:'custom',names:['Burpee','Mountain climber']}])],
  ['Resistido Completo 60','resistance',60,template('Resistido Completo 60',[{name:'Treino principal',model:'resistance',names:['Agachamento livre','Leg press 45°','Supino reto com halteres','Remada máquina neutra','Desenvolvimento na máquina','Rosca martelo','Tríceps na polia com corda']}])],
  ['HIIT 30','hiit',30,template('HIIT 30',[{name:'Aquecimento',model:'cardio',names:['Bike ergométrica']},{name:'HIIT',model:'interval',mode:'tabata',names:['Burpee','Polichinelo','Mountain climber']}])]
 ]
 const ready=defs.filter(x=>x[3].blocks.every(b=>b.exercises.length)).map(([name,modality,durationMinutes,workoutTemplate])=>({name,modality,durationMinutes,source:'system' as const,workoutTemplate,createdAt:now(),updatedAt:now()}));if(ready.length)await db.readyWorkouts.bulkAdd(ready)
}
