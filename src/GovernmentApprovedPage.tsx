import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileText, MapPin, Trash2 } from 'lucide-react'
import type { Issue } from './data'
import { fetchPosts, getOfficerRole, removeApproval } from './lib/database'
import { supabase } from './lib/supabase'
import './government-approved-page.css'

export default function GovernmentApprovedPage(){
 const [all,setAll]=useState<Issue[]>([]),items=all.filter(item=>item.governmentApproval)
 const refresh=async()=>{try{setAll(await fetchPosts())}catch(error){console.error(error)}}
 useEffect(()=>{getOfficerRole().then(role=>{if(role!=='government_officer')window.location.assign('/govt');else refresh()});const channel=supabase.channel('approved-posts').on('postgres_changes',{event:'*',schema:'public',table:'posts'},refresh).subscribe();return()=>{supabase.removeChannel(channel)}},[])
 const remove=(item:Issue)=>{if(confirm(`Remove Government approval from “${item.title}”?`))removeApproval(item.id).then(refresh).catch(error=>alert(error instanceof Error?error.message:'Could not remove approval.'))}
 return <main className="govt-approved-page"><header><button onClick={()=>window.location.assign('/govt')}><ArrowLeft size={18}/> Back to Government portal</button><span>Government · Approved work</span></header><section><span className="eyebrow">GOVERNMENT WORK COMMITMENTS</span><h1>Approved posts</h1><p>All citizen cases approved by Government and scheduled for action.</p><div className="govt-approved-grid">{items.length?items.map(item=><article key={item.id}>{item.image&&<img src={item.image} alt={item.title}/>}<div><span className="approved-badge"><CheckCircle2 size={15}/> Government approved</span><h2>{item.title}</h2><p>{item.governmentApproval?.description}</p><small><MapPin size={14}/>{item.location}</small><footer><span>Work starts</span><b>{item.governmentApproval?.startDate}</b></footer><button className="remove-approved" onClick={()=>remove(item)}><Trash2 size={15}/> Remove approval</button></div></article>):<div className="empty"><FileText/><h3>No approved posts yet.</h3><p>Approved Government commitments will appear here.</p></div>}</div></section></main>
}
