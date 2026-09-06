import { useEffect, useState } from 'react'
import { db } from '../db/database'
import type { ExerciseDefinition } from '../types'

export default function ExerciseAutocomplete({onSelect}:{onSelect:(e:ExerciseDefinition)=>void}) {
  const [q,setQ]=useState('')
  const [items,setItems]=useState<ExerciseDefinition[]>([])
  useEffect(()=>{(async()=>{
    if(q.trim().length<1){setItems([]);return}
    const all=await db.exercises.filter(e=>!e.archived && e.name.toLowerCase().includes(q.toLowerCase())).limit(8).toArray()
    setItems(all)
  })()},[q])
  return <div className="autocomplete">
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar exercício..." />
    {items.length>0 && <div className="autocomplete-menu">{items.map(item=><button key={item.id} type="button" onClick={()=>{onSelect(item);setQ('');setItems([])}}><strong>{item.name}</strong><small>{item.primaryMuscle} · {item.equipment}</small></button>)}</div>}
  </div>
}
