import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, Clipboard, ClipboardPaste, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import '../styles/ai-workout-import.css'
import { db } from '../db/database'
import { importLiftyText, uid } from '../lib'
import type { ExerciseDefinition } from '../types'

type DayKey='mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
type DayPlan={day:DayKey;minutes:number;modality:string;blocks:PlanBlock[]}
type PlanBlock={id:string;name:string;minutes:number|''}

const DAYS:{key:DayKey;short:string;name:string}[]=[
 {key:'mon',short:'SEG',name:'Segunda-feira'},{key:'tue',short:'TER',name:'Terça-feira'},{key:'wed',short:'QUA',name:'Quarta-feira'},
 {key:'thu',short:'QUI',name:'Quinta-feira'},{key:'fri',short:'SEX',name:'Sexta-feira'},{key:'sat',short:'SÁB',name:'Sábado'},{key:'sun',short:'DOM',name:'Domingo'}
]
const FOCUSES=['Ganho de massa muscular (hipertrofia)','Emagrecimento/redução de gordura','Condicionamento físico','Força','Resistência muscular','Melhora cardiovascular','Mobilidade e flexibilidade','Saúde e qualidade de vida','Performance esportiva','Reabilitação/retorno gradual','Outro']
const MODALITIES=['Musculação','Full Body','Cross Training','Treinamento Funcional','Calistenia','HIIT','Circuito','Cardio','Corrida','Caminhada','Ciclismo/Bike','Pilates','Yoga','Mobilidade','Alongamento','Core/Abdômen','Misto/Híbrido']
const EQUIPMENT=['Sem equipamentos/peso corporal','Academia completa','Halteres','Barra','Anilhas','Banco','Kettlebell','Máquinas de musculação','Polias/cabos','Smith machine','Elástico tubular','Faixa elástica/miniband','TRX/fita de suspensão','Barra fixa','Paralelas','Caixa/step/plyo box','Corda de pular','Medicine ball','Slam ball','Bola suíça','Bosu','Colchonete','Esteira','Bicicleta ergométrica','Elíptico','Remo ergométrico','Escada/Simulador de escada','Air bike','Outro equipamento']
const BLOCK_OPTIONS=['Aquecimento','Treinamento resistido','Cardio','Funcional','Cross Training','HIIT/Intervalado','Core/Abdômen','Mobilidade','Alongamento','Volta à calma','Bloco personalizado']
const DURATIONS=Array.from({length:16},(_,i)=>15+i*5)

function defaultBlocks(modality:string):PlanBlock[]{
 const b=(name:string):PlanBlock=>({id:uid(),name,minutes:''})
 if(['Corrida','Caminhada','Ciclismo/Bike','Cardio'].includes(modality))return[b('Aquecimento'),b('Cardio'),b('Alongamento')]
 if(['Cross Training','HIIT','Circuito','Treinamento Funcional'].includes(modality))return[b('Aquecimento'),b(modality==='HIIT'?'HIIT/Intervalado':modality),b('Volta à calma')]
 if(['Pilates','Yoga','Mobilidade','Alongamento'].includes(modality))return[b('Aquecimento'),b(modality),b('Volta à calma')]
 return[b('Aquecimento'),b('Treinamento resistido'),b('Alongamento')]
}
function dayName(k:DayKey){return DAYS.find(d=>d.key===k)?.name||k}
function copyText(text:string){return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false)}

