import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, MapPin, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'

export type AppUser={id:string;name:string;email:string;city:string;username:string;avatar:string;avatarUrl?:string;coverUrl?:string;phone?:string;address?:string;createdAt?:string}
export const initials=(name:string)=>name.split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'NV'
// Kept for compatibility with existing views. Authentication no longer uses localStorage.
export const loadUser=():AppUser|null=>null
export const saveUser=(_:AppUser)=>undefined

export default function Auth({onLogin}:{onLogin:(user:AppUser)=>void}){
 const [mode,setMode]=useState<'login'|'create'|'forgot'>('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[city,setCity]=useState('Dhaka, Bangladesh'),[show,setShow]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const submit=async(event:React.FormEvent)=>{event.preventDefault();setNotice('')
  if(!email.trim()){setNotice('Enter your email address first.');return}
  setBusy(true)
  try{
   if(mode==='forgot'){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:`${window.location.origin}/`})
    if(error) throw error
    setNotice('Password reset instructions have been sent. Please check your inbox.');return
   }
   if(mode==='create'){
    if(!name.trim()||password.length<6){setNotice('Complete all required fields. Password must have at least 6 characters.');return}
    if(password!==confirm){setNotice('Passwords do not match.');return}
    const {data,error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{data:{full_name:name.trim(),city,avatar:initials(name)}}})
    if(error) throw error
    if(data.session && data.user){
      onLogin({id:data.user.id,name:name.trim(),email:data.user.email||email,city,username:name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,''),avatar:initials(name),createdAt:data.user.created_at})
    } else setNotice('Account created. Check your email and confirm your address, then log in.')
    return
   }
   const {data,error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password})
   if(error) throw error
   if(data.user){
    const {data:profile}=await supabase.from('profiles').select('*').eq('id',data.user.id).maybeSingle()
    onLogin({id:data.user.id,name:profile?.full_name||data.user.user_metadata.full_name||'Citizen',email:data.user.email||email,city:profile?.city||data.user.user_metadata.city||'Dhaka, Bangladesh',username:profile?.username||data.user.user_metadata.username||'',avatar:profile?.avatar||data.user.user_metadata.avatar||initials(data.user.user_metadata.full_name||'Citizen'),avatarUrl:profile?.avatar_url||data.user.user_metadata.avatar_url||'',coverUrl:profile?.cover_url||data.user.user_metadata.cover_url||'',phone:profile?.phone||data.user.user_metadata.phone||'',address:profile?.address||data.user.user_metadata.address||'',createdAt:profile?.created_at||data.user.created_at})
   }
  }catch(error){setNotice(error instanceof Error?error.message:'Something went wrong. Please try again.')}
  finally{setBusy(false)}
 }
 const heading=mode==='create'?'Create your account':mode==='forgot'?'Reset your password':'Welcome to Nagorik Voice'
 return <main className="auth-page"><section className="auth-brand"><img src="/nagorik-voice-logo.png" alt="Nagorik Voice"/><div><span>CIVIC PLATFORM</span><h1>Your voice can improve your city.</h1><p>Report local problems, follow progress and help build a better Bangladesh together.</p></div><div className="auth-points"><p>✓ Share verified civic issues</p><p>✓ Follow authority updates</p><p>✓ Support your community</p></div></section><section className="auth-panel"><form className="auth-card" onSubmit={submit}>{mode!=='login'&&<button type="button" className="auth-back" onClick={()=>{setMode('login');setNotice('')}}><ArrowLeft size={17}/> Back to login</button>}<div className="auth-logo"><img src="/nagorik-voice-logo.png" alt=""/></div><h2>{heading}</h2><p>{mode==='create'?'Create a secure account with your real email address.':mode==='forgot'?'Enter your email and we’ll send a secure reset link.':'Log in to see your community feed and report local issues.'}</p>{mode==='create'&&<label><span><UserRound size={15}/> Full name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name"/></label>}<label><span><Mail size={15}/> Email address</span><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email"/></label>{mode==='create'&&<label><span><MapPin size={15}/> City</span><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Dhaka, Bangladesh"/></label>}{mode!=='forgot'&&<><label><span><KeyRound size={15}/> Password</span><div className="password-input"><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters" type={show?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'}/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{mode==='create'&&<label><span><KeyRound size={15}/> Confirm password</span><input value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" type="password" autoComplete="new-password"/></label>}</>}{notice&&<p className="auth-notice">{notice}</p>}<button className="primary auth-submit" disabled={busy}>{busy?'Please wait…':mode==='create'?'Create account':mode==='forgot'?'Send reset instructions':'Log in'}</button>{mode==='login'&&<button type="button" className="auth-link" onClick={()=>{setMode('forgot');setNotice('')}}>Forgot password?</button>}<div className="auth-switch">{mode==='login'?<>New to Nagorik Voice? <button type="button" onClick={()=>{setMode('create');setNotice('')}}>Create account</button></>:<>Already have an account? <button type="button" onClick={()=>{setMode('login');setNotice('')}}>Log in</button></>}</div></form></section></main>
}
