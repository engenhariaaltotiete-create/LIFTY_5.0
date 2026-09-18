import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clipboard, ClipboardPaste, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import '../styles/ai-workout-import.css'
import { db } from '../db/database'
import { importLiftyText } from '../lib'
import type { ExerciseDefinition } from '../types'

type DayKey='mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'
type PhaseKey='preparation'|'main'|'complementary'|'finish'
type PhaseConfig={key:PhaseKey;minutes:number|'';enabled:boolean}

type Option={value:string;description:string}

const DAYS:{key:DayKey;short:string;name:string}[]=[
 {key:'mon',short:'SEG',name:'Segunda-feira'},
 {key:'tue',short:'TER',name:'Terça-feira'},
 {key:'wed',short:'QUA',name:'Quarta-feira'},
 {key:'thu',short:'QUI',name:'Quinta-feira'},
 {key:'fri',short:'SEX',name:'Sexta-feira'},
 {key:'sat',short:'SÁB',name:'Sábado'},
 {key:'sun',short:'DOM',name:'Domingo'}
]

const FOCUSES=[
 'Ganho de massa muscular (hipertrofia)',
 'Emagrecimento/redução de gordura',
 'Condicionamento físico',
 'Força',
 'Resistência muscular',
 'Melhora cardiovascular',
 'Mobilidade e flexibilidade',
 'Saúde e qualidade de vida',
 'Performance esportiva',
 'Reabilitação/retorno gradual',
 'Outro'
]

const MODALITIES:Option[]=[
 {value:'Musculação / Treinamento Resistido',description:'Treinamento com resistência externa ou corporal, organizado para desenvolver força, hipertrofia, resistência muscular e outras adaptações neuromusculares.'},
 {value:'Calistenia',description:'Treinamento baseado principalmente no peso corporal, com progressões de força, controle corporal, estabilidade e resistência.'},
 {value:'Treinamento Funcional',description:'Combina padrões de movimento, força, estabilidade, mobilidade e condicionamento com foco na capacidade funcional.'},
 {value:'Cross Training',description:'Combina diferentes capacidades físicas e métodos de treinamento em sessões variadas, podendo integrar força, condicionamento e movimentos funcionais.'},
 {value:'HIIT / Treinamento Intervalado',description:'Alterna períodos de esforço e recuperação, geralmente em intensidades elevadas ou controladas, conforme o objetivo da sessão.'},
 {value:'Cardio Contínuo',description:'Atividade cardiovascular realizada de forma contínua durante um período determinado, com intensidade relativamente estável.'},
 {value:'Cardio Intervalado',description:'Treinamento cardiovascular que alterna períodos de maior e menor intensidade ou períodos de esforço e recuperação.'},
 {value:'Mobilidade',description:'Trabalho voltado à amplitude de movimento, controle articular e qualidade dos movimentos.'},
 {value:'Alongamento',description:'Sessão voltada ao trabalho de flexibilidade e amplitude por meio de exercícios de alongamento organizados.'},
 {value:'Core',description:'Treinamento voltado à musculatura estabilizadora do tronco, incluindo abdômen, lombar e estruturas relacionadas.'},
 {value:'Circuito',description:'Organiza exercícios em sequência, normalmente com pausas controladas, podendo combinar força, resistência e condicionamento.'},
 {value:'Treinamento Híbrido',description:'Combina diferentes modalidades dentro de uma mesma sessão por meio de blocos, permitindo integrar estímulos distintos no mesmo treino.'}
]

const SPLITS:Option[]=[
 {value:'Full Body',description:'Corpo inteiro em uma mesma sessão.'},
 {value:'Upper / Lower',description:'Divide o programa entre sessões de membros superiores e sessões de membros inferiores.'},
 {value:'Push / Pull',description:'Divide o treinamento entre movimentos de empurrar e movimentos de puxar.'},
 {value:'Push / Pull / Legs (PPL)',description:'Divide o programa em empurrar, puxar e pernas.'},
 {value:'Anterior / Posterior',description:'Divide o treinamento entre cadeia anterior e cadeia posterior do corpo.'},
 {value:'Torso / Limbs',description:'Divide o programa entre trabalho de tronco e trabalho de membros.'},
 {value:'Agonista / Antagonista',description:'Combina grupos musculares ou padrões de movimento opostos dentro da organização do programa.'},
 {value:'Por Grupo Muscular',description:'Organiza as sessões por grupos específicos, como peito, costas, ombros, bíceps, tríceps, pernas, glúteos, core ou outros.'},
 {value:'Grupos Musculares Combinados',description:'Combina grupos musculares na mesma sessão, como peito + tríceps, costas + bíceps, pernas + glúteos, ombros + braços ou peito + costas.'},
 {value:'Upper Push / Upper Pull / Lower',description:'Divide o programa em superiores de empurrar, superiores de puxar e membros inferiores.'},
 {value:'Arnold Split',description:'Organiza o programa em peito + costas, ombros + braços e pernas.'},
 {value:'Não se aplica',description:'Use quando a modalidade escolhida não exigir uma divisão por grupos musculares.'}
]

