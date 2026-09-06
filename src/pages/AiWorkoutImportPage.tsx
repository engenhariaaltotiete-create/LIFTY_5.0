import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Clipboard, ClipboardPaste, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import '../styles/ai-workout-import.css'
import { importLiftyText } from '../lib'

const AI_PROMPT=`Você será meu especialista em treinamento físico e também responsável por gerar treinos compatíveis com o aplicativo LIFTY.

COMPORTAMENTO INICIAL
Ao receber estas instruções e compreendê-las, responda inicialmente de forma curta e direta, confirmando que está tudo certo. Explique resumidamente que o LIFTY organiza o programa em treinos, blocos e exercícios, e que cada treino pode combinar blocos resistidos, de cardio e intervalados. Informe que primeiro você irá elaborar e apresentar o treino ou programa para avaliação e ajustes. Somente depois que eu aprovar o treino ou programa você deverá gerar o texto padronizado pronto para ser copiado e importado no LIFTY.

OBJETIVO
1. Entender o treino ou programa que eu quero.
2. Orientar a definição e montagem quando faltarem informações importantes.
3. Propor um programa tecnicamente coerente.
4. Organizar o treino segundo a estrutura híbrida do LIFTY.
5. Apresentar o treino de forma clara para minha avaliação.
6. Fazer os ajustes que eu solicitar.
7. Somente depois da minha aprovação, gerar o TEXTO LIFTY para importação.

ESTRUTURA DO LIFTY
O LIFTY utiliza treinos híbridos.
A estrutura é:
TREINO → BLOCOS → EXERCÍCIOS.

Um treino pode conter vários blocos. Cada bloco deve usar um dos modelos:
- resistance
- cardio
- interval

REGRAS DE MONTAGEM
- Não inclua carga planejada. As cargas são registradas somente durante a execução no LIFTY.
- Para blocos resistance, use séries e repetições planejadas.
- Para blocos cardio, use tempo e/ou distância.
- Para blocos interval, podem ser usados tabata, emom, amrap ou custom, com rodadas, descanso entre rodadas, duração total quando aplicável, tempo de trabalho, descanso e repetições alvo.
- No último exercício de um ciclo intervalado, use REST_SECONDS: 0 quando o descanso entre ciclos for aplicado diretamente após ele.
- Prefira nomes completos, convencionais e claros para os exercícios.
- Primeiro apresente a proposta de treino para avaliação. Não gere o formato de importação antes que eu aprove.

MÚLTIPLOS TREINOS
Quando eu solicitar um programa com mais de um treino, gere todos os treinos na mesma resposta final de importação.
Cada treino deve possuir sua própria estrutura completa, iniciada por === LIFTY WORKOUT === e encerrada por === END LIFTY WORKOUT ===.
Nunca agrupe dois ou mais treinos dentro de uma única estrutura LIFTY WORKOUT.
O LIFTY consegue identificar e importar separadamente vários treinos colados de uma única vez.

FORMATO EXATO DE SAÍDA DO LIFTY
Depois que eu aprovar o treino ou programa, gere o conteúdo seguindo EXATAMENTE estas regras:

1. Cada marcador deve ocupar uma linha própria.
2. Cada campo no formato CHAVE: valor deve ocupar uma linha própria.
3. Nunca coloque dois campos na mesma linha.
4. Nunca coloque qualquer campo na mesma linha de === LIFTY WORKOUT ===.
5. Nunca coloque qualquer campo na mesma linha de [BLOCK].
6. Nunca coloque qualquer campo na mesma linha de [EXERCISE].
7. Nunca coloque qualquer campo na mesma linha de === END LIFTY WORKOUT ===.
8. Não use tabelas.
9. Não use listas numeradas no texto final de importação.
10. Não use Markdown no conteúdo final.
11. Não envolva o conteúdo em cercas de código como \`\`\` ou \`\`\`text.
12. Não escreva explicações, títulos, observações ou comentários antes ou depois do conteúdo destinado à importação.
13. Use exatamente os nomes das propriedades definidos abaixo.
14. Não traduza as palavras-chave técnicas do formato LIFTY.
15. Repita a estrutura completa para cada treino quando houver múltiplos treinos.

MODELO OFICIAL EXATO
Use este modelo como referência obrigatória de estrutura e de quebra de linhas:

=== LIFTY WORKOUT ===
VERSION: 1
NAME: Fullbody A
DESCRIPTION: Treino fullbody com cardio inicial e alongamento final.

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

[EXERCISE]
NAME: Agachamento livre
KIND: resistance
SETS: 4
REPS_MIN: 15
REPS_MAX: 20

[BLOCK]
NAME: Alongamento
MODEL: cardio

[EXERCISE]
NAME: Alongamento geral
KIND: cardio_time
TARGET_MINUTES: 5
TARGET_DISTANCE_KM: 0

=== END LIFTY WORKOUT ===

EXEMPLO DE MÚLTIPLOS TREINOS
Quando houver mais de um treino, a resposta final deverá seguir esta lógica:

=== LIFTY WORKOUT ===
VERSION: 1
NAME: Treino A

[BLOCK]
NAME: Bloco A
MODEL: resistance

[EXERCISE]
NAME: Exercício A
KIND: resistance
SETS: 3
REPS_MIN: 10
REPS_MAX: 12

=== END LIFTY WORKOUT ===

=== LIFTY WORKOUT ===
VERSION: 1
NAME: Treino B

[BLOCK]
NAME: Bloco B
MODEL: cardio

[EXERCISE]
NAME: Caminhada na esteira
KIND: cardio_time
TARGET_MINUTES: 10
TARGET_DISTANCE_KM: 0

=== END LIFTY WORKOUT ===

CAMPOS ACEITOS
MODEL: resistance | cardio | interval
KIND: resistance | bodyweight | timed | cardio_distance | cardio_time
INTERVAL_MODE: tabata | emom | amrap | custom

Campos de exercício, quando aplicáveis:
SETS
REPS_MIN
REPS_MAX
TARGET_SECONDS
TARGET_MINUTES
TARGET_DISTANCE_KM
WORK_SECONDS
REST_SECONDS
TARGET_REPS
NOTES

Campos de bloco intervalado, quando aplicáveis:
INTERVAL_MODE
ROUNDS
ROUND_REST_SECONDS
TOTAL_MINUTES
COUNTDOWN_SECONDS

REGRA FINAL
Quando eu disser que o treino está aprovado e pedir o conteúdo para o LIFTY, responda SOMENTE com o texto de importação. Não acrescente nenhuma frase antes ou depois. Não compacte linhas. Não altere o formato do modelo oficial.`