const FORMAT_RULES=`FORMATO EXATO DE SAÍDA DO LIFTY
Quando eu aprovar o programa, gere SOMENTE o texto de importação.
Cada marcador e cada propriedade deve ocupar uma linha independente. Nunca coloque dois campos na mesma linha. Não use Markdown, tabelas, cercas de código, comentários ou explicações antes/depois.
Cada treino deve começar por === LIFTY WORKOUT === e terminar por === END LIFTY WORKOUT ===. Para múltiplos treinos, repita a estrutura completa para cada treino.

MODELO OFICIAL EXATO
=== LIFTY WORKOUT ===
VERSION: 1
NAME: Fullbody A
DESCRIPTION: Treino de exemplo.

[BLOCK]
NAME: Aquecimento
MODEL: cardio

[EXERCISE]
NAME: Caminhada na esteira
KIND: cardio_time
TARGET_MINUTES: 10
TARGET_DISTANCE_KM: 0

[BLOCK]
NAME: Treinamento Resistido
MODEL: resistance

[EXERCISE]
NAME: Supino reto com halteres
KIND: resistance
SETS: 4
REPS_MIN: 15
REPS_MAX: 20

=== END LIFTY WORKOUT ===

VALORES ACEITOS
MODEL: resistance | cardio | interval
KIND: resistance | bodyweight | timed | cardio_distance | cardio_time
INTERVAL_MODE: tabata | emom | amrap | custom
Campos de exercício, quando aplicáveis: SETS, REPS_MIN, REPS_MAX, TARGET_SECONDS, TARGET_MINUTES, TARGET_DISTANCE_KM, WORK_SECONDS, REST_SECONDS, TARGET_REPS, NOTES.
Campos de bloco intervalado, quando aplicáveis: INTERVAL_MODE, ROUNDS, ROUND_REST_SECONDS, TOTAL_MINUTES, COUNTDOWN_SECONDS.
Nunca inclua carga planejada no treino-base.`