const EQUIPMENT=[
 'Sem equipamentos/peso corporal','Academia completa','Halteres','Barra','Anilhas','Banco','Kettlebell','Máquinas de musculação','Polias/cabos','Smith machine','Elástico tubular','Faixa elástica/miniband','TRX/fita de suspensão','Barra fixa','Paralelas','Caixa/step/plyo box','Corda de pular','Medicine ball','Slam ball','Bola suíça','Bosu','Colchonete','Esteira','Bicicleta ergométrica','Elíptico','Remo ergométrico','Escada/Simulador de escada','Air bike','Outro equipamento'
]

const DURATIONS=Array.from({length:16},(_,i)=>15+i*5)
const PHASE_DURATIONS=Array.from({length:18},(_,i)=>(i+1)*5)

const PHASES:{key:PhaseKey;title:string;blocks:string;description:string;required:boolean}[]=[
 {key:'preparation',title:'1. Preparação',blocks:'Aquecimento geral, cardio leve, mobilidade, ativação, aquecimento específico',description:'Preparar para a sessão.',required:false},
 {key:'main',title:'2. Treinamento principal',blocks:'Resistido, força, hipertrofia, resistência, técnica, calistenia, funcional, Cross Training, HIIT, cardio etc.',description:'Parte central do treino.',required:true},
 {key:'complementary',title:'3. Complementar',blocks:'Acessórios, core, cardio, condicionamento, trabalho corretivo, exercícios complementares',description:'Complementar o estímulo principal.',required:false},
 {key:'finish',title:'4. Finalização',blocks:'Volta à calma, cardio leve, mobilidade, alongamento',description:'Encerrar a sessão.',required:false}
]

const INITIAL_PHASES:PhaseConfig[]=PHASES.map(p=>({key:p.key,minutes:'',enabled:true}))

