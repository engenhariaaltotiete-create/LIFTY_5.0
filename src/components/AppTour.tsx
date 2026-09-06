import { useEffect, useState } from 'react'
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Dumbbell, LayoutDashboard, RotateCcw, Sparkles, Target, UserRound, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import '../styles/tour.css'

const KEY='lifty-tour-seen-v1'
const steps=[
 {title:'Dashboard',text:'Acompanhe seus treinos, metas e evolução geral em um só lugar.',icon:LayoutDashboard},
 {title:'Treinar',text:'Inicie seus treinos e registre o que realmente foi executado durante cada sessão.',icon:Activity},
 {title:'Meus Treinos',text:'Crie treinos híbridos com blocos resistidos, cardio e intervalados, ou use Treinos Prontos.',icon:Dumbbell},
 {title:'IA e compartilhamento',text:'Crie treinos com qualquer IA ou compartilhe um treino por texto. Basta copiar, colar e importar.',icon:Sparkles},
 {title:'Frequência',text:'Veja no calendário todos os treinos concluídos e consulte os detalhes de cada sessão.',icon:CalendarDays},
 {title:'Metas e evolução',text:'Defina metas de treino, cardio e composição corporal e acompanhe seu progresso.',icon:Target},
 {title:'Perfil e dados',text:'Gerencie seu perfil, faça backup completo em JSON e restaure seus dados quando precisar.',icon:UserRound}
]

export default function AppTour(){
 const location=useLocation();const[welcome,setWelcome]=useState(false);const[active,setActive]=useState(false);const[index,setIndex]=useState(0)
 useEffect(()=>{if(!localStorage.getItem(KEY))setWelcome(true)},[])
 const close=()=>{localStorage.setItem(KEY,'1');setWelcome(false);setActive(false);setIndex(0)}
 const start=()=>{setWelcome(false);setIndex(0);setActive(true)}
 const restart=()=>{setIndex(0);setWelcome(false);setActive(true)}
 if(welcome)return <div className="tour-overlay"><div className="tour-card tour-welcome"><button className="tour-close" onClick={close}><X size={20}/></button><div className="tour-logo">LIFTY</div><h2>Quer conhecer o aplicativo?</h2><p>Faça um tour rápido pelas principais funções do LIFTY.</p><button className="primary full" onClick={start}>Iniciar tour</button><button className="secondary full" onClick={close}>Agora não</button></div></div>
 if(active){const s=steps[index],Icon=s.icon;return <div className="tour-overlay"><div className="tour-card"><button className="tour-close" onClick={close}><X size={20}/></button><div className="tour-progress">{index+1} de {steps.length}</div><div className="tour-icon"><Icon size={34}/></div><h2>{s.title}</h2><p>{s.text}</p><div className="tour-dots">{steps.map((_,i)=><span key={i} className={i===index?'active':''}/>)}</div><div className="tour-actions"><button className="secondary" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ChevronLeft size={18}/>Anterior</button>{index<steps.length-1?<button className="primary" onClick={()=>setIndex(i=>i+1)}>Próximo<ChevronRight size={18}/></button>:<button className="primary" onClick={close}>Concluir</button>}</div></div></div>}
 if(location.pathname==='/perfil')return <button className="tour-restart" onClick={restart}><RotateCcw size={16}/>Refazer tour do LIFTY</button>
 return null
}
