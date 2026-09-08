import { useState } from 'react'
import { CheckCircle2, Clock3, MessageCircle, ThumbsUp } from 'lucide-react'
import { notifications } from './data'

export default function NotificationCenter(){
 const [tab,setTab]=useState<'All'|'Mentions'|'Updates'>('All')
 const shown=notifications.filter(n=>tab==='All'||(tab==='Mentions'?n.icon==='comment'||n.icon==='support':n.icon==='status'||n.icon==='resolved'))
 return <div className="page narrow-page"><div className="page-head"><span className="eyebrow">STAY UPDATED</span><h1>Notifications</h1><p>Updates from your reports, followed issues and community.</p></div><div className="notification-tabs">{(['All','Mentions','Updates'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="notification-list">{shown.map((n,i)=><div className="notification" key={n.text}><div className={`notify-icon ${n.icon}`}>{n.icon==='support'?<ThumbsUp/>:n.icon==='comment'?<MessageCircle/>:n.icon==='resolved'?<CheckCircle2/>:<Clock3/>}</div><div><b>{n.text}</b><p>{n.detail}</p><small>{n.time} ago</small></div>{i<3&&<i/>}</div>)}{!shown.length&&<p className="profile-empty">No notifications in this category.</p>}</div></div>
}