const FORMAT_RULES=`FORMATO EXATO DE SAÍDA DO LIFTY
Quando eu aprovar o programa, gere SOMENTE o texto de importação.
Cada marcador e cada propriedade deve ocupar uma linha independente. Nunca coloque dois campos na mesma linha. Não use Markdown, tabelas, cercas de código, comentários ou explicações antes/depois.
Cada treino deve começar por === LIFTY WORKOUT === e terminar por === END LIFTY WORKOUT ===. Para múltiplos treinos, repita a estrutura completa para cada treino.

MODELO OFICIAL EXATO
=== LIFTY WORKOUT ===
VERSION: 1
NAME: Musculação / Treinamento Resistido - A - Full Body - 60 min
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

function optionDescription(options:Option[],value:string){return options.find(x=>x.value===value)?.description||''}
function dayName(key:DayKey){return DAYS.find(d=>d.key===key)?.name||key}
function phaseInfo(key:PhaseKey){return PHASES.find(p=>p.key===key)!}
function copyText(text:string){return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false)}
function alpha(index:number){return String.fromCharCode(65+index)}

export default function AiWorkoutImportPage(){
 const nav=useNavigate()
 const[step,setStep]=useState(1)
 const[focus,setFocus]=useState('')
 const[otherFocus,setOtherFocus]=useState('')
 const[selectedDays,setSelectedDays]=useState<DayKey[]>([])
 const[minutes,setMinutes]=useState(60)
 const[modality,setModality]=useState('Musculação / Treinamento Resistido')
 const[split,setSplit]=useState('Full Body')
 const[phases,setPhases]=useState<PhaseConfig[]>(INITIAL_PHASES)
 const[equipment,setEquipment]=useState<string[]>([])
 const[otherEquipment,setOtherEquipment]=useState('')
 const[notes,setNotes]=useState('')
 const[cardioNames,setCardioNames]=useState<string[]>([])
 const[copied,setCopied]=useState(false)
 const[text,setText]=useState('')
 const[importing,setImporting]=useState(false)

 useEffect(()=>{
  void db.exercises.toArray().then(xs=>setCardioNames(
   xs.filter((x:ExerciseDefinition)=>!x.archived&&(x.kind==='cardio_time'||x.kind==='cardio_distance'))
    .map(x=>x.name)
    .sort((a,b)=>a.localeCompare(b))
  ))
 },[])

 function toggleDay(day:DayKey){
  setSelectedDays(v=>v.includes(day)?v.filter(x=>x!==day):DAYS.map(d=>d.key).filter(x=>x===day||v.includes(x)))
 }
 function toggleEquipment(item:string){setEquipment(v=>v.includes(item)?v.filter(x=>x!==item):[...v,item])}
 function patchPhase(key:PhaseKey,patch:Partial<PhaseConfig>){setPhases(v=>v.map(p=>p.key===key?{...p,...patch}:p))}
 function removePhase(key:PhaseKey){if(key==='main')return;patchPhase(key,{enabled:false,minutes:''})}
 function restorePhase(key:PhaseKey){patchPhase(key,{enabled:true})}

 function validateCurrent(){
  if(step===1&&!focus)return'Escolha o foco principal.'
  if(step===1&&focus==='Outro'&&!otherFocus.trim())return'Descreva o foco principal.'
  if(step===2&&!selectedDays.length)return'Selecione ao menos um dia de treino.'
  if(step===2&&!modality)return'Selecione a modalidade de treinamento.'
  if(step===2&&!split)return'Selecione a divisão muscular.'
  if(step===3){
   const defined=phases.filter(p=>p.enabled).reduce((sum,p)=>sum+(p.minutes||0),0)
   if(defined>minutes)return`A soma dos tempos definidos nas fases (${defined} min) ultrapassa o tempo total do treino (${minutes} min).`
  }
  return''
 }
 function goToStep(nextStep:number){setStep(nextStep);window.requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}))}
 function next(){const error=validateCurrent();if(error)return alert(error);goToStep(Math.min(7,step+1))}
 function back(){goToStep(Math.max(1,step-1))}

 function buildPrompt(){
  const focusText=focus==='Outro'?otherFocus.trim():focus
  const eq=[...equipment.filter(x=>x!=='Outro equipamento'),...(equipment.includes('Outro equipamento')&&otherEquipment.trim()?[otherEquipment.trim()]:[])]
  const enabledPhases=phases.filter(p=>p.enabled)
  const phaseText=enabledPhases.map((p,i)=>{
   const info=phaseInfo(p.key)
   return `${i+1}. ${info.title.replace(/^\d+\.\s*/, '')}\n   - Função: ${info.description}\n   - Conteúdos possíveis: ${info.blocks}\n   - Duração: ${p.minutes===''?'a definir pela IA':`${p.minutes} minutos`}`
  }).join('\n')
  const cardio=cardioNames.length?cardioNames.map(x=>`- ${x}`).join('\n'):'- Nenhuma atividade de cardio padrão foi encontrada na biblioteca neste dispositivo.'
  const days=selectedDays.map(dayName).join(', ')
  const names=selectedDays.map((_,i)=>`${modality} - ${alpha(i)} - ${split} - ${minutes} min`).join('\n- ')
  const totalDefined=enabledPhases.reduce((sum,p)=>sum+(p.minutes||0),0)

  return `Você será meu especialista em treinamento físico e também responsável por gerar treinos compatíveis com o aplicativo LIFTY.

COMPORTAMENTO
As principais diretrizes já foram definidas pelo usuário no LIFTY. Não repita um questionário sobre informações já fornecidas. Primeiro elabore e apresente o programa para avaliação. Faça os ajustes solicitados. SOMENTE depois da aprovação gere o texto LIFTY para importação.

OBJETIVO PRINCIPAL
${focusText}

CONFIGURAÇÃO DO PROGRAMA
- Dias de treino: ${days}
- Quantidade de treinos semanais: ${selectedDays.length}
- Duração máxima de cada treino: ${minutes} minutos
- Modalidade de treinamento: ${modality}
- Divisão muscular: ${split}

