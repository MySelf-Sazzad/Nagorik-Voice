import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import type { Issue } from './data'
import CCExperience from './CCExperience'
import GovernmentExperience from './GovernmentExperience'
import { approveGovernmentPost, banCitizen, deleteCCPost, fetchPosts, forwardToGovernment, getOfficerRole, removeGovernmentCase, setCCStatus } from './lib/database'
import { supabase } from './lib/supabase'

type Portal='cc'|'govt'

const governmentToast=(title:string)=>{document.querySelector('.government-send-toast')?.remove();const toast=document.createElement('div');toast.className='government-send-toast';toast.innerHTML=`<span>✓</span><div><b>Sent to Government</b><small>${title}</small></div>`;document.body.appendChild(toast);setTimeout(()=>toast.remove(),3600)}

export default function AdminPortal({portal}:{portal:Portal}){
 const isCC=portal==='cc', title=isCC?'City Corporation':'Government'
 const [logged,setLogged]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[items,setItems]=useState<Issue[]>([])
 const refresh=async()=>{try{setItems(await fetchPosts())}catch(error){setError(error instanceof Error?error.message:'Unable to load portal data.')}}
 useEffect(()=>{refresh();getOfficerRole().then(role=>setLogged(role===(isCC?'cc_officer':'government_officer'))).catch(()=>setLogged(false));const channel=supabase.channel(`portal-${portal}`).on('postgres_changes',{event:'*',schema:'public',table:'posts'},refresh).subscribe();return()=>{supabase.removeChannel(channel)}},[portal])
 const login=async(event:React.FormEvent)=>{event.preventDefault();setError('');const {error:loginError}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(loginError){setError(loginError.message);return}const role=await getOfficerRole();if(role!==(isCC?'cc_officer':'government_officer')){await supabase.auth.signOut();setError('This account does not have access to this officer portal.');return}setLogged(true);await refresh()}
 const forward=async(issue:Issue)=>{try{await forwardToGovernment(issue.id);await refresh();governmentToast(issue.title)}catch(error){alert(error instanceof Error?error.message:'Could not send the case.')}}
 const remove=async(issue:Issue)=>{if(confirm(`Delete “${issue.title}”?`)){try{await deleteCCPost(issue.id);await refresh()}catch(error){alert(error instanceof Error?error.message:'Could not delete the post.')}}}
 const ban=async(issue:Issue)=>{if(confirm(`Ban ${issue.author} and remove their reports?`)){try{if(!issue.authorId)throw new Error('Citizen account was not found.');await banCitizen(issue.authorId);await refresh()}catch(error){alert(error instanceof Error?error.message:'Could not ban this user.')}}}
 const updateStatus=async(issue:Issue,status:Issue['status'])=>{try{await setCCStatus(issue.id,status);await refresh()}catch(error){alert(error instanceof Error?error.message:'Could not update status.')}}
 const approve=async(issue:Issue,description:string,startDate:string)=>{try{await approveGovernmentPost(issue.id,description,startDate);await refresh()}catch(error){alert(error instanceof Error?error.message:'Could not approve this case.')}}
 const logout=async()=>{await supabase.auth.signOut();setLogged(false)}
 if(!logged)return <Login title={title} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} login={login}/>
 if(isCC)return <CCExperience items={items} forward={forward} remove={remove} ban={ban} updateStatus={updateStatus} logout={logout}/>
 return <><button className="govt-approved-shortcut" onClick={()=>window.location.assign('/govt/approved')}>✓ Approved posts</button><button className="govt-settings-shortcut" onClick={()=>window.location.assign('/govt/settings')}>Portal settings</button><GovernmentExperience items={items.filter(i=>i.sentToGovernment)} approve={approve} remove={async issue=>{await removeGovernmentCase(issue.id);await refresh()}} logout={logout}/></>
}

function Login({title,email,setEmail,password,setPassword,error,login}:{title:string;email:string;setEmail:(value:string)=>void;password:string;setPassword:(value:string)=>void;error:string;login:(event:React.FormEvent)=>void}){
 return <main className="admin-login-page"><form className="admin-login-card" onSubmit={login}><img src="/nagorik-voice-logo.png" alt="Nagorik Voice"/><ShieldCheck/><h1>{title} Portal</h1><p>Authorised officers only.</p><label>Officer email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="officer@example.com"/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password"/></label>{error&&<p className="login-error">{error}</p>}<button className="primary">Log in</button><small>Access is granted only to Supabase officer accounts.</small></form></main>
}