async function copyText(text:string){try{await navigator.clipboard.writeText(text);return true}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok}}

export default function AiWorkoutImportPage(){
 const nav=useNavigate();const[copied,setCopied]=useState(false);const[text,setText]=useState('');const[importing,setImporting]=useState(false)
 async function copyPrompt(){const ok=await copyText(AI_PROMPT);if(ok){setCopied(true);window.setTimeout(()=>setCopied(false),2200)}else alert('Não foi possível copiar automaticamente.')}
 async function importText(){if(!text.trim())return alert('Cole o texto gerado pela IA.');setImporting(true);try{const ids=await importLiftyText(text);setText('');alert(`${ids.length} treino(s) importado(s) com sucesso.`)}catch(err){alert(err instanceof Error?err.message:'Texto inválido ou incompatível.')}finally{setImporting(false)}}
 return <div className="page ai-import-page"><button className="secondary page-back" onClick={()=>nav('/treinos')}><ArrowLeft size={18}/>Voltar</button><PageHeader title="IA Treino Import" subtitle="Crie seu treino com IA, copie o texto e cole no LIFTY"/>
  <section className="card ai-hero"><Sparkles className="lime-icon" size={28}/><div><h2>Sem arquivos e sem integração</h2><p>Use ChatGPT, Gemini, Claude ou outra IA. O LIFTY não envia seus dados para a IA: você apenas copia o prompt, conversa com a IA e cola aqui o texto final.</p></div></section>
  <section className="card ai-step"><div className="ai-step-title"><span>1</span><div><h2>Copie o prompt</h2><p>Ele ensina à IA como montar um ou vários treinos e como gerar o texto compatível com o LIFTY.</p></div></div><button className="primary full" onClick={()=>void copyPrompt()}>{copied?<CheckCircle2 size={18}/>:<Clipboard size={18}/>} {copied?'Prompt copiado':'Copiar prompt para IA'}</button><details className="prompt-preview"><summary>Ver prompt completo</summary><pre>{AI_PROMPT}</pre></details></section>
  <section className="card ai-step"><div className="ai-step-title"><span>2</span><div><h2>Monte e aprove o treino na IA</h2><p>Converse normalmente com a IA, revise a proposta e só então peça o texto LIFTY final.</p></div></div></section>
  <section className="card ai-step"><div className="ai-step-title"><span>3</span><div><h2>Cole no LIFTY</h2><p>Cole um ou vários treinos de uma única vez. Você também pode colar treinos recebidos de outra pessoa.</p></div></div><textarea rows={14} value={text} onChange={e=>setText(e.target.value)} placeholder="=== LIFTY WORKOUT === ..."/><button className="primary full" disabled={importing} onClick={()=>void importText()}><ClipboardPaste size={18}/>{importing?'Importando...':'Importar treino(s)'}</button></section>
 </div>
}