ORGANIZAÇÃO SEMANAL
Elabore um treino para cada dia selecionado. Distribua a divisão muscular escolhida entre os treinos de forma tecnicamente coerente com a quantidade de dias, o foco e a recuperação. As configurações de modalidade e duração são válidas para todos os treinos.

NOMES OBRIGATÓRIOS DOS TREINOS
Use exatamente o padrão: Modalidade de treinamento - Sequência alfabética - Divisão muscular - Tempo.
A sequência deve ser A, B, C, D, E... conforme a quantidade de treinos, sem incluir o dia da semana no nome.
Para este programa, use:
- ${names}
Use esses nomes exatamente no campo NAME: de cada LIFTY WORKOUT.

ESTRUTURA OBRIGATÓRIA DAS SESSÕES
A estrutura abaixo vale para todos os treinos. Elabore o conteúdo de cada fase de acordo com o objetivo, a modalidade de treinamento, a divisão muscular, a posição daquele treino na semana, os equipamentos e as observações do usuário.
Mantenha as fases na ordem apresentada.
${phaseText}

REGRAS DE TEMPO DAS FASES
- A duração total de cada treino não pode ultrapassar ${minutes} minutos.
- ${totalDefined} minutos já foram definidos explicitamente pelo usuário nas fases.
- Quando uma fase estiver com duração "a definir pela IA", determine uma duração tecnicamente coerente e distribua o tempo disponível sem ultrapassar o total do treino.
- A fase Treinamento principal é obrigatória e deve representar a parte central da sessão.

REGRA ESPECÍFICA PARA ALONGAMENTOS
- Sempre que houver alongamento em qualquer fase, estruture-o como bloco intervalado para que o timer do LIFTY possa guiar o usuário.
- Escolha exercícios e tempos de alongamento coerentes com a modalidade, a divisão muscular e o conteúdo daquele treino.
- Use MODEL: interval e INTERVAL_MODE: custom para o bloco de alongamento, com WORK_SECONDS, REST_SECONDS, ROUNDS e demais parâmetros necessários.
- Quando um alongamento for unilateral, crie dois exercícios independentes, um para o lado direito e outro para o lado esquerdo, identificando explicitamente o lado no nome do exercício.
- Exemplo: "Alongamento de peitoral - lado direito" e "Alongamento de peitoral - lado esquerdo".
- Cada lado deve possuir seu próprio período de execução no timer. Nunca agrupe os dois lados em um único período.
- Alongamentos realmente bilaterais ou simultâneos podem permanecer como um único exercício.

EQUIPAMENTOS DISPONÍVEIS
${eq.length?eq.map(x=>`- ${x}`).join('\n'):'- Não informado. Use somente exercícios que não dependam de equipamento não confirmado ou apresente uma proposta compatível com essa ausência de informação.'}

OBSERVAÇÕES GERAIS DO USUÁRIO
${notes.trim()||'Nenhuma observação adicional.'}

ATIVIDADES DE CARDIO RECONHECIDAS PELO LIFTY
Quando utilizar uma atividade equivalente a uma opção abaixo, use EXATAMENTE o mesmo nome. Não crie nomenclatura alternativa para uma atividade já existente nesta lista, pois o LIFTY usa esses nomes para associar registros às metas de cardio.
${cardio}

REGRAS DE PROGRAMAÇÃO
- Considere conjuntamente foco, frequência semanal, modalidade, divisão muscular, duração, estrutura das fases, equipamentos, recuperação e observações do usuário.
- Cada treino deve ser coerente com sua posição dentro da divisão semanal; os treinos não precisam repetir os mesmos exercícios.
- Um treino pode combinar blocos resistance, cardio e interval quando isso for coerente com a fase e com a modalidade.
- Prefira nomes completos e convencionais para os exercícios.
- Não inclua carga planejada; as cargas são registradas somente durante a execução no LIFTY.
- Na apresentação inicial do programa, mostre claramente os treinos A, B, C... e a distribuição muscular proposta para cada um.