export default function AiWorkoutImportPage(){
 const nav=useNavigate();const[step,setStep]=useState(1);const[focus,setFocus]=useState('');const[otherFocus,setOtherFocus]=useState('');const[plans,setPlans]=useState<DayPlan[]>([]);const[equipment,setEquipment]=useState<string[]>([]);const[otherEquipment,setOtherEquipment]=useState('');const[notes,setNotes]=useState('');const[cardioNames,setCardioNames]=useState<string[]>([]);const[copied,setCopied]=useState(false);const[text,setText]=useState('');const[importing,setImporting]=useState(false)
 useEffect(()=>{void db.exercises.toArray().then(xs=>setCardioNames(xs.filter((x:ExerciseDefinition)=>!x.archived&&(x.kind==='cardio_time'||x.kind==='cardio_distance')).map(x=>x.name).sort((a,b)=>a.localeCompare(b))))},[])
 const selectedDays=useMemo(()=>new Set(plans.map(p=>p.day)),[plans])
 function toggleDay(day:DayKey){setPlans(v=>v.some(p=>p.day===day)?v.filter(p=>p.day!==day):[...v,{day,minutes:60,modality:'Musculação',blocks:defaultBlocks('Musculação')}].sort((a,b)=>DAYS.findIndex(d=>d.key===a.day)-DAYS.findIndex(d=>d.key===b.day)))}
 function patchPlan(day:DayKey,patch:Partial<DayPlan>){setPlans(v=>v.map(p=>p.day===day?{...p,...patch}:p))}
 function changeModality(day:DayKey,modality:string){setPlans(v=>v.map(p=>p.day===day?{...p,modality,blocks:defaultBlocks(modality)}:p))}
 function patchBlock(day:DayKey,id:string,patch:Partial<PlanBlock>){setPlans(v=>v.map(p=>p.day===day?{...p,blocks:p.blocks.map(b=>b.id===id?{...b,...patch}:b)}:p))}
 function addBlock(day:DayKey){setPlans(v=>v.map(p=>p.day===day?{...p,blocks:[...p.blocks,{id:uid(),name:'Cardio',minutes:''}]}:p))}
 function removeBlock(day:DayKey,id:string){setPlans(v=>v.map(p=>p.day===day?{...p,blocks:p.blocks.filter(b=>b.id!==id)}:p))}
 function moveBlock(day:DayKey,index:number,delta:number){setPlans(v=>v.map(p=>{if(p.day!==day)return p;const n=[...p.blocks],j=index+delta;if(j<0||j>=n.length)return p;[n[index],n[j]]=[n[j],n[index]];return{...p,blocks:n}}))}
 function toggleEquipment(x:string){setEquipment(v=>v.includes(x)?v.filter(y=>y!==x):[...v,x])}
 function validateCurrent(){if(step===1&&!focus)return'Escolha o foco principal.';if(step===2&&!plans.length)return'Selecione ao menos um dia de treino.';if(step===4&&plans.some(p=>!p.blocks.length))return'Cada dia precisa ter ao menos um bloco.';return''}
 function next(){const e=validateCurrent();if(e)return alert(e);setStep(s=>Math.min(8,s+1))}
 function back(){setStep(s=>Math.max(1,s-1))}
 function buildPrompt(){
  const focusText=focus==='Outro'?(otherFocus.trim()||'Outro objetivo informado pelo usuário'):focus
  const eq=[...equipment.filter(x=>x!=='Outro equipamento'),...(equipment.includes('Outro equipamento')&&otherEquipment.trim()?[otherEquipment.trim()]:[])]
  const days=plans.map(p=>`${dayName(p.day)}\n- Duração total máxima: ${p.minutes} minutos\n- Modalidade: ${p.modality}\n- Estrutura obrigatória nesta ordem:\n${p.blocks.map((b,i)=>`  ${i+1}. ${b.name} — ${b.minutes===''?'duração a definir pela IA':`${b.minutes} minutos`}`).join('\n')}\n- A soma dos blocos não pode ultrapassar ${p.minutes} minutos. Distribua o tempo restante entre os blocos sem duração definida.`).join('\n\n')
  const cardio=cardioNames.length?cardioNames.map(x=>`- ${x}`).join('\n'):'- Nenhuma atividade de cardio padrão foi encontrada na biblioteca neste dispositivo.'
  return `Você será meu especialista em treinamento físico e também responsável por gerar treinos compatíveis com o aplicativo LIFTY.\n\nCOMPORTAMENTO\nAs principais diretrizes já foram definidas pelo usuário no LIFTY. Não repita um questionário sobre informações já fornecidas. Primeiro elabore e apresente o programa para avaliação. Faça os ajustes solicitados. SOMENTE depois da aprovação gere o texto LIFTY para importação.\n\nOBJETIVO PRINCIPAL\n${focusText}\n\nPROGRAMA SEMANAL\n${days}\n\nEQUIPAMENTOS DISPONÍVEIS\n${eq.length?eq.map(x=>`- ${x}`).join('\n'):'- Não informado; escolha apenas exercícios que não dependam de equipamento não confirmado.'}\n\nOBSERVAÇÕES GERAIS DO USUÁRIO\n${notes.trim()||'Nenhuma observação adicional.'}\n\nATIVIDADES DE CARDIO RECONHECIDAS PELO LIFTY\nQuando utilizar uma atividade equivalente a uma opção abaixo, use EXATAMENTE o mesmo nome. Não crie nomenclatura alternativa para uma atividade já existente nesta lista, pois o LIFTY usa esses nomes para associar registros às metas de cardio.\n${cardio}\n\nREGRAS DE PROGRAMAÇÃO\n- Respeite a duração máxima de cada dia e a ordem dos blocos definida pelo usuário.\n- Quando um bloco estiver com duração a definir, distribua o tempo disponível de forma tecnicamente coerente.\n- Um treino pode combinar blocos resistance, cardio e interval.\n- Prefira nomes completos e convencionais para os exercícios.\n- Considere objetivo, recuperação, distribuição semanal, equipamentos e observações do usuário.\n- Não inclua carga planejada; cargas são registradas somente durante a execução.\n\n${FORMAT_RULES}`
 }
 const prompt=useMemo(()=>buildPrompt(),[focus,otherFocus,plans,equipment,otherEquipment,notes,cardioNames])
 async function copyPrompt(){if(await copyText(prompt)){setCopied(true);setTimeout(()=>setCopied(false),2000)}else alert('Não foi possível copiar automaticamente.')}
 async function doImport(){if(!text.trim())return alert('Cole o texto LIFTY gerado pela IA.');setImporting(true);try{const ids=await importLiftyText(text);alert(`${ids.length} treino(s) importado(s) com sucesso.`);setText('')}catch(e){alert(e instanceof Error?e.message:'Texto inválido ou incompatível.')}finally{setImporting(false)}}
 const progress=Math.round(step/8*100)
 return <div className="page ai-import-page">
  <button className="secondary page-back" onClick={()=>nav('/treinos')}><ArrowLeft size={18}/>Voltar</button>
  <PageHeader title="Criar treino com IA" subtitle="Configure seu programa passo a passo e gere um prompt personalizado"/>
  <div className="ai-progress"><div><strong>Passo {step} de 8</strong><span>{progress}%</span></div><div className="ai-progress-track"><i style={{width:`${progress}%`}}/></div></div>

  {step===1&&<section className="card ai-step"><h2>1. Foco principal</h2><p>Qual é o principal objetivo do programa?</p><div className="choice-grid">{FOCUSES.map(x=><button key={x} className={focus===x?'choice active':'choice'} onClick={()=>setFocus(x)}>{x}</button>)}</div>{focus==='Outro'&&<label>Outro objetivo<input value={otherFocus} onChange={e=>setOtherFocus(e.target.value)} placeholder="Descreva o objetivo"/></label>}</section>}
  {step===2&&<section className="card ai-step"><h2>2. Dias de treino</h2><p>Selecione os dias em que o programa será realizado.</p><div className="day-grid">{DAYS.map(d=><button key={d.key} className={selectedDays.has(d.key)?'day active':'day'} onClick={()=>toggleDay(d.key)}>{d.short}</button>)}</div></section>}
  {step===3&&<section className="card ai-step"><h2>3. Duração e modalidade</h2><p>Configure cada dia selecionado.</p><div className="day-plan-list">{plans.map(p=><article className="day-card" key={p.day}><strong>{dayName(p.day)}</strong><div className="field-grid two"><label>Duração<select value={p.minutes} onChange={e=>patchPlan(p.day,{minutes:Number(e.target.value)})}>{DURATIONS.map(n=><option key={n} value={n}>{n} min</option>)}</select></label><label>Modalidade<select value={p.modality} onChange={e=>changeModality(p.day,e.target.value)}>{MODALITIES.map(x=><option key={x}>{x}</option>)}</select></label></div></article>)}</div></section>}
  {step===4&&<section className="card ai-step"><h2>4. Estrutura de cada treino</h2><p>O LIFTY criou uma estrutura inicial para cada dia. Reordene, adicione ou exclua blocos. O tempo é opcional; em “Automático”, a IA decide.</p><div className="day-plan-list">{plans.map(p=><article className="day-card" key={p.day}><div className="day-card-head"><strong>{dayName(p.day)}</strong><span>{p.minutes} min • {p.modality}</span></div>{p.blocks.map((b,i)=><div className="plan-block" key={b.id}><div className="block-order"><button className="icon-btn" disabled={i===0} onClick={()=>moveBlock(p.day,i,-1)}><ArrowUp size={15}/></button><button className="icon-btn" disabled={i===p.blocks.length-1} onClick={()=>moveBlock(p.day,i,1)}><ArrowDown size={15}/></button></div><label>Bloco<select value={BLOCK_OPTIONS.includes(b.name)?b.name:'Bloco personalizado'} onChange={e=>patchBlock(p.day,b.id,{name:e.target.value})}>{BLOCK_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label>{(!BLOCK_OPTIONS.includes(b.name)||b.name==='Bloco personalizado')&&<label>Nome<input value={b.name==='Bloco personalizado'?'':b.name} placeholder="Nome do bloco" onChange={e=>patchBlock(p.day,b.id,{name:e.target.value||'Bloco personalizado'})}/></label>}<label>Tempo<select value={b.minutes} onChange={e=>patchBlock(p.day,b.id,{minutes:e.target.value===''?'':Number(e.target.value)})}><option value="">Automático</option>{DURATIONS.map(n=><option key={n} value={n}>{n} min</option>)}</select></label><button className="icon-btn danger" disabled={p.blocks.length===1} onClick={()=>removeBlock(p.day,b.id)}><Trash2 size={17}/></button></div>)}<button className="secondary full" onClick={()=>addBlock(p.day)}><Plus size={17}/>Adicionar bloco</button><small className="time-note">Tempo definido: {p.blocks.reduce((a,b)=>a+(b.minutes||0),0)} de {p.minutes} min{p.blocks.reduce((a,b)=>a+(b.minutes||0),0)>p.minutes?' — ajuste necessário':''}</small></article>)}</div></section>}
  {step===5&&<section className="card ai-step"><h2>5. Equipamentos disponíveis</h2><p>Selecione todos os equipamentos que poderão ser usados.</p><div className="choice-grid compact">{EQUIPMENT.map(x=><button key={x} className={equipment.includes(x)?'choice active':'choice'} onClick={()=>toggleEquipment(x)}>{x}</button>)}</div>{equipment.includes('Outro equipamento')&&<label>Outro equipamento<input value={otherEquipment} onChange={e=>setOtherEquipment(e.target.value)} placeholder="Informe o equipamento"/></label>}</section>}
  {step===6&&<section className="card ai-step"><h2>6. Observações gerais</h2><p>Informe limitações, preferências, exercícios que deseja evitar ou qualquer orientação adicional.</p><textarea rows={8} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: evitar exercícios específicos de antebraço; prefiro halteres; não quero agachamento sumô..."/></section>}
  {step===7&&<section className="card ai-step"><h2>7. Revisar programa</h2><div className="review"><p><b>Foco:</b> {focus==='Outro'?otherFocus||'Outro':focus}</p>{plans.map(p=><div key={p.day}><b>{dayName(p.day)} — {p.minutes} min — {p.modality}</b><ol>{p.blocks.map(b=><li key={b.id}>{b.name} — {b.minutes===''?'Automático':`${b.minutes} min`}</li>)}</ol></div>)}<p><b>Equipamentos:</b> {[...equipment.filter(x=>x!=='Outro equipamento'),otherEquipment].filter(Boolean).join(', ')||'Não informados'}</p><p><b>Observações:</b> {notes||'Nenhuma'}</p></div></section>}
  {step===8&&<><section className="card ai-step"><div className="ai-step-title"><Sparkles className="lime-icon" size={26}/><div><h2>8. Usar na IA</h2><p>Seu prompt personalizado está pronto. Copie, envie à IA, revise o programa e só depois peça o texto final LIFTY.</p></div></div><button className="primary full" onClick={()=>void copyPrompt()}>{copied?<CheckCircle2 size={18}/>:<Clipboard size={18}/>} {copied?'Prompt copiado':'Copiar prompt personalizado'}</button><details className="prompt-preview"><summary>Ver prompt completo</summary><pre>{prompt}</pre></details></section><section className="card ai-step"><h2>Importar resultado</h2><p>Depois de aprovar o programa na IA, cole aqui o texto LIFTY final.</p><textarea rows={14} value={text} onChange={e=>setText(e.target.value)} placeholder="=== LIFTY WORKOUT ===\nVERSION: 1\nNAME: ..."/><button className="primary full" disabled={importing} onClick={()=>void doImport()}><ClipboardPaste size={18}/>{importing?'Importando...':'Importar treino(s)'}</button></section></>}

  <div className="wizard-nav">{step>1&&<button className="secondary" onClick={back}><ArrowLeft size={17}/>Anterior</button>}<span/>{step<8&&<button className="primary" onClick={next}>Próximo<ArrowRight size={17}/></button>}</div>
 </div>
}
