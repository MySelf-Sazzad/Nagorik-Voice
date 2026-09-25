import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MessageCircle, ThumbsUp } from 'lucide-react'
import { notifications } from './data'

export default function NotificationCenter({read,setRead}:{read:Set<number>;setRead:(next:Set<number>)=>void}){
 const [tab,setTab]=useState<'All'|'Mentions'|'Updates'>('All')
 const shown=useMemo(()=>notifications.map((notification,index)=>({notification,index})).filter(({notification})=>tab==='All'||(tab==='Mentions'?notification.icon==='comment'||notification.icon==='support':notification.icon==='status'||notification.icon==='resolved')),[tab])
 const unread=Math.max(0,notifications.length-read.size)
 const markAll=()=>setRead(new Set(notifications.map((_,index)=>index)))
 const markOne=(index:number)=>{if(!read.has(index))setRead(new Set([...read,index]))}
 return <div className="page narrow-page"><div className="page-head notification-heading"><div><span className="eyebrow">STAY UPDATED</span><h1>Notifications</h1><p>Updates from your reports, followed issues and community.</p></div><button className="outline mark-read" disabled={!unread} onClick={markAll}>{unread?'Mark all as read':'All caught up'}</button></div><div className="notification-tabs">{(['All','Mentions','Updates'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="notification-list">{shown.map(({notification:n,index})=><button className={`notification ${read.has(index)?'':'unread'}`} key={n.text} onClick={()=>markOne(index)}><span className={`notify-icon ${n.icon}`}>{n.icon==='support'?<ThumbsUp/>:n.icon==='comment'?<MessageCircle/>:n.icon==='resolved'?<CheckCircle2/>:<Clock3/>}</span><span className="notification-copy"><b>{n.text}</b><p>{n.detail}</p><small>{n.time} ago</small></span>{!read.has(index)&&<i aria-label="Unread"/>}</button>)}{!shown.length&&<p className="profile-empty">No notifications in this category.</p>}</div></div>
}