${FORMAT_RULES}`
 }

 const prompt=useMemo(()=>buildPrompt(),[focus,otherFocus,selectedDays,minutes,modality,split,phases,equipment,otherEquipment,notes,cardioNames])

 async function copyPrompt(){
  if(await copyText(prompt)){setCopied(true);setTimeout(()=>setCopied(false),2000)}
  else alert('Não foi possível copiar automaticamente.')
 }
 async function doImport(){
  if(!text.trim())return alert('Cole o texto LIFTY gerado pela IA.')
  setImporting(true)
  try{
   const ids=await importLiftyText(text)
   alert(`${ids.length} treino(s) importado(s) com sucesso.`)
   setText('')
  }catch(error){
   alert(error instanceof Error?error.message:'Texto inválido ou incompatível.')
  }finally{setImporting(false)}
 }

 const progress=Math.round(step/7*100)
 const enabledPhases=phases.filter(p=>p.enabled)
 const definedMinutes=enabledPhases.reduce((sum,p)=>sum+(p.minutes||0),0)

 return <div className="page ai-import-page">
  <button className="secondary page-back" onClick={()=>nav('/treinos')}><ArrowLeft size={18}/>Voltar</button>
  <PageHeader title="Criar treino com IA" subtitle="Configure seu programa passo a passo e gere um prompt personalizado"/>

  <div className="ai-progress">
   <div><strong>Passo {step} de 7</strong><span>{progress}%</span></div>
   <div className="ai-progress-track"><i style={{width:`${progress}%`}}/></div>
  </div>

  {step===1&&<section className="card ai-step">
   <h2>1. Foco principal</h2>
   <p>Qual é o principal objetivo do programa?</p>
   <div className="choice-grid">{FOCUSES.map(x=><button key={x} className={focus===x?'choice active':'choice'} onClick={()=>setFocus(x)}>{x}</button>)}</div>
   {focus==='Outro'&&<label>Outro objetivo<input value={otherFocus} onChange={e=>setOtherFocus(e.target.value)} placeholder="Descreva o objetivo"/></label>}
  </section>}

  {step===2&&<section className="card ai-step">
   <h2>2. Programa de treinamento</h2>
   <p>Estas definições serão utilizadas em todos os dias do programa.</p>

   <label>Dias da semana</label>
   <div className="day-grid">{DAYS.map(d=><button key={d.key} className={selectedDays.includes(d.key)?'day active':'day'} onClick={()=>toggleDay(d.key)}>{d.short}</button>)}</div>

   <div className="field-grid two">
    <label>Tempo por treino
     <select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>{DURATIONS.map(n=><option key={n} value={n}>{n} min</option>)}</select>
    </label>
    <label>Modalidade de treinamento
     <select value={modality} onChange={e=>setModality(e.target.value)}>{MODALITIES.map(x=><option key={x.value} value={x.value}>{x.value}</option>)}</select>
    </label>
   </div>
   <div className="option-explanation"><strong>{modality}</strong><span>{optionDescription(MODALITIES,modality)}</span></div>

   <label>Divisão muscular
    <select value={split} onChange={e=>setSplit(e.target.value)}>{SPLITS.map(x=><option key={x.value} value={x.value}>{x.value}</option>)}</select>
   </label>
   <div className="option-explanation"><strong>{split}</strong><span>{optionDescription(SPLITS,split)}</span></div>
  </section>}

  {step===3&&<section className="card ai-step">
   <h2>3. Estrutura dos treinos</h2>
   <p>A mesma estrutura será usada como diretriz para todos os treinos. A IA adaptará o conteúdo de cada fase à modalidade e à divisão muscular escolhidas.</p>

   <div className="phase-list">{PHASES.map(info=>{
    const phase=phases.find(p=>p.key===info.key)!
    if(!phase.enabled)return <div className="phase-disabled" key={info.key}><div><strong>{info.title}</strong><span>Fase excluída</span></div><button className="secondary" onClick={()=>restorePhase(info.key)}>Restaurar</button></div>
    return <article className={`phase-card${info.required?' required':''}`} key={info.key}>
     <div className="phase-head"><div><strong>{info.title}</strong>{info.required&&<span className="required-badge">Obrigatório</span>}</div>{!info.required&&<button className="icon-btn danger" title="Excluir fase" onClick={()=>removePhase(info.key)}><Trash2 size={17}/></button>}</div>
     <p className="phase-function"><b>Função:</b> {info.description}</p>
     <p className="phase-blocks"><b>Blocos possíveis:</b> {info.blocks}</p>
     <label>Duração da fase
      <select value={phase.minutes} onChange={e=>patchPhase(info.key,{minutes:e.target.value===''?'':Number(e.target.value)})}>
       <option value="">Automático — IA decide</option>
       {PHASE_DURATIONS.filter(n=>n<=minutes).map(n=><option key={n} value={n}>{n} min</option>)}
      </select>
     </label>
    </article>
   })}</div>
   <small className={`time-note${definedMinutes>minutes?' invalid':''}`}>Tempo definido: {definedMinutes} de {minutes} min. {definedMinutes<=minutes?`${minutes-definedMinutes} min permanecem disponíveis para as fases automáticas.`:'A soma ultrapassa o tempo total do treino.'}</small>
  </section>}

  {step===4&&<section className="card ai-step">
   <h2>4. Equipamentos disponíveis</h2>
   <p>Selecione todos os equipamentos que poderão ser usados no programa.</p>
   <div className="choice-grid compact">{EQUIPMENT.map(x=><button key={x} className={equipment.includes(x)?'choice active':'choice'} onClick={()=>toggleEquipment(x)}>{x}</button>)}</div>
   {equipment.includes('Outro equipamento')&&<label>Outro equipamento<input value={otherEquipment} onChange={e=>setOtherEquipment(e.target.value)} placeholder="Informe o equipamento"/></label>}
  </section>}

  {step===5&&<section className="card ai-step">
   <h2>5. Observações gerais</h2>
   <p>Informe limitações, preferências, exercícios que deseja evitar ou qualquer orientação adicional.</p>
   <textarea rows={8} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: evitar exercícios específicos de antebraço; prefiro halteres; não quero agachamento sumô..."/>
  </section>}

  {step===6&&<section className="card ai-step">
   <h2>6. Revisar programa</h2>
   <div className="review">
    <p><b>Foco:</b> {focus==='Outro'?otherFocus||'Outro':focus}</p>
    <p><b>Dias:</b> {selectedDays.map(dayName).join(', ')}</p>
    <p><b>Tempo:</b> {minutes} min por treino</p>
    <p><b>Modalidade:</b> {modality}</p>
    <p><b>Divisão muscular:</b> {split}</p>
    <div><b>Estrutura:</b><ol>{enabledPhases.map(p=><li key={p.key}>{phaseInfo(p.key).title.replace(/^\d+\.\s*/,'')} — {p.minutes===''?'Automático':`${p.minutes} min`}</li>)}</ol></div>
    <div><b>Nomes previstos:</b><ol>{selectedDays.map((_,i)=><li key={i}>{modality} - {alpha(i)} - {split} - {minutes} min</li>)}</ol></div>
    <p><b>Equipamentos:</b> {[...equipment.filter(x=>x!=='Outro equipamento'),...(equipment.includes('Outro equipamento')&&otherEquipment?[otherEquipment]:[])].join(', ')||'Não informados'}</p>
    <p><b>Observações:</b> {notes||'Nenhuma'}</p>
   </div>
  </section>}

  {step===7&&<>
   <section className="card ai-step">
    <div className="ai-step-title"><Sparkles className="lime-icon" size={26}/><div><h2>7. Usar na IA</h2><p>Seu prompt personalizado está pronto. Copie, envie à IA, revise o programa e só depois peça o texto final LIFTY.</p></div></div>
    <button className="primary full" onClick={()=>void copyPrompt()}>{copied?<CheckCircle2 size={18}/>:<Clipboard size={18}/>} {copied?'Prompt copiado':'Copiar prompt personalizado'}</button>
    <details className="prompt-preview"><summary>Ver prompt completo</summary><pre>{prompt}</pre></details>
   </section>
   <section className="card ai-step">
    <h2>Importar resultado</h2>
    <p>Depois de aprovar o programa na IA, cole aqui o texto LIFTY final.</p>
    <textarea rows={14} value={text} onChange={e=>setText(e.target.value)} placeholder={'=== LIFTY WORKOUT ===\nVERSION: 1\nNAME: ...'}/>
    <button className="primary full" disabled={importing} onClick={()=>void doImport()}><ClipboardPaste size={18}/>{importing?'Importando...':'Importar treino(s)'}</button>
   </section>
  </>}

  <div className="wizard-nav">
   {step>1&&<button className="secondary" onClick={back}><ArrowLeft size={17}/>Anterior</button>}
   <span/>
   {step<7&&<button className="primary" onClick={next}>Próximo<ArrowRight size={17}/></button>}
  </div>
 </div>
}
