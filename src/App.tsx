import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Activity, CalendarDays, Dumbbell, LayoutDashboard, UserRound } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import TrainPage from './pages/TrainPage'
import CalendarPage from './pages/CalendarPage'
import WorkoutsPage from './pages/WorkoutsPage'
import ReadyWorkoutsPage from './pages/ReadyWorkoutsPage'
import AiWorkoutImportPage from './pages/AiWorkoutImportPage'
import WorkoutEditorPage from './pages/WorkoutEditorPage'
import ProfilePage from './pages/ProfilePage'
import logo from './assets/lifty-logo.png'
import AppTour from './components/AppTour'

function Splash({onDone}:{onDone:()=>void}){useEffect(()=>{const t=window.setTimeout(onDone,2300);return()=>clearTimeout(t)},[onDone]);return <div className="splash" onClick={onDone}><div className="splash-glow"/><img src={logo} className="splash-logo" alt="LIFTY"/><div className="splash-line"/><small>TOQUE PARA ENTRAR</small></div>}
export default function App(){const[splash,setSplash]=useState(true);if(splash)return <Splash onDone={()=>setSplash(false)}/>;return <div className="app-shell"><main className="content"><Routes><Route path="/" element={<DashboardPage/>}/><Route path="/treinar" element={<TrainPage/>}/><Route path="/calendario" element={<CalendarPage/>}/><Route path="/treinos" element={<WorkoutsPage/>}/><Route path="/treinos/novo" element={<WorkoutEditorPage/>}/><Route path="/treinos/editar/:id" element={<WorkoutEditorPage/>}/><Route path="/treinos/prontos" element={<ReadyWorkoutsPage/>}/><Route path="/treinos/ia-import" element={<AiWorkoutImportPage/>}/><Route path="/perfil" element={<ProfilePage/>}/></Routes></main><AppTour/><nav className="bottom-nav"><NavLink to="/" end><LayoutDashboard size={20}/><span>Dashboard</span></NavLink><NavLink to="/treinar"><Activity size={20}/><span>Treinar</span></NavLink><NavLink to="/calendario"><CalendarDays size={20}/><span>Frequência</span></NavLink><NavLink to="/treinos"><Dumbbell size={20}/><span>Treinos</span></NavLink><NavLink to="/perfil"><UserRound size={20}/><span>Perfil</span></NavLink></nav></div>}
